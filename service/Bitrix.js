const fetch = require('node-fetch');

const BitrixApi = function (portal, token) {
    const url = `https://${portal}.bitrix24.ua/rest/${token}/`;
    this.metods = {
        crm_duplicate_findbycomm: function ({values = '', type = 'PHONE', entity_type = 'CONTACT'}) {
            return `crm.duplicate.findbycomm?type=${type}&values[]=${values}&entity_type=${entity_type}`
        },
        crm_contact_get: function ({id = ''}) {
            return `crm.contact.get?ID=${id}`
        },
        crm_deal_list: function ({contact_id = ''}) {
            return `crm.deal.list?filter[CONTACT_ID]=${contact_id}&filter[CATEGORY_ID]=0select[]=UF_CRM_1631448826169&select[]=OPPORTUNITY&select[]=UF_CRM_1631448826169`
        },
        crm_deal_update: function ({id = '', opportunity = 0, log = ''}) {
            return `crm.deal.update?ID=${id}&fields[OPPORTUNITY]=${opportunity}&fields[UF_CRM_1631448826169]=${log}`
        }
    }

    const createBatch = function (preBatchArray, halt) {
        let link = `batch.json?halt=${halt}&`
        for (let [method, params, id] of preBatchArray) {
            const component = method(params);
            link += `cmd[${id}]=${encodeURIComponent(component)}&`
        }
        return url + link
    }

    this._batch = function (preBatchArray, halt = 0) {
        let link = `batch.json?halt=${halt}&`
        for (let [method, params, id] of preBatchArray) {
            const component = method(params);
            link += `cmd[${id}]=${encodeURIComponent(component)}&`
        }
        return url + link
    }

    const randomInteger = function (min, max) {
        let rand = min + Math.random() * (max + 1 - min);
        return Math.floor(rand);
    }

    this.batch = async function (preBatchArray, halt = 0) {
        const batchUrl = createBatch(preBatchArray, halt)
        const response = await fetch(batchUrl)
            .then(res => {
                // console.log(preBatchArray[0][2], `ready`)
                return res.json()
            })
            .catch(e =>  {
                if (['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'INTERNAL_SERVER_ERROR'].includes(e.code)) {
                    return this.batch(preBatchArray, halt)
                }
                throw {
                    code: e.code,
                    message: 'Fetch ERROR'
                }
            })

        if (response.error) {
            if (response.error === 'QUERY_LIMIT_EXCEEDED' || response.error === 'INTERNAL_SERVER_ERROR') {
                let seconds = randomInteger(2, 25)
                // console.log(preBatchArray[0][2], `wait ${seconds} sec`, response.error)
                await new Promise(resolve => setTimeout(resolve, seconds * 1000));
                return this.batch(preBatchArray, halt)
            }
            console.log(preBatchArray[0][2], response.error)
            throw {
                code: response.error,
                message: response.error
            }
        }

        return response
    }


    return this
}


module.exports = BitrixApi;