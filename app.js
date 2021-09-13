const express = require('express')
const config = require("config")
const mongoose = require('mongoose')
const path = require('path')
const app = express()
const PORT = config.get('port') || 5000


app.use(express.urlencoded({extended:true}))
app.use(express.json({extended:true}))


app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/admin', require('./routes/admin.routes'))
app.use('/api/workflow', require('./routes/workflow.routes'))
app.use('/api/payback', require('./routes/payback.routes'))


if (process.env.NODE_ENV === 'production') {
    app.use('/', express.static(path.join(__dirname, 'client', 'build')))

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
    })
}

async function start() {
    try {
        await mongoose.connect(config.get('mongoUri'), {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        })
        app.listen(PORT, () => console.log(`Server running on port ${PORT}...`))
    } catch (e) {
        console.log(`Server error`, e.message)
        process.exit(1)
    }
}

start();