const {Router} = require('express')
const router = Router()
const auth = require('../middleware/auth.middleware')
const config = require('config')
const BigQueryRepeater = require("../service/BigQuery")
const {personalWeekSatement, ownWeekSatement, foodSatement} = require("../sql/query");
const BitrixApi = require("../service/Bitrix")
const bitrix = BitrixApi(config.get('bitrix_portal'), config.get('bitrix_key'))
const fs = require('fs');
const stringify = require('csv-stringify');


const cityCashBack = (city, tariff) => {
    const incomeRate = {
        Kyiv: 2.15,
        Lviv: 2,
        Odesa: 2,
        Kharkiv: 2
    }
    const dmitryConstant = 2;
    const rate = incomeRate[city] || 1.75
    return (tariff * (rate / 100)) / dmitryConstant
}

const saveCsv = (array, name) => {
    if (array.length === 0) {
        console.log('Wont save 0 size file')
        return;
    }
    stringify(array, {
        header: true
    }, function (err, output) {
        fs.writeFile(`./csv/${name}_${new Date().toISOString()}.csv`, output, function (err, result) {
            console.log(name, 'saveCsv is ok?')
            if (err) console.log('saveCsv error', name, err);
        });
    })
}

const batchCombiner = async (result, metod, batchParams, idKey, requestInBatch) => {
    const secDelay = 2
    const fetchPerLoop = 7

    let statementDrivers = result.length
    let allSteps = Math.ceil(statementDrivers / requestInBatch);
    let all = []
    console.log(`Running batchCombiner ...`)
    for (let i = 0; i < allSteps; i++) {
        let preBatchArray = [];

        let next = i * requestInBatch
        for (let u = next; u < next + requestInBatch; u++) {

            // creates query from batchParams
            let query = {}
            Object.keys(batchParams).forEach(key => {
                let param_name = batchParams[key];
                query[key] = result[u][param_name]
            })
            let forPush = [bitrix.metods[metod], query, result[u][idKey]]
            preBatchArray.push(forPush)
            if (u === statementDrivers - 1) break
        }
        all.push(bitrix.batch(preBatchArray))
        if (i % fetchPerLoop === 0) {
            await new Promise(resolve => setTimeout(resolve, secDelay * 1000));
        }
    }
    return Promise.all(all);
}


