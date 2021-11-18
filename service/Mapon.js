const config = require('config')
const fetch = require('node-fetch');

class MaponApi {

    #apiKey = config.get('maponKey')
    #apiUrl = 'https://mapon.com/api/v1/'
    #historyAction = 'unit_data/history_point'

//TODO возможно если убрать тут await то будет работать быстрее
    async fetch(action, params = {}) {
        try {
            params.key = this.#apiKey;
            const urlParams = Object.keys(params).map(key => {
                return key + '=' + params[key];
            }).join('&');
            const url = `${this.#apiUrl}${action}.json?${urlParams}`
            const response = await fetch(url)
                .then(res => res.json())
                .catch(e => {
                    if (['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'].includes(e.code)) {
                        return this.fetch(action, params)
                    }
                    throw {
                        code: e.code,
                        message: 'Fetch ERROR'
                    }
                })
            if (response.error) {
                if (response.error.code === 1011) return this.fetch(action, params)
                throw {
                    code: response.error.code,
                    message: response.error.msg
                }
            }
            return response
        } catch (e) {
            throw {message: `MaponApi: ${JSON.stringify(e)}`}
        }
    }//

    #dayPointsArray(date, step = 3, time_offset) {
        //TODO разобратся что за временный сдвиг и вынести его куда то
        const baseShift  = 3
        // if (!time_offset) time_offset = 0//(new Date().getTimezoneOffset() / 60) * -1
        time_offset = baseShift-time_offset
        time_offset = 0
        const startDayTime = new Date(date).setHours(time_offset, 0, 0, 0)
        const pointsArray = []
        let stepTime = startDayTime
        while (stepTime < startDayTime + (60000 * 1441)) {
            const pointTime = new Date(stepTime).toJSON().replace('.000Z', 'Z');
            // console.log('pointTime',pointTime)//
            pointsArray.push(pointTime)
            stepTime = stepTime + (60000 * step);
        }
        return pointsArray;
    }


    dayHistory(unit_id, date, step = 3, time_offset) {
        return Promise.all(
            this.#dayPointsArray(date, step, time_offset).map(point => {
                    return this.fetch(this.#historyAction, {
                        unit_id,
                        datetime: point,
                        ['include[]']: 'mileage'
                    })
                }
            )
        )
    }


}

module.exports = new MaponApi();