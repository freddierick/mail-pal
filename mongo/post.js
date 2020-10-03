const mongoose = require('mongoose');
const productSchema = mongoose.Schema({
    postBoxID: {type: String, required: true},
    data: {type: Object, required: true},
    time: {type: Number, required: true},
});

module.exports = mongoose.model('post', productSchema);
