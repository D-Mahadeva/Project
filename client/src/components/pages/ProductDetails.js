import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { getProductById } from '../../services/api';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import Spinner from '../layout/Spinner';
import PriceHistoryChart from '../products/PriceHistoryChart';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await getProductById(id);
        setProduct(response);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch product details.');
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="product-details">
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="btn btn-primary">
          <FaArrowLeft /> Back to Home
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details">
        <div className="alert alert-danger">Product not found.</div>
        <Link to="/" className="btn btn-primary">
          <FaArrowLeft /> Back to Home
        </Link>
      </div>
    );
  }

  // Calculate price trends
  const getPriceTrend = () => {
    if (!product.priceHistory || product.priceHistory.length < 2) return 'neutral';
    
    const latestPrice = product.priceHistory[product.priceHistory.length - 1].price;
    const previousPrice = product.priceHistory[product.priceHistory.length - 2].price;
    
    if (latestPrice < previousPrice) return 'down';
    if (latestPrice > previousPrice) return 'up';
    return 'neutral';
  };

  const priceTrend = getPriceTrend();
  
  // Calculate price stats
  const getStats = () => {
    if (!product.priceHistory || product.priceHistory.length === 0) {
      return { min: product.price, max: product.price, avg: product.price };
    }
    
    const prices = product.priceHistory.map(item => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    return { min, max, avg };
  };
  
  const stats = getStats();

  return (
    <div className="product-details">
      <div className="back-button">
        <Link to="/" className="btn">
          <FaArrowLeft /> Back to Home
        </Link>
      </div>

      <div className="product-header card">
        <div className="product-header-content">
          <div className="product-image-container">
            {product.image ? (
              <img src={product.image} alt={product.name} className="product-image" />
            ) : (
              <div className="placeholder-image">No Image Available</div>
            )}
            <div className="platform-badge">{product.platform}</div>
          </div>

          <div className="product-info">
            <h1 className="product-title">{product.name}</h1>
            
            <div className="product-price-container">
              <div className="current-price">
                <span className={`price ${priceTrend}`}>{formatCurrency(product.price)}</span>
                {priceTrend === 'down' && <span className="trend-icon down">↓</span>}
                {priceTrend === 'up' && <span className="trend-icon up">↑</span>}
              </div>
              
              {!product.isAvailable && (
                <div className="stock-status out-of-stock">Out of Stock</div>
              )}
              {product.isAvailable && (
                <div className="stock-status in-stock">In Stock</div>
              )}
            </div>
            
            <div className="product-update-info">
              <div className="last-updated">
                Last updated: {formatRelativeTime(product.lastUpdated)}
              </div>
              <div className="precise-date">
                {formatDate(product.lastUpdated)}
              </div>
            </div>

            <div className="product-actions">
              <a 
                href={product.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary"
              >
                View on {product.platform}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="product-stats card">
        <h2>Price Statistics</h2>
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-label">Current</span>
            <span className="stat-value">{formatCurrency(product.price)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Lowest</span>
            <span className="stat-value">{formatCurrency(stats.min)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Highest</span>
            <span className="stat-value">{formatCurrency(stats.max)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average</span>
            <span className="stat-value">{formatCurrency(stats.avg)}</span>
          </div>
        </div>
      </div>

      <div className="price-history card">
        <h2>Price History</h2>
        {product.priceHistory && product.priceHistory.length > 1 ? (
          <PriceHistoryChart priceHistory={product.priceHistory} />
        ) : (
          <p className="no-history">Not enough data to show price history chart.</p>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;