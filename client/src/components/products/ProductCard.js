import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatCurrency } from '../../utils/formatters';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  // Function to determine price trend
  const getPriceTrend = () => {
    if (!product.priceHistory || product.priceHistory.length < 2) return 'neutral';
    
    const latestPrice = product.priceHistory[product.priceHistory.length - 1].price;
    const previousPrice = product.priceHistory[product.priceHistory.length - 2].price;
    
    if (latestPrice < previousPrice) return 'down';
    if (latestPrice > previousPrice) return 'up';
    return 'neutral';
  };

  const priceTrend = getPriceTrend();

  return (
    <div className="product-card">
      {!product.isAvailable && <div className="out-of-stock-badge">Out of Stock</div>}
      
      <div className="platform-badge">{product.platform}</div>
      
      <Link to={`/product/${product._id}`}>
        <div className="product-image">
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <div className="placeholder-image">No Image</div>
          )}
        </div>
        
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          
          <div className="product-price">
            <span className={`price ${priceTrend}`}>
              {formatCurrency(product.price)}
            </span>
            
            {priceTrend === 'down' && <span className="trend-icon down">↓</span>}
            {priceTrend === 'up' && <span className="trend-icon up">↑</span>}
          </div>
          
          <div className="product-updated">
            Updated: {formatDate(product.lastUpdated)}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;