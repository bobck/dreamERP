const {Router} = require('express')
const User = require('../models/User')
const bcrypt = require('bcrypt')
const {check, validationResult} = require('express-validator')
const jwt = require('jsonwebtoken');
const config = require('config')
const router = Router()
const auth = require('../middleware/auth.middleware')
const validator = require('../middleware/validation.middleware')


const invites = ['dreamerp']

// continue for app.use('/api/auth', require('./routes/auth.routes'))
router.post(
    '/register',
    [
        check('email', 'Incorrect mail').isEmail(),
        check('password', 'Password to short, minimum 8 symbols allowed').isLength(8),
        check('username', 'Username to short').isLength(3)
    ],
    validator,
    async (req, res) => {
        try {
            const {email, password, username, invite} = req.body;
            if (!invites.includes(invite)) {
                res.status(400).json({message: 'Your invite is invalid'})
                return
            }

            //TODO: возможно ли два запроса в базу склеить в 1 ?
            const candidateMail = await User.findOne({email});
            if (candidateMail) {
                res.status(400).json({message: 'User already exist'})
                return
            }

            const candidateUsername = await User.findOne({username});
            if (candidateUsername) {
                res.status(400).json({message: 'Username taken'})
                return
            }


            const hashedPassword = await bcrypt.hash(password, 10);
            const user = User({email, password: hashedPassword, username, role: 'manager'})
            await user.save();

            res.status(201).json({message: 'User created'})
        } catch (e) {
            res.status(500)
                .json({
                    message: 'Registration error',
                    errors: JSON.stringify(e)
                })
        }
    })

router.post(
    '/login', [
        check('email', 'Incorrect mail').normalizeEmail().isEmail(),
        check('password', 'Enter the password').exists(),
        validator,
    ], async (req, res) => {
        try {
            const {email, password} = req.body
            const user = await User.findOne({email});
            //TODO: заменить подсказки, что бы не было ясно что конкретно не найдено
            if (!user) {
                return res.status(400).json({message: 'User not found'})
            }
            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch) {
                return res(400).json({message: 'Wrong password'})
            }
            const token = jwt.sign({
                    userId: user.id,
                    userName: user.username,
                    userMail: user.email,
                    userRole: user.role,
                    userCity: user.city
                },
                config.get('jwtSecret'),
                {expiresIn: config.get('JWTexpiresIn')}
            )
            res.status(200).json({
                token,
                userId: user.id,
                userName: user.username,
                userMail: user.email
            })
        } catch (e) {
            res.status(500)
                .json({
                    message: 'Login error',
                    errors: JSON.stringify(e)
                })
        }
    })

router.get('/check', auth, async (req, res) =>  {
    const user = req.user
    const userData = await User.findOne({email:user.userMail});

    const token = jwt.sign({
            userId: user.userId,
            userName: user.userName,
            userMail: user.userMail,
            userRole: user.userRole,
            userCity: userData.city
        },
        config.get('jwtSecret'),
        {expiresIn: config.get('JWTexpiresIn')}
    )

    res.status(200).json({
        token,
        id: user.userId
    })
})

module.exports = router