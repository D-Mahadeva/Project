import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLink, FaTag, FaListUl } from 'react-icons/fa';
import { addProduct } from '../../services/api';
import './AddProduct.css';

const AddProduct = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    url: '',
    name: '',
    category: 'groceries'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { url, name, category } = formData;

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateUrl = (url) => {
    // Very basic URL validation that checks if it contains any of the supported platforms
    const platformRegex = /(?:blinkit|zepto|swiggy|bigbasket|dunzo)\.com/;
    return platformRegex.test(url);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccess(null);
    
    // Validate URL
    if (!url) {
      setError('Product URL is required');
      return;
    }
    
    if (!validateUrl(url)) {
      setError('Invalid URL. Supported platforms: Blinkit, Zepto, Swiggy Instamart, BigBasket, Dunzo');
      return;
    }
    
    try {
      setLoading(true);
      const response = await addProduct({ url, name, category });
      
      setSuccess('Product added successfully! It will now be tracked for price changes.');
      setFormData({
        url: '',
        name: '',
        category: 'groceries'
      });
      
      // Redirect to the product page after 2 seconds
      setTimeout(() => {
        navigate(`/product/${response.data._id}`);
      }, 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to add product. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'groceries',
    'dairy',
    'fruits',
    'vegetables',
    'snacks',
    'beverages',
    'household',
    'personal-care',
    'baby-products',
    'others'
  ];

  return (
    <div className="add-product-page">
      <div className="card">
        <div className="card-header">
          <h1>Track New Product</h1>
        </div>
        
        <div className="card-content">
          <p className="description">
            Add a product from any supported quick commerce platform to track its price over time.
            Simply paste the product URL below.
          </p>
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <form onSubmit={onSubmit} className="add-product-form">
            <div className="form-group">
              <label htmlFor="url">
                <FaLink /> Product URL (Required)
              </label>
              <input
                type="text"
                id="url"
                name="url"
                value={url}
                onChange={onChange}
                placeholder="Paste product URL from Blinkit, Zepto, Swiggy, BigBasket or Dunzo"
                className="form-control"
                disabled={loading}
              />
              <small className="form-text">
                Example: https://blinkit.com/prn/amul-butter/prid/10573
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="name">
                <FaTag /> Product Name (Optional)
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={onChange}
                placeholder="Override product name (leave empty to use the name from website)"
                className="form-control"
                disabled={loading}
              />
              <small className="form-text">
                If left empty, we'll use the product name found on the website
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="category">
                <FaListUl /> Product Category
              </label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={onChange}
                className="form-control"
                disabled={loading}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </form>
        </div>
        
        <div className="supported-platforms">
          <h3>Supported Platforms</h3>
          <div className="platform-list">
            <div className="platform">Blinkit</div>
            <div className="platform">Zepto</div>
            <div className="platform">Swiggy Instamart</div>
            <div className="platform">BigBasket</div>
            <div className="platform">Dunzo</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;