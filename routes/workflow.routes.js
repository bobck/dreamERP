const {Router} = require('express')
const router = Router()
const auth = require('../middleware/auth.middleware')
const cityAccess = require('../middleware/cityAccess.middleware')


const {check} = require('express-validator')
const cache = require('../middleware/cache.middleware')
const validator = require('../middleware/validation.middleware')

const BigQueryRepeater = require("../service/BigQuery")
const {boltOnlineFlow, boltRides, uklonRides, driversList, scheduleToday} = require("../sql/query");
const {dispatcherLog, boltRidesLog, uklonRidesLog, parseDriversList, parseSchedule} = require("../parser/bq.parser")

const Mapon = require("../service/Mapon");
const {dayPoints} = require("../parser/mapon.parser");
//TODO валидация даты не больше сегодня
//TODO валидация города
router.get(
    '/cars', auth, cache,
    async (req, res) => {
        try {
            const response = await Mapon.fetch('unit/list')
            const cars = response.data.units.map(unit => {
                return {unit_id: unit.unit_id, number: unit.number}
            })
            req.myCache.set(req.caheName, {type: req.type, result: cars})
            res.json({
                type: req.type,
                result: cars
            })
        } catch (e) {
            res.status(500)
                .json({
                    message: 'error cars data',
                    errors: e
                })
        }
    })

router.post(
    '/mileage',
    auth,
    check('unit_id', 'Incorrect unit_id').isLength({max: 6, min: 4}).isNumeric(),
    check('step', 'Step could be 1-9').isLength({max: 1, min: 1}).isNumeric(),
    check('date', 'Incorrect data').isDate(),
    validator,
    cache,
    async (req, res) => {
        // try {
        const {unit_id, date, step} = req.body
        const dayHistory = await Mapon.dayHistory(unit_id, date, step)
        const points = dayPoints(dayHistory)

        if (req.myCache) {
            req.myCache.set(
                req.caheName,
                {
                    unit_id,
                    type: req.type,
                    result: points
                })
        }

        res.json({
            unit_id,
            type: req.type,
            result: points
        })
        try {
        } catch (e) {
            res.status(500)
                .json({
                    message: 'error mileage data',
                    errors: e
                })
        }
    })

router.post(
    ['/boltrides', '/boltonlineflow', '/uklonrides'],
    auth,
    check('city', 'Incorrect city').isAlpha(),
    check('driver', 'Incorrect driver').contains(' '),
    check('date', 'Incorrect data').isDate(),
    validator,
    cityAccess,
    cache,
    async (req, res) => {
        try {
            if (req.path === '/boltonlineflow') req.customquery = boltOnlineFlow;
            if (req.path === '/boltrides') req.customquery = boltRides;
            if (req.path === '/uklonrides') req.customquery = uklonRides;

            const {city, driver, date} = req.body
            const [result] = await BigQueryRepeater.runQuery(
                city,
                req.customquery,
                {
                    driver: `%${driver}%`,
                    date
                })
            let bolt;
            if (req.path === '/boltonlineflow') bolt = dispatcherLog(result, driver)
            if (req.path === '/boltrides') bolt = boltRidesLog(result);
            if (req.path === '/uklonrides') bolt = uklonRidesLog(result);

            if (req.myCache) {
                req.myCache.set(
                    req.caheName,
                    {
                        driver,
                        type: req.type,
                        result: bolt
                    })
            }

            res.json({
                driver,
                type: req.type,
                result: bolt
            })
        } catch (e) {
            res.status(e.code || 500)
                .json({
                    message: 'error workflow data',
                    errors: e
                })
        }
    })

router.get(
    ['/drivers', '/schedule'],
    auth,
    check('city', 'Incorrect city').isAlpha(),
    validator,
    cityAccess,
    // cache,
    async (req, res) => {
        try {
            const city = req.city
            if (req.path === '/drivers') req.customquery = driversList;
            if (req.path === '/schedule') req.customquery = scheduleToday;

            const [result] = await BigQueryRepeater.runQuery(
                city,
                req.customquery,
                {
                    city
                })
            let bolt
            if (req.path === '/drivers') bolt = parseDriversList(result)
            if (req.path === '/schedule') bolt = parseSchedule(result)


            // req.myCache.set(req.caheName, {type: req.type, result: bolt})
            res.json({
                type: req.type,
                result: bolt
            })
        } catch (e) {
            res.status(500)
                .json({
                    message: 'error drivers data',
                    errors: e
                })
        }
    })

module.exports = router
