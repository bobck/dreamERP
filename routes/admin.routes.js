const {Router} = require('express')
const User = require('../models/User')
const router = Router()
const auth = require('../middleware/auth.middleware')
const roles = require('../middleware/roles.middleware')


router.get(
    '/users', auth, roles,
    async (req, res) => {
        try {
            const users = await User.find()
            res.json(users)
        } catch (e) {
            res.status(500)
                .json({
                    message: 'User list',
                    errors: JSON.stringify(e)
                })
        }
    })

//TODO: high добавить проверку на добавку только реальных городов
router.post(
    '/city', auth, roles,
    async (req, res) => {
        try {
            const {newCity,userId} = req.body
            const userForChange = await User.findById(userId)
            if (!userForChange) {
                return res.status(400).json({message: 'User not found'})
            }
            User.findOneAndUpdate({_id: userId}, {$set: {city: newCity}}, {
                upsert: false,
                useFindAndModify: false
            }, function (e, doc) {
                if (e) {
                    res.status(500)
                        .json({
                            message: 'Update error',
                            errors: e
                        })
                } else {
                    res.json({
                        doc,
                        ok: true
                    })
                }
            })
        } catch (e) {
            res.status(500)
                .json({
                    message: 'City error',
                    errors: JSON.stringify(e)
                })
        }
    })

module.exports = router