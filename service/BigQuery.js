const config = require('config')
const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery(config.get('bqKey'));

class BigQueryRepeater {

    #options = {
        location: 'US'
    }


    async runQuery(city, sql, params = {}) {
        if (!city || !sql) throw {message: 'missing query params'};
        this.#options.query = sql.replace(/CITY_NAME/g, city);
        this.#options.params = params;
        return bigquery.createQueryJob(this.#options).then(job => {
            return job[0].getQueryResults()
        }).catch(e => {
            const errorObj = {message: `runQuery: ${e.errors[0].reason}`}
            if (e.errors[0].reason === 'rateLimitExceeded') return this.runQuery(city, sql, params)
            if (e.errors[0].reason === 'notFound') errorObj.code = 404;
            throw errorObj
        })
    }
}

module.exports = new BigQueryRepeater();