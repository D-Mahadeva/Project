// utils/ProductScraper.js
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

class ProductScraper {
  constructor() {
    this.browser = null;
    this.scrapingConfig = {
      blinkit: {
        selectors: {
          price: '.product-price',
          name: '.product-title',
          image: '.product-image img',
          outOfStock: '.out-of-stock'
        },
        baseUrl: 'https://blinkit.com'
      },
      zepto: {
        selectors: {
          price: '.css-1qw5nie', // Example selector, adjust based on actual site
          name: '.product-name',
          image: '.product-image',
          outOfStock: '.unavailable'
        },
        baseUrl: 'https://www.zeptonow.com'
      },
      swiggy: {
        selectors: {
          price: '.price-tag',
          name: '.item-name',
          image: '.item-image',
          outOfStock: '.not-available'
        },
        baseUrl: 'https://instamart.swiggy.com'
      },
      bigbasket: {
        selectors: {
          price: '.discnt-price',
          name: '.prod-name',
          image: '.product-img',
          outOfStock: '.sold-out'
        },
        baseUrl: 'https://www.bigbasket.com'
      },
      dunzo: {
        selectors: {
          price: '.price-value',
          name: '.product-name',
          image: '.product-image',
          outOfStock: '.out-of-stock'
        },
        baseUrl: 'https://www.dunzo.com'
      }
    };
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeProduct(url, platform) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      // Fall back to HTTP request first for speed
      try {
        const result = await this.scrapeWithAxios(url, platform);
        if (result && result.price) {
          return result;
        }
      } catch (error) {
        console.log(`Axios scraping failed for ${platform}, falling back to Puppeteer: ${error.message}`);
      }

      // Fall back to Puppeteer if HTTP request fails
      const page = await this.browser.newPage();
      
      // Set user agent and other headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      // Enable request interception
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Add error handling for navigation
      try {
        await Promise.race([
          page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
        ]);
      } catch (error) {
        console.error(`Navigation error for ${url}: ${error.message}`);
        await page.close();
        return null;
      }

      // Wait for price element to be present
      const config = this.scrapingConfig[platform];
      await page.waitForSelector(config.selectors.price, { timeout: 5000 }).catch(() => null);

      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract product details
      const priceElement = $(config.selectors.price);
      const nameElement = $(config.selectors.name);
      const imageElement = $(config.selectors.image);
      const isOutOfStock = $(config.selectors.outOfStock).length > 0;

      const price = priceElement.text();
      const name = nameElement.text();
      const image = imageElement.attr('src');

      // Clean price data
      const cleanPrice = this.extractPrice(price);

      await page.close();

      return {
        platform,
        price: cleanPrice,
        name: name.trim(),
        image,
        url,
        isAvailable: !isOutOfStock,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error scraping ${platform}: ${error.message}`);
      return null;
    }
  }

  async scrapeWithAxios(url, platform) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const config = this.scrapingConfig[platform];

      // Extract product details
      const priceElement = $(config.selectors.price);
      const nameElement = $(config.selectors.name);
      const imageElement = $(config.selectors.image);
      const isOutOfStock = $(config.selectors.outOfStock).length > 0;

      const price = priceElement.text();
      const name = nameElement.text();
      const image = imageElement.attr('src');

      // Clean price data
      const cleanPrice = this.extractPrice(price);

      if (!cleanPrice || !name.trim()) {
        throw new Error('Failed to extract essential data');
      }

      return {
        platform,
        price: cleanPrice,
        name: name.trim(),
        image,
        url,
        isAvailable: !isOutOfStock,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  extractPrice(priceString) {
    if (!priceString) return null;
    
    // Extract numerical price from string (e.g., "₹123.45" -> 123.45)
    const matches = priceString.match(/(?:₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    return matches ? parseFloat(matches[1].replace(',', '')) : null;
  }

  async scrapeMultiplePlatforms(productName) {
    try {
      const results = [];
      
      for (const platform of Object.keys(this.scrapingConfig)) {
        const searchUrl = this.constructSearchUrl(platform, productName);
        
        if (searchUrl) {
          const productsFromPlatform = await this.scrapeSearchResults(searchUrl, platform, productName);
          
          if (productsFromPlatform && productsFromPlatform.length > 0) {
            // Get first (most relevant) result
            results.push(productsFromPlatform[0]);
          } else {
            results.push(null);
          }
        }
      }
      
      return results.filter(result => result !== null);
    } catch (error) {
      console.error('Error in scrapeMultiplePlatforms:', error);
      return [];
    }
  }

  async scrapeSearchResults(searchUrl, platform, query) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser.newPage();
      
      // Set user agent and other headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36');
      
      // Enable request interception
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to search page
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 20000 });
      } catch (error) {
        console.error(`Navigation error for ${searchUrl}: ${error.message}`);
        await page.close();
        return null;
      }

      // Adjust selectors based on platform
      const selectors = {
        blinkit: {
          products: '.product-item',
          title: '.product-name',
          price: '.product-price',
          link: '.product-item a',
          image: '.product-image img'
        },
        zepto: {
          products: '.product-card',
          title: '.product-title',
          price: '.product-price',
          link: '.product-card a',
          image: '.product-image img'
        },
        swiggy: {
          products: '.product-item',
          title: '.item-name',
          price: '.price-tag',
          link: '.product-item a',
          image: '.item-image img'
        },
        bigbasket: {
          products: '.product-item',
          title: '.prod-name',
          price: '.discnt-price',
          link: '.product-item a',
          image: '.product-img img'
        },
        dunzo: {
          products: '.product-card',
          title: '.product-name',
          price: '.price-value',
          link: '.product-card a',
          image: '.product-image img'
        }
      };

      // Wait for product elements to load
      try {
        await page.waitForSelector(selectors[platform].products, { timeout: 5000 });
      } catch (error) {
        console.log(`No products found for ${query} on ${platform}`);
        await page.close();
        return [];
      }

      // Extract search results
      const results = await page.evaluate((selectors, platform, query) => {
        const items = Array.from(document.querySelectorAll(selectors[platform].products));
        return items.slice(0, 3).map(item => {
          const titleEl = item.querySelector(selectors[platform].title);
          const priceEl = item.querySelector(selectors[platform].price);
          const linkEl = item.querySelector(selectors[platform].link);
          const imageEl = item.querySelector(selectors[platform].image);
          
          const title = titleEl ? titleEl.textContent.trim() : '';
          const priceText = priceEl ? priceEl.textContent.trim() : '';
          const link = linkEl ? linkEl.href : '';
          const image = imageEl ? imageEl.src : '';
          
          // Extract price number from text
          const priceMatch = priceText.match(/(?:₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)/i);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;
          
          return {
            name: title,
            price,
            url: link,
            image,
            platform,
            relevanceScore: title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
          };
        }).filter(item => item.name && item.price && item.url);
      }, selectors, platform, query);

      await page.close();
      
      // Sort by relevance
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error(`Error scraping search results from ${platform}: ${error.message}`);
      return [];
    }
  }

  constructSearchUrl(platform, productName) {
    const encodedName = encodeURIComponent(productName);
    const config = this.scrapingConfig[platform];
    
    switch (platform) {
      case 'blinkit':
        return `${config.baseUrl}/search?q=${encodedName}`;
      case 'zepto':
        return `${config.baseUrl}/p/search?q=${encodedName}`;
      case 'swiggy':
        return `${config.baseUrl}/search?query=${encodedName}`;
      case 'bigbasket':
        return `${config.baseUrl}/ps/?q=${encodedName}`;
      case 'dunzo':
        return `${config.baseUrl}/search/${encodedName}`;
      default:
        return null;
    }
  }
}

module.exports = ProductScraper;