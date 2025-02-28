const mongoose = require('mongoose');

   const ProductSchema = new mongoose.Schema({
     name: { type: String, required: true },
     price: { type: Number, required: true },
     store: { type: String, required: true },
     url: { type: String, required: true },
     lastUpdated: { type: Date, default: Date.now }
   });

   module.exports = mongoose.model('Product', ProductSchema);