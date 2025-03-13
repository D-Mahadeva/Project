import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSort, FaSortUp, FaSortDown, FaFilter, FaPlus } from 'react-icons/fa';
import { getProducts } from '../../services/api';
import ProductCard from '../products/ProductCard';
import Spinner from '../layout/Spinner';
import PriceTrendChart from '../dashboard/PriceTrendChart';
import PlatformDistribution from '../dashboard/PlatformDistribution';
import './Dashboard.css';

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'lastUpdated', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState({
    platform: 'all',
    category: 'all',
    availability: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts();
        setProducts(response.data || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch products.');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Extract unique platforms and categories from products
  const platforms = ['all', ...new Set(products.map(product => product.platform))];
  const categories = ['all', ...new Set(products.map(product => product.category))];

  // Handle sorting
  const requestSort = (key) => {
    let direction = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      key = 'lastUpdated';
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Get the sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    if (sortConfig.direction === 'asc') return <FaSortUp />;
    return <FaSortDown />;
  };

  // Handle filtering
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterConfig({
      ...filterConfig,
      [name]: value
    });
  };

  // Apply sorting and filtering
  const filteredAndSortedProducts = () => {
    // First, filter products
    let result = [...products];
    
    if (filterConfig.platform !== 'all') {
      result = result.filter(product => product.platform === filterConfig.platform);
    }
    
    if (filterConfig.category !== 'all') {
      result = result.filter(product => product.category === filterConfig.category);
    }
    
    if (filterConfig.availability !== 'all') {
      const isAvailable = filterConfig.availability === 'available';
      result = result.filter(product => product.isAvailable === isAvailable);
    }
    
    // Then, sort products
    return result.sort((a, b) => {
      // Handle different data types
      if (sortConfig.key === 'price') {
        return sortConfig.direction === 'asc'
          ? a.price - b.price
          : b.price - a.price;
      }
      
      if (sortConfig.key === 'lastUpdated') {
        return sortConfig.direction === 'asc'
          ? new Date(a.lastUpdated) - new Date(b.lastUpdated)
          : new Date(b.lastUpdated) - new Date(a.lastUpdated);
      }
      
      // Default string comparison
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Calculate stats for the dashboard
  const calculateStats = () => {
    if (products.length === 0) return null;
    
    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.isAvailable).length;
    const outOfStockProducts = totalProducts - availableProducts;
    
    // Calculate price drops and increases
    let priceDrops = 0;
    let priceIncreases = 0;
    
    products.forEach(product => {
      if (product.priceHistory && product.priceHistory.length > 1) {
        const latestPrice = product.priceHistory[product.priceHistory.length - 1].price;
        const previousPrice = product.priceHistory[product.priceHistory.length - 2].price;
        
        if (latestPrice < previousPrice) priceDrops++;
        if (latestPrice > previousPrice) priceIncreases++;
      }
    });
    
    return {
      totalProducts,
      availableProducts,
      outOfStockProducts,
      priceDrops,
      priceIncreases
    };
  };

  const stats = calculateStats();
  const displayedProducts = filteredAndSortedProducts();

  if (loading) return <Spinner />;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header card">
        <div className="dashboard-title">
          <h1>Product Dashboard</h1>
          <p>Track and manage all your products</p>
        </div>
        
        <div className="dashboard-actions">
          <button
            className="btn filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filters
          </button>
          
          <Link to="/add-product" className="btn btn-primary add-product-btn">
            <FaPlus /> Add Product
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {products.length === 0 ? (
        <div className="no-products card">
          <h3>No products are being tracked yet</h3>
          <p>Add your first product to start tracking prices</p>
          <Link to="/add-product" className="btn btn-primary">
            Add Your First Product
          </Link>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="stats-container">
              <div className="stat-card">
                <div className="stat-value">{stats.totalProducts}</div>
                <div className="stat-label">Total Products</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.availableProducts}</div>
                <div className="stat-label">In Stock</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.outOfStockProducts}</div>
                <div className="stat-label">Out of Stock</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.priceDrops}</div>
                <div className="stat-label">Price Drops</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.priceIncreases}</div>
                <div className="stat-label">Price Increases</div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="dashboard-charts">
            <div className="chart-container card">
              <h3>Price Trends</h3>
              <PriceTrendChart products={products} />
            </div>
            <div className="chart-container card">
              <h3>Platform Distribution</h3>
              <PlatformDistribution products={products} />
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="filters-panel card">
              <h3>Filter Products</h3>
              <div className="filters-form">
                <div className="filter-group">
                  <label htmlFor="platform">Platform</label>
                  <select
                    id="platform"
                    name="platform"
                    value={filterConfig.platform}
                    onChange={handleFilterChange}
                    className="form-control"
                  >
                    {platforms.map(platform => (
                      <option key={platform} value={platform}>
                        {platform === 'all' 
                          ? 'All Platforms' 
                          : platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={filterConfig.category}
                    onChange={handleFilterChange}
                    className="form-control"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' 
                          ? 'All Categories' 
                          : category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label htmlFor="availability">Availability</label>
                  <select
                    id="availability"
                    name="availability"
                    value={filterConfig.availability}
                    onChange={handleFilterChange}
                    className="form-control"
                  >
                    <option value="all">All Products</option>
                    <option value="available">In Stock</option>
                    <option value="unavailable">Out of Stock</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Sort Controls */}
          <div className="sort-controls card">
            <h3>Products ({displayedProducts.length})</h3>
            <div className="sort-buttons">
              <button 
                className={`sort-button ${sortConfig.key === 'name' ? 'active' : ''}`} 
                onClick={() => requestSort('name')}
              >
                Name {sortConfig.key === 'name' && getSortIcon('name')}
              </button>
              <button 
                className={`sort-button ${sortConfig.key === 'price' ? 'active' : ''}`} 
                onClick={() => requestSort('price')}
              >
                Price {sortConfig.key === 'price' && getSortIcon('price')}
              </button>
              <button 
                className={`sort-button ${sortConfig.key === 'platform' ? 'active' : ''}`} 
                onClick={() => requestSort('platform')}
              >
                Platform {sortConfig.key === 'platform' && getSortIcon('platform')}
              </button>
              <button 
                className={`sort-button ${sortConfig.key === 'lastUpdated' ? 'active' : ''}`} 
                onClick={() => requestSort('lastUpdated')}
              >
                Updated {sortConfig.key === 'lastUpdated' && getSortIcon('lastUpdated')}
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {displayedProducts.length === 0 ? (
            <div className="no-results card">
              <h3>No products match your filters</h3>
              <p>Try changing your filter criteria</p>
            </div>
          ) : (
            <div className="product-grid">
              {displayedProducts.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;