router.post(
    '/own',
    auth,
    async (req, res) => {
        const {year, week_number} = req.body
        console.log(`Get OWN from BQ ${year} ${week_number} ...`)
        const bitrixWeekStamp = year.toFixed(0).slice(-1) + week_number.toFixed(0)
        console.log('bitrixWeekStamp', bitrixWeekStamp)

        //забрать ответочку из квери
        const [result] = await BigQueryRepeater.runQuery(
            true,
            // foodSatement,
            ownWeekSatement,
            {
                year,
                week_number
            })

        // STEP 0
        // create resultObject from result Array
        const resultObject = {}
        result.forEach(driver => {
            resultObject[driver.id] = driver
        })

        // STEP 1
        const allContacts = await batchCombiner(result,
            'crm_duplicate_findbycomm',
            {values: 'phone'},
            'id',
            50
        );
        console.log(`allContacts ready!`)

        // STEP 2
        // missed phones list
        // CONTACT and where needed CONTACT_TO_PARSE to resultObject
        const missedPhones = [];
        for (let batch of allContacts) {
            const batchedContacts = batch.result.result;
            const batchKeys = Object.keys(batchedContacts);
            for (let key of batchKeys) {
                const driversResult = batchedContacts[key]
                if (driversResult.CONTACT && driversResult.CONTACT.length === 1) resultObject[key].CONTACT = driversResult.CONTACT[0]
                if (driversResult.CONTACT && driversResult.CONTACT.length > 1) {
                    resultObject[key].CONTACT_TO_PARSE = driversResult.CONTACT
                }
                if (!driversResult.CONTACT) missedPhones.push(resultObject[key])
            }
        }
        saveCsv(missedPhones, `${bitrixWeekStamp}_own_missedPhones`);
        console.log(`missedPhones`, missedPhones.length)

        // STEP 3
        // perform each obj for each CONTACT_TO_PARSE
        // convert obj to array in contactsToParse
        console.log(`Creating uniqContactObj where CONTACT_TO_PARSE`)
        const uniqContactObj = {}
        for (let driver of Object.values(resultObject)) {
            if (!driver.CONTACT_TO_PARSE) continue
            driver.CONTACT_TO_PARSE.forEach(contact => {
                let _driver = Object.assign({}, driver);
                _driver.TEMP_CONTACT = contact
                _driver.UNIQ_CONTACT_ID = `${_driver.id}:${_driver.TEMP_CONTACT}`
                uniqContactObj[_driver.UNIQ_CONTACT_ID] = _driver
            })
        }
        const contactsToParse = Object.values(uniqContactObj);
        console.log(`Uniq contactsToParse array ${contactsToParse.length} length`)

        // STEP 4
        // fetch every TEMP_CONTACT to find by name in step 5
        console.log(`Start finding TEMP_CONTACT names ...`)
        const checkedContacts = await batchCombiner(contactsToParse,
            'crm_contact_get',
            {id: 'TEMP_CONTACT'},
            'UNIQ_CONTACT_ID',
            50
        );
        console.log(`uniqContactObj ready!`)

        // STEP 5
        // find true CONTACT from TEMP_CONTACTs
        // save missedNames
        const missedNames = {};
        for (let batch of checkedContacts) {
            const batchedContacts = batch.result.result;
            const batchKeys = Object.keys(batchedContacts);
            for (let key of batchKeys) {
                const resultObjectKey = key.split(':')[0]
                const driversResult = batchedContacts[key]
                const driverResultFio = `${driversResult.NAME} ${driversResult.LAST_NAME}`
                if (driverResultFio === resultObject[resultObjectKey].name) {
                    resultObject[resultObjectKey].CONTACT = driversResult.ID
                } else {
                    missedNames[resultObjectKey] = resultObject[resultObjectKey]
                }
            }
        }
        const missedNamesNotFind = Object.values(missedNames).filter(driver => !driver.CONTACT)
        saveCsv(missedNamesNotFind, `${bitrixWeekStamp}_own_missedNames`);
        console.log(`missedNames`, missedNamesNotFind.length)

        // STEP 6
        // perform CONTACT to find DEALS
        // add category_id
        const uniqContactFioObj = {}
        for (let driver of Object.values(resultObject)) {
            if (!driver.CONTACT) continue
            //кц bolt food
            // driver.category_id = 29;
            //рекрутеры
            driver.category_id = 13;
            uniqContactFioObj[driver.id] = driver
        }

        const forDealFind = Object.values(uniqContactFioObj);
        console.log(`uniqContactFioObj with only true contacts`, forDealFind.length)
        console.log(`Finding deals start ...`)
        const checkedDeals = await batchCombiner(forDealFind,
            'crm_deal_list',
            {
                contact_id: 'CONTACT',
                category_id: 'category_id'
            },
            'id',
            40
        );
        console.log(`checkedDeals ready!`)

        // STEP 7
        // save missedDeals
        // deal data (OPPORTUNITY and LOADED - UF_CRM_1631448826169) to resultObject
        const missedDeals = [];
        for (let batch of checkedDeals) {
            const batchedDeals = batch.result.result;
            const batchKeys = Object.keys(batchedDeals);
            for (let key of batchKeys) {
                const driversResult = batchedDeals[key][0]
                if (!driversResult) {
                    missedDeals.push(resultObject[key])
                    continue
                }
                resultObject[key].DEAL_ID = driversResult.ID
                resultObject[key].COST = driversResult.OPPORTUNITY
                resultObject[key].LOADED = driversResult.UF_CRM_1631448826169
            }
        }
        saveCsv(missedDeals, `${bitrixWeekStamp}_own_missedDeals`);
        console.log(`missedDeals`, missedDeals.length)

        res.status(200).json({
            resultObject,
            contactsToParse,
            checkedContacts,
            checkedDeals
            // checkedDeals,
            // uniqContactFioObj,
            // uniqContactObj,
            // missedPhones,
            // missedNamesNotFind,
            // missedDeals
        })

    })

router.post(
    '/personal',
    auth,
    async (req, res) => {

        // try {
        const {year, week_number} = req.body
        console.log(`Get from BQ ${year} ${week_number} ...`)
        const bitrixWeekStamp = year.toFixed(0).slice(-1) + week_number.toFixed(0)
        console.log('bitrixWeekStamp', bitrixWeekStamp)

        //забрать ответочку из квери
        const [result] = await BigQueryRepeater.runQuery(
            true,
            personalWeekSatement,
            {
                year,
                week_number
            })
        //resultObject - создать обект из ответа
        const resultObject = {}
        result.forEach(driver => {
            resultObject[driver.id] = driver
        })
        //константы для отправки запросов, fetchPerLoop по 50 шт, потом пауза secDelay
        const secDelay = 2
        const fetchPerLoop = 7

        //добываем контакты
        let statementDrivers = result.length
        let allSteps = Math.ceil(statementDrivers / 50);
        let all = []
        console.log(`Finding contacts start ...`)
        for (let i = 0; i < allSteps; i++) {
            let preBatchArray = [];
            let next = i * 50
            for (let u = next; u < next + 50; u++) {
                let forPush = [bitrix.metods.crm_duplicate_findbycomm, {values: result[u].phone}, result[u].id]
                preBatchArray.push(forPush)
                if (u === statementDrivers - 1) break
            }
            all.push(bitrix.batch(preBatchArray))

            if (i % fetchPerLoop === 0) {
                // console.log(`${i/fetchPerLoop}/${allSteps/fetchPerLoop} step... wait ${secDelay} sec`)
                await new Promise(resolve => setTimeout(resolve, secDelay * 1000));
            }
        }
        const allContacts = await Promise.all(all);
        console.log(`allContacts ready!`)

        //на выгрузку, тех кого не нашли по номеру телефона
        //+
        //запись в resultObject результата поиска контактов
        //+
        //создание CONTACT_TO_PARSE для тех кого нужно найти повторно
        const missedPhones = [];
        for (let batch of allContacts) {
            const batchedContacts = batch.result.result;
            const batchKeys = Object.keys(batchedContacts);
            for (let key of batchKeys) {
                const driversResult = batchedContacts[key]
                if (driversResult.CONTACT && driversResult.CONTACT.length === 1) resultObject[key].CONTACT = driversResult.CONTACT[0]
                if (driversResult.CONTACT && driversResult.CONTACT.length > 1) {
                    resultObject[key].CONTACT_TO_PARSE = driversResult.CONTACT
                }
                if (!driversResult.CONTACT) missedPhones.push(resultObject[key])
            }
        }
        saveCsv(missedPhones, `${bitrixWeekStamp}_missedPhones`);
        console.log(`missedPhones`, missedPhones.length)

        console.log(`Creating object with >1 id:contacts with uniqIDcontact`)

        //подготавливаем обект оригинальных контактов, где разделено по TEMP_CONTACT
        const uniqContactObj = {}
        for (let driver of Object.values(resultObject)) {
            if (!driver.CONTACT_TO_PARSE) continue
            driver.CONTACT_TO_PARSE.forEach(contact => {
                let _driver = Object.assign({}, driver);
                _driver.TEMP_CONTACT = contact
                _driver.UNIQ_CONTACT_ID = `${_driver.id}:${_driver.TEMP_CONTACT}`
                uniqContactObj[_driver.UNIQ_CONTACT_ID] = _driver
            })
        }

        //contactsToParse - масивчик из uniqContactObj для итерицаа
        const contactsToParse = Object.values(uniqContactObj);
        console.log(`Array contactsToParse with >1 id:contacts ${contactsToParse.length} length`)

        //запрашиваем контакты что бы потом пробить их по ФИО
        console.log(`Finding uniqContactObj (second stage) start ...`)
        let ctpLength = contactsToParse.length
        let ctpSteps = Math.ceil(ctpLength / 50);
        let contactToCheck = []

        for (let i = 0; i < ctpSteps; i++) {
            let preBatchArray = [];
            let next = i * 50
            for (let u = next; u < next + 50; u++) {
                let forPush = [bitrix.metods.crm_contact_get, {id: contactsToParse[u].TEMP_CONTACT}, contactsToParse[u].UNIQ_CONTACT_ID]
                preBatchArray.push(forPush)
                if (u === ctpLength - 1) break
            }
            contactToCheck.push(bitrix.batch(preBatchArray))

            if (i % fetchPerLoop === 0) {
                // console.log(`${i/fetchPerLoop}/${ctpSteps/fetchPerLoop} step... wait ${secDelay} sec`)
                await new Promise(resolve => setTimeout(resolve, secDelay * 1000));
            }
        }
        const checkedContacts = await Promise.all(contactToCheck);
        console.log(`uniqContactObj ready!`)

        //на выгрузку, тех кого не нашли по ФИО
        //+
        //запись в resultObject результата поиска настоящих контактов

        const missedNames = {};
        for (let batch of checkedContacts) {
            const batchedContacts = batch.result.result;
            const batchKeys = Object.keys(batchedContacts);
            for (let key of batchKeys) {
                const resultObjectKey = key.split(':')[0]
                const driversResult = batchedContacts[key]
                const driverResultFio = `${driversResult.NAME} ${driversResult.LAST_NAME}`
                if (driverResultFio === resultObject[resultObjectKey].name) {
                    resultObject[resultObjectKey].CONTACT = driversResult.ID
                } else {
                    missedNames[resultObjectKey] = resultObject[resultObjectKey]
                }
            }
        }
        //поиск ненайденых по причине нет ФИО
        const missedNamesNotFind = Object.values(missedNames).filter(driver => !driver.CONTACT)
        saveCsv(missedNamesNotFind, `${bitrixWeekStamp}_missedNames`);
        console.log(`missedNames`, missedNamesNotFind.length)

        //подготавливаем обект оригинальных контактов, где разделено по TEMP_CONTACT
        const uniqContactFioObj = {}
        for (let driver of Object.values(resultObject)) {
            if (!driver.CONTACT) continue
            uniqContactFioObj[driver.id] = driver
        }

        const forDealFind = Object.values(uniqContactFioObj);
        console.log(`uniqContactFioObj with only true contacts`, forDealFind.length)

        //запрашиваем контакты что бы потом пробить их по ФИО
        console.log(`Finding deals start ...`)
        let dealFindLength = forDealFind.length
        let getInBatch = 40
        let dealFindSteps = Math.ceil(dealFindLength / getInBatch);
        let deals = []

        for (let i = 0; i < dealFindSteps; i++) {
            let preBatchArray = [];
            let next = i * getInBatch
            for (let u = next; u < next + getInBatch; u++) {
                let forPush = [bitrix.metods.crm_deal_list, {
                    contact_id: forDealFind[u].CONTACT,
                    category_id: 0
                }, forDealFind[u].id]
                preBatchArray.push(forPush)
                if (u === dealFindLength - 1) break
            }
            deals.push(bitrix.batch(preBatchArray))

            if (i % fetchPerLoop === 0) {
                // console.log(`${i/fetchPerLoop}/${dealFindSteps/fetchPerLoop} step... wait ${secDelay} sec`)
                await new Promise(resolve => setTimeout(resolve, secDelay * 1000));
            }
        }
        const checkedDeals = await Promise.all(deals);
        console.log(`checkedDeals ready!`)

        //на выгрузку, тех у кого не оказалось сделки
        //+
        //запись в resultObject результата поиска цены сделки и недель ее обновления
        const missedDeals = [];
        for (let batch of checkedDeals) {
            const batchedDeals = batch.result.result;
            const batchKeys = Object.keys(batchedDeals);
            for (let key of batchKeys) {
                const driversResult = batchedDeals[key][0]
                if (!driversResult) {
                    missedDeals.push(resultObject[key])
                    continue
                }
                resultObject[key].DEAL_ID = driversResult.ID
                resultObject[key].COST = driversResult.OPPORTUNITY
                resultObject[key].LOADED = driversResult.UF_CRM_1631448826169
            }
        }
        saveCsv(missedDeals, `${bitrixWeekStamp}_missedDeals`);

        console.log(`missedDeals`, missedDeals.length)

        //подготавливаем масив водил, у которых есть доход и сделка + нет импорта в искомой неделе что бы сделать добавку
        const integratorArray = []
        for (let driver of Object.values(resultObject)) {
            if (!driver.DEAL_ID) continue
            if (driver.LOADED?.includes(bitrixWeekStamp)) continue
            //формируем правильный лог
            if (driver.LOADED === null) {
                driver.LOADED = ''
            } else {
                driver.LOADED += ':'
                // driver.LOADED = driver.LOADED + ':'
            }
            const earnedTarif = cityCashBack(driver.City, driver.tariff);
            driver.updated_money = earnedTarif + parseFloat(driver.COST)
            // driver.updated_money = driver.tariff + parseFloat(driver.COST)
            integratorArray.push(driver)
        }

        saveCsv(integratorArray, `${bitrixWeekStamp}_import`);
        // console.log('integratorArray',integratorArray)

        let importLength = integratorArray.length
        console.log(`Starting import result for ${importLength} deals ...`)
        let importSteps = Math.ceil(importLength / getInBatch);
        let forImport = []

        for (let i = 0; i < importSteps; i++) {
            let preBatchArray = [];
            let next = i * getInBatch
            for (let u = next; u < next + getInBatch; u++) {
                // console.log('integratorArray[u]',u,integratorArray[u])
                let forPush = [
                    bitrix.metods.crm_deal_update,
                    {
                        id: integratorArray[u].DEAL_ID,
                        opportunity: integratorArray[u].updated_money,
                        log: integratorArray[u].LOADED + bitrixWeekStamp
                    },
                    integratorArray[u].id
                ]
                preBatchArray.push(forPush)
                if (u === importLength - 1) break
            }
            forImport.push(bitrix.batch(preBatchArray))
            if (i % fetchPerLoop === 0) {
                // console.log(`${i/fetchPerLoop}/${importSteps/fetchPerLoop} step... wait ${secDelay} sec`)
                await new Promise(resolve => setTimeout(resolve, secDelay * 1000));
            }
        }
        const importResult = await Promise.all(forImport);
        console.log(`checkedDeals ready!`)

        const importLog = [];
        for (let batch of importResult) {
            const batchedDeals = batch.result.result;
            const batchKeys = Object.keys(batchedDeals);
            for (let key of batchKeys) {
                importLog.push({
                    id: key,
                    status: batchedDeals[key].toString()
                })
            }
        }
        saveCsv(importLog, `${bitrixWeekStamp}_importLog`);

        res.status(200).json({
            result: `${bitrixWeekStamp} check logs in ./csv`
        })

        try {

        } catch (e) {
            res.status(500)
                .json({
                    message: 'error payback data',
                    errors: e
                })
        }
    })

module.exports = router