const config = require("config")
const NodeCache = require("node-cache");
const myCache = new NodeCache({stdTTL: config.get('stdTTL')});


module.exports = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next()
    }
    const cacheBody = req.body
    const cacheQuery = req.query

    const zone = new Date().getTimezoneOffset()
    const today = new Date(new Date().getTime() - zone * 60000).toISOString().split('T')[0];

    //today not for cache
    if (req.body.date === today) {
        // console.log(today,zone)
        next()
        return;
    }


    const caheName = Object.values(cacheBody).join('') +Object.values(cacheQuery).join('')+ req.path

    if (myCache.has(caheName)) {
        // console.log(`From cache ${caheName}`)
        res.json(myCache.get(caheName))
    } else {
        req.myCache = myCache;
        req.caheName = caheName;
        next()
    }
}

