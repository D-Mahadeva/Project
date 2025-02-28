// models/productModel.js
const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
    price: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String
    },
    platform: {
        type: String,
        required: true,
        enum: ['blinkit', 'zepto', 'swiggy', 'bigbasket', 'dunzo']
    },
    category: {
        type: String
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    priceHistory: [priceHistorySchema]
});

module.exports = mongoose.model('Product', productSchema);