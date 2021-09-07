module.exports = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next()
    }
    try {
        const User = require('../models/User')
        const city = req.body.city || req.query.city
        const candidate = await User.findOne({_id: req.user.userId})
        if (!candidate.city.includes(city)) {
            throw `Нет доступа к городу ${city}`
        }
        req.city = city;
        next()
    } catch (e) {
        res.status(401).json({
            message: 'Ошибка проверки доступа',
            error: JSON.stringify(e)
        })
    }
}