// utils/ProductScraper.js
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const UserAgent = require('user-agents');

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
          price: '.css-1qg7wnk', // Price selector for Zepto
          name: '.css-6xix1i', // Product name selector
          image: '.css-0', // Product image selector
          outOfStock: '.css-1tnchd6' // Out of stock indicator
        },
        baseUrl: 'https://www.zeptonow.com'
      },
      swiggy: {
        selectors: {
          price: '.styles_itemPrice__2oGMj', // Swiggy instamart price
          name: '.styles_itemName__hLfgz', // Product name
          image: '.styles_itemImage__3CsDL', // Product image
          outOfStock: '.styles_outOfStock__1fQdo' // Out of stock indicator
        },
        baseUrl: 'https://instamart.swiggy.com'
      },
      bigbasket: {
        selectors: {
          price: '.IyLvo', // BigBasket price
          name: '._2J99l', // Product name
          image: '._396cs', // Product image
          outOfStock: '.NzJpw' // Out of stock indicator
        },
        baseUrl: 'https://www.bigbasket.com'
      },
      dunzo: {
        selectors: {
          price: '.sc-iBkjds', // Dunzo price
          name: '.sc-hBxehG', // Product name
          image: '.sc-fHuLdG', // Product image
          outOfStock: '.sc-avest' // Out of stock indicator
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
          '--disable-gpu',
          '--window-size=1280,800'
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

      // Generate a random user agent
      const userAgent = new UserAgent();

      // Try HTTP request approach first (faster)
      try {
        const result = await this.scrapeWithAxios(url, platform, userAgent.toString());
        if (result && result.price) {
          return result;
        }
      } catch (error) {
        console.log(`Axios scraping failed for ${platform}, falling back to Puppeteer: ${error.message}`);
      }

      // Fall back to Puppeteer if HTTP request fails
      const page = await this.browser.newPage();
      
      // Configure the page
      await page.setUserAgent(userAgent.toString());
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive'
      });

      // Configure request interception to block non-essential resources
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (
          resourceType === 'image' || 
          resourceType === 'stylesheet' || 
          resourceType === 'font' ||
          resourceType === 'media' ||
          resourceType === 'ping' ||
          resourceType === 'beacon' ||
          resourceType === 'csp_report'
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to the page with timeout and retry mechanism
      let content = null;
      let retries = 3;
      
      while (retries > 0 && !content) {
        try {
          await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 25000 
          });
          
          // Wait for some key elements to be available
          const config = this.scrapingConfig[platform];
          await Promise.race([
            page.waitForSelector(config.selectors.price, { timeout: 5000 }).catch(() => null),
            page.waitForSelector(config.selectors.name, { timeout: 5000 }).catch(() => null),
            page.waitForTimeout(5000)
          ]);
          
          content = await page.content();
        } catch (error) {
          console.log(`Navigation attempt ${4-retries} failed: ${error.message}`);
          retries--;
          
          if (retries === 0) {
            await page.close();
            return null;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // If we have content, parse it
      if (content) {
        const $ = cheerio.load(content);
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
        
        await page.close();

        // Additional validation to ensure we got meaningful data
        if (!cleanPrice || (!name.trim() && nameElement.length === 0)) {
          console.log(`Failed to extract essential data for ${url}`);
          return null;
        }

        return {
          platform,
          price: cleanPrice,
          name: name.trim() || 'Unknown Product',
          image: image || '',
          url,
          isAvailable: !isOutOfStock,
          lastUpdated: new Date()
        };
      }
      
      await page.close();
      return null;
    } catch (error) {
      console.error(`Error scraping ${platform}: ${error.message}`);
      return null;
    }
  }

  async scrapeWithAxios(url, platform, userAgent) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Cache-Control': 'max-age=0',
          'Connection': 'keep-alive'
        },
        timeout: 15000
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

      // Validate that we got meaningful data
      if (!cleanPrice || (!name.trim() && nameElement.length === 0)) {
        throw new Error('Failed to extract essential data');
      }

      return {
        platform,
        price: cleanPrice,
        name: name.trim() || 'Unknown Product',
        image: image || '',
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
    // Handle different price formats
    const matches = priceString.match(/(?:₹|Rs\.?|INR)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
    
    if (matches && matches[1]) {
      // Remove commas and convert to float
      return parseFloat(matches[1].replace(/,/g, ''));
    }
    
    return null;
  }

  async scrapeMultiplePlatforms(productName) {
    try {
      const results = [];
      
      if (!this.browser) {
        await this.initialize();
      }
      
      // Create promises for all platform searches
      const searchPromises = Object.keys(this.scrapingConfig).map(async platform => {
        try {
          const searchUrl = this.constructSearchUrl(platform, productName);
          
          if (searchUrl) {
            const productsFromPlatform = await this.scrapeSearchResults(searchUrl, platform, productName);
            
            if (productsFromPlatform && productsFromPlatform.length > 0) {
              // Get first (most relevant) result
              return productsFromPlatform[0];
            }
          }
        } catch (error) {
          console.error(`Error searching ${platform}: ${error.message}`);
        }
        
        return null;
      });
      
      // Execute all searches in parallel
      const platformResults = await Promise.all(searchPromises);
      
      // Filter out null results
      return platformResults.filter(result => result !== null);
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
      
      // Configure the page
      const userAgent = new UserAgent();
      await page.setUserAgent(userAgent.toString());
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });
      
      // Configure request interception
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (
          resourceType === 'image' || 
          resourceType === 'stylesheet' || 
          resourceType === 'font' ||
          resourceType === 'media'
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to search page with retry mechanism
      let content = null;
      let retries = 2;
      
      while (retries > 0 && !content) {
        try {
          await page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 20000 
          });
          
          // Wait for results to load or timeout
          await page.waitForTimeout(3000);
          content = await page.content();
        } catch (error) {
          console.log(`Search navigation attempt ${3-retries} failed for ${platform}: ${error.message}`);
          retries--;
          
          if (retries === 0) {
            await page.close();
            return [];
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Adjust selectors based on platform
      const selectors = {
        blinkit: {
          products: '.product-item',
          title: '.product-name',
          price: '.product-price',
          link: 'a',
          image: '.product-image img',
          outOfStock: '.out-of-stock'
        },
        zepto: {
          products: '.css-1udgqq8', // Product card
          title: '.css-6xix1i', // Product title
          price: '.css-1qg7wnk', // Product price
          link: 'a',
          image: 'img',
          outOfStock: '.css-1tnchd6' // Out of stock indicator
        },
        swiggy: {
          products: '.styles_container__z4U4z', // Product container
          title: '.styles_itemName__hLfgz', // Product name
          price: '.styles_itemPrice__2oGMj', // Product price
          link: 'a',
          image: 'img',
          outOfStock: '.styles_outOfStock__1fQdo' // Out of stock indicator
        },
        bigbasket: {
          products: '.IyLvo', // Product card
          title: '._2J99l', // Product name
          price: '.IyLvo', // Product price
          link: 'a',
          image: 'img',
          outOfStock: '.NzJpw' // Out of stock indicator
        },
        dunzo: {
          products: '.sc-gsnTZi', // Product card
          title: '.sc-hBxehG', // Product name
          price: '.sc-iBkjds', // Product price
          link: 'a',
          image: 'img',
          outOfStock: '.sc-avest' // Out of stock indicator
        }
      };

      // Extract search results using Cheerio
      const $ = cheerio.load(content);
      const results = [];
      
      const platformSelectors = selectors[platform];
      const productElements = $(platformSelectors.products);
      
      // Process up to 5 products
      productElements.slice(0, 5).each((index, element) => {
        try {
          const titleElement = $(element).find(platformSelectors.title);
          const priceElement = $(element).find(platformSelectors.price);
          const linkElement = $(element).find(platformSelectors.link);
          const imageElement = $(element).find(platformSelectors.image);
          const isOutOfStock = $(element).find(platformSelectors.outOfStock).length > 0;
          
          const title = titleElement.text().trim();
          const priceText = priceElement.text().trim();
          
          // Get link with appropriate base URL if needed
          let link = linkElement.attr('href');
          if (link && !link.startsWith('http')) {
            link = this.scrapingConfig[platform].baseUrl + link;
          }
          
          const image = imageElement.attr('src') || '';
          
          // Extract price
          const price = this.extractPrice(priceText);
          
          // Only add products with valid data and that seem relevant to the query
          if (price && title && link && this.isRelevantProduct(title, query)) {
            const relevanceScore = this.calculateRelevanceScore(title, query);
            
            results.push({
              name: title,
              price,
              url: link,
              image,
              platform,
              isAvailable: !isOutOfStock,
              relevanceScore
            });
          }
        } catch (err) {
          console.log(`Error extracting product ${index} from ${platform}: ${err.message}`);
        }
      });
      
      await page.close();
      
      // Sort by relevance and return results
      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error(`Error scraping search results from ${platform}: ${error.message}`);
      return [];
    }
  }

  isRelevantProduct(productName, query) {
    if (!productName || !query) return false;
    
    const productNameLower = productName.toLowerCase();
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    // Require at least 50% of query terms to be present in product name
    const matchedTerms = queryTerms.filter(term => 
      productNameLower.includes(term) && term.length > 2
    );
    
    return matchedTerms.length >= Math.max(1, Math.floor(queryTerms.length * 0.5));
  }

  calculateRelevanceScore(productName, query) {
    if (!productName || !query) return 0;
    
    const productNameLower = productName.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);
    
    let score = 0;
    
    // Exact match gets highest score
    if (productNameLower === queryLower) {
      score += 10;
    }
    
    // Starts with query
    if (productNameLower.startsWith(queryLower)) {
      score += 5;
    }
    
    // Contains exact query as substring
    if (productNameLower.includes(queryLower)) {
      score += 3;
    }
    
    // Count matching terms
    const matchedTerms = queryTerms.filter(term => 
      productNameLower.includes(term) && term.length > 2
    );
    
    score += matchedTerms.length;
    
    // Percentage of terms that match
    const matchPercentage = matchedTerms.length / queryTerms.length;
    score += matchPercentage * 2;
    
    // Shorter names that contain the query are likely more relevant
    if (productNameLower.includes(queryLower) && productNameLower.length < queryLower.length + 15) {
      score += 2;
    }
    
    return score;
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