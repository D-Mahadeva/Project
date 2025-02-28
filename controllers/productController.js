// controllers/productController.js
const ProductScraper = require('../utils/ProductScraper');
const Product = require('../models/productModel');

// Initialize the scraper
const scraper = new ProductScraper();

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const { platform, category } = req.query;
        
        let query = {};
        if (platform) query.platform = platform;
        if (category) query.category = category;
        
        const products = await Product.find(query)
            .sort({ lastUpdated: -1 });
        
        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        console.error('Error in getAllProducts:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Add a new product to track
exports.addProduct = async (req, res) => {
    try {
        const { url, name, category } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({ url });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                error: 'Product already exists'
            });
        }

        // Extract platform from URL
        const platformRegex = /(?:blinkit|zepto|swiggy|bigbasket|dunzo)\.com/;
        const match = url.match(platformRegex);
        
        if (!match) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported platform'
            });
        }

        const platform = match[0].split('.')[0];
        
        // Scrape initial product data
        const scrapedData = await scraper.scrapeProduct(url, platform);
        if (!scrapedData) {
            return res.status(400).json({
                success: false,
                error: 'Failed to scrape product data'
            });
        }

        // Create new product
        const product = new Product({
            name: name || scrapedData.name,
            url,
            price: scrapedData.price,
            image: scrapedData.image,
            platform,
            category: category || 'general',
            isAvailable: scrapedData.isAvailable,
            lastUpdated: new Date(),
            priceHistory: [{
                price: scrapedData.price,
                timestamp: new Date()
            }]
        });

        await product.save();

        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Error in addProduct:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Search products across platforms
exports.searchProduct = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        // First check if we have products in our DB with similar names
        const dbProducts = await Product.find({
            name: { $regex: query, $options: 'i' }
        });

        // Then scrape new results from platforms
        await scraper.initialize();
        const scrapedResults = await scraper.scrapeMultiplePlatforms(query);
        await scraper.close();
        
        // Combine results
        const combinedResults = [...dbProducts];
        
        // Add new scraped products that aren't in DB
        for (const result of scrapedResults) {
            if (result && !dbProducts.some(p => p.url === result.url)) {
                combinedResults.push(result);
                
                // Optionally save new scraped products to DB
                const product = new Product({
                    name: result.name,
                    url: result.url,
                    price: result.price,
                    image: result.image,
                    platform: result.platform,
                    category: 'search_result',
                    isAvailable: result.isAvailable,
                    lastUpdated: new Date(),
                    priceHistory: [{
                        price: result.price,
                        timestamp: new Date()
                    }]
                });
                
                await product.save().catch(err => console.error('Error saving scraped product:', err));
            }
        }
        
        res.json({
            success: true,
            count: combinedResults.length,
            results: combinedResults
        });
    } catch (error) {
        console.error('Error in searchProduct:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }
        
        await product.deleteOne();
        
        res.json({
            success: true,
            message: 'Product removed'
        });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Get price history for a product
exports.getPriceHistory = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                name: product.name,
                platform: product.platform,
                currentPrice: product.price,
                history: product.priceHistory
            }
        });
    } catch (error) {
        console.error('Error in getPriceHistory:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Update product price (used by cron job)
exports.scrapeProduct = async (url) => {
    try {
        const platformRegex = /(?:blinkit|zepto|swiggy|bigbasket|dunzo)\.com/;
        const match = url.match(platformRegex);
        
        if (!match) {
            throw new Error('Unsupported platform');
        }

        const platform = match[0].split('.')[0];
        
        await scraper.initialize();
        const result = await scraper.scrapeProduct(url, platform);
        await scraper.close();
        
        return result;
    } catch (error) {
        console.error('Scraping error:', error);
        return null;
    }
};

// Update all product prices
exports.updatePrices = async () => {
    try {
        const products = await Product.find();
        const updates = [];
        
        await scraper.initialize();

        for (const product of products) {
            const scrapedData = await scraper.scrapeProduct(product.url, product.platform);
            
            if (scrapedData && scrapedData.price) {
                // Only add to price history if price changed
                const priceUpdate = scrapedData.price !== product.price 
                    ? { $push: { priceHistory: { price: scrapedData.price, timestamp: new Date() } } }
                    : {};
                    
                updates.push({
                    updateOne: {
                        filter: { _id: product._id },
                        update: {
                            $set: {
                                price: scrapedData.price,
                                isAvailable: scrapedData.isAvailable,
                                lastUpdated: new Date()
                            },
                            ...priceUpdate
                        }
                    }
                });
            }
        }

        await scraper.close();

        if (updates.length > 0) {
            await Product.bulkWrite(updates);
        }

        return { success: true, updatedCount: updates.length };
    } catch (error) {
        console.error('Price update error:', error);
        await scraper.close();
        return { success: false, error: error.message };
    }
};

// Compare prices for a specific product across platforms
exports.compareProduct = async (req, res) => {
    try {
        const { productName } = req.query;
        
        if (!productName) {
            return res.status(400).json({
                success: false,
                error: 'Product name is required'
            });
        }
        
        // Get prices from database first
        const dbProducts = await Product.find({
            name: { $regex: productName, $options: 'i' }
        });
        
        // Then scrape fresh results
        await scraper.initialize();
        const scrapedResults = await scraper.scrapeMultiplePlatforms(productName);
        await scraper.close();
        
        // Combine and format results
        const results = {};
        
        // Add DB products
        dbProducts.forEach(product => {
            if (!results[product.platform] || results[product.platform].price > product.price) {
                results[product.platform] = {
                    name: product.name,
                    price: product.price,
                    url: product.url,
                    image: product.image,
                    isAvailable: product.isAvailable,
                    lastUpdated: product.lastUpdated
                };
            }
        });
        
        // Add scraped products
        scrapedResults.forEach(product => {
            if (product && (!results[product.platform] || results[product.platform].price > product.price)) {
                results[product.platform] = {
                    name: product.name,
                    price: product.price,
                    url: product.url,
                    image: product.image,
                    isAvailable: product.isAvailable,
                    lastUpdated: new Date()
                };
            }
        });
        
        // Find the best deal
        let bestDeal = null;
        let lowestPrice = Infinity;
        
        Object.entries(results).forEach(([platform, product]) => {
            if (product.price < lowestPrice && product.isAvailable) {
                bestDeal = platform;
                lowestPrice = product.price;
            }
        });
        
        res.json({
            success: true,
            bestDeal: bestDeal ? {
                platform: bestDeal,
                ...results[bestDeal]
            } : null,
            comparisons: results
        });
    } catch (error) {
        console.error('Error in compareProduct:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};