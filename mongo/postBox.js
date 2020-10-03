const mongoose = require('mongoose');
const productSchema = mongoose.Schema({
    redirectURL: {type: String, required: true},
    name: {type: String, required: true},
    ownerID: {type: String, required: true},
});

module.exports = mongoose.model('postPox', productSchema);
