const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
    email: {type: String, required: true, unique: true},//
    password: {type: String, required: true},
    username: {type: String, required: true, unique: true},
    role: {type: String},
    city: []//TODO: 29:46 привятка к другой колекции?
})

module.exports = model('User', schema)