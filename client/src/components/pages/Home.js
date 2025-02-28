import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../../services/api';
import ProductCard from '../products/ProductCard';
import Spinner from '../layout/Spinner';
import './Home.css';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <Spinner />;

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Compare Prices Across Quick Commerce Platforms</h1>
          <p>Track prices from Blinkit, Zepto, Swiggy Instamart, BigBasket, and Dunzo</p>
          <div className="hero-buttons">
            <Link to="/search" className="btn btn-primary">
              Search Products
            </Link>
            <Link to="/add-product" className="btn btn-secondary">
              Track New Product
            </Link>
          </div>
        </div>
      </section>

      <section className="tracked-products">
        <div className="section-header">
          <h2>Currently Tracked Products</h2>
          {products.length > 0 && (
            <Link to="/dashboard" className="view-all">
              View All
            </Link>
          )}
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {products.length === 0 ? (
          <div className="no-products">
            <p>No products are being tracked yet.</p>
            <Link to="/add-product" className="btn btn-primary">
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="product-grid">
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="features">
        <h2>Our Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Real-time Price Comparison</h3>
            <p>Compare prices across multiple quick commerce platforms instantly</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Price History Tracking</h3>
            <p>Track price changes over time with detailed historical data</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔔</div>
            <h3>Price Drop Alerts</h3>
            <p>Get notified when prices drop for your tracked products</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;