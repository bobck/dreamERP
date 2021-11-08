const {Router} = require('express')
const router = Router()
const auth = require('../middleware/auth.middleware')
const config = require('config')
const BigQueryRepeater = require("../service/BigQuery")
const {boltBrandBonus} = require("../sql/query");
const stringify = require('csv-stringify/lib/sync');
const {sendMail} = require("../service/Gmail")

const BitrixApi = require("../service/Bitrix")
const bitrix = BitrixApi(config.get('bitrix_portal'), config.get('bitrix_key'))


router.post(
    '/send',
    auth,
    async (req, res) => {
        const {year, week_number} = req.body
        console.log(`Get BrandBonus ${year} ${week_number} ...`)
        const [result] = await BigQueryRepeater.runQuery(
            true,
            boltBrandBonus,
            {
                year,
                week_number
            })

        // STEP 1
        //create parkListForBatch, companysObject
        const parkList = Array.from(new Set(result.map(row => row.park)))
        const parkListForBatch = parkList.map((park, id) => {
            return {
                title: park,
                id: id + 1
            }
        })
        const companysObject = {}
        for (let company of parkListForBatch) {
            companysObject[company.id] = company
        }
        const missedCompanys = [];

        // STEP 2
        // get compaany mails from list
        const companys = await bitrix.batchCombiner(parkListForBatch,
            'crm_company_list',
            {title: 'title'},
            'id',
            50
        );

        // STEP 3
        // create missedCompanys
        // add COMPANY_ID, EMAIL to companysObject
        for (let batch of companys) {
            const batchedCompanys = batch.result.result;
            const batchKeys = Object.keys(batchedCompanys);
            for (let key of batchKeys) {
                const companyResult = batchedCompanys[key]
                if (companyResult.length > 0) {
                    companysObject[key].COMPANY_ID = companyResult[0].ID
                    if (companyResult[0]?.EMAIL?.length > 0) {
                        companysObject[key].EMAIL = companyResult[0].EMAIL[0].VALUE
                        const [parkCars] = result.filter(row => row.park === companysObject[key].title)
                        companysObject[key].COMMENT = `Bonus W${week_number} ${parkCars.total_park_bonus} UAH to ${companyResult[0].EMAIL[0].VALUE}.`
                    } else {
                        missedCompanys.push(companysObject[key])
                    }
                } else {
                    missedCompanys.push(companysObject[key])
                }
            }
        }

        // STEP 4
        // send missedCsv to author
        const missedArray = missedCompanys.map(company => {
            return [company.id, company.title, company?.COMPANY_ID]
        })
        const missedHeader = ['POSITION', 'TITLE', 'COMPANY_ID']
        missedArray.unshift(missedHeader)

        const missedCsv = stringify(missedArray, {
            header: false,
            delimiter: ','
        })

        const mail = {
            subject: `Missed company in Bitrix24 [${week_number} week]`,
            from: `Bolt Account Manager <${config.get('brand_bonus_sender')}>`,
            to: `Bolt Account Manager <${config.get('brand_bonus_sender')}>`,
            body: ``,
            csvName: `Missed_company_${week_number}_week_${new Date().toISOString()}`,
            csv: missedCsv
        }
        const mailIdMissed = await sendMail(mail);
        console.log(`Missed_company send mail info: ${JSON.stringify(mailIdMissed)}`)

        // STEP 5
        // put available company with mail to company'sMail
        // sent all of them csv
        const companysMail = Object.values(companysObject).filter(company => company.EMAIL)
        for (let company of companysMail) {
            const parkCars = result.filter(row => row.park === company.title)
            const parkArray = parkCars.map(row => [row.park, row.model, row.car, row.id, row.all_trips, row.ok_trips, row.fraud_trips, row.bonus])
            const oneCar = parkCars[0];
            // const hearer = ['Park_name', 'Car_model', 'Car_plate_number', 'Id', 'Counted_trips', 'Fraud_trips', 'Bonus']
            const header = ['Park_name', 'Car_model', 'Car_plate_number', 'Id', 'All_trips', 'Counted_trips', 'Fraud_trips', 'Bonus']

            const lastRow = [oneCar.park, 'Total', '', '', oneCar.total_park_ok_trips, oneCar.total_park_fraud_trips, oneCar.total_park_bonus]
            parkArray.push(lastRow)
            parkArray.unshift(header)

            const parkCsv = stringify(parkArray, {//
                header: false,
                delimiter: ','
            })

            const body = `Добрый день уважаемый партнер! 👋🏻<br>Отправляем вам отчет бонуса за брендирование за W${week_number} <br><br>Если вы не нашли автомобиль пожалуйста сообщите нам , что бы мы проверили и начислили компенсацию.`
            const mail = {
                subject: `Brand bonus report ${company.title} week ${week_number}`,
                from: `Bolt Account Manager <${config.get('brand_bonus_sender')}>`,
                // to: `${company.title} <bob-ck@ukr.net>`,
                to: `${company.title} <${company.EMAIL}>`,
                body,
                csvName: `Brand bonus week ${week_number} ${oneCar.park}`,
                csv: parkCsv
            }
            //TODO раскоментить const что бы начали отправлятяся письма
            const mailId = await sendMail(mail);
            console.log(company.title, mailId)
            // break
        }

        // STEP 6
        // put comment to bitrix
        const comments = Object.values(companysObject).filter(c => c.COMMENT)
        const commentsResult = await bitrix.batchCombiner(comments,
            'crm_timeline_comment_add',
            {
                id: 'COMPANY_ID',
                comment: 'COMMENT'
            },
            'COMPANY_ID',
            25
        );
        console.log('Send done.')


        res.status(200).json({
            companys,
            companysObject,
            companysMail,
            missedCompanys,
            commentsResult
        })
    })

module.exports = router
