module.exports = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next()
    }
    try {
        const User = require('../models/User')

        const candidate = await User.findOne({_id: req.user.userId, role: 'Admin'})
        if (!candidate) {
           throw 'Нет доступа'
        }

        next()
    } catch (e) {
        res.status(401).json({
            message: 'Ошибка проверки доступа',
            error: JSON.stringify(e)
        })
    }
}