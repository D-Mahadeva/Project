// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get all products
router.get('/', productController.getAllProducts);

// Add new product
router.post('/', productController.addProduct);

// Search for products
router.get('/search', productController.searchProduct);

// Compare prices for specific product
router.get('/compare', productController.compareProduct);

// Get price history for a product
router.get('/:id/history', productController.getPriceHistory);

// Delete a product
router.delete('/:id', productController.deleteProduct);

module.exports = router;