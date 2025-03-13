import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import { searchProduct } from '../../services/api';
import ProductCard from '../products/ProductCard';
import Spinner from '../layout/Spinner';
import './Search.css';

const Search = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    blinkit: true,
    zepto: true,
    swiggy: true,
    bigbasket: true,
    dunzo: true
  });

  useEffect(() => {
    // If a query was provided in the URL, perform the search automatically
    if (initialQuery) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSearched(true);
      
      const response = await searchProduct(query);
      
      if (response && response.results) {
        setSearchResults(response.results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setError('Failed to search for products. Please try again later.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformChange = (platform) => {
    setSelectedPlatforms({
      ...selectedPlatforms,
      [platform]: !selectedPlatforms[platform]
    });
  };

  // Filter results based on selected platforms
  const filteredResults = searchResults.filter(
    product => selectedPlatforms[product.platform]
  );

  // Find the best deal (lowest price) among filtered results
  const getBestDeal = () => {
    if (filteredResults.length === 0) return null;
    
    return filteredResults.reduce((best, current) => {
      if (!best) return current;
      return current.price < best.price ? current : best;
    }, null);
  };

  const bestDeal = getBestDeal();

  return (
    <div className="search-page">
      <div className="search-header card">
        <h1>Search Products</h1>
        <p>Compare prices across quick commerce platforms</p>
        
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter product name, e.g., Amul Butter, Maggi Noodles..."
              className="form-control search-input"
            />
            <button type="submit" className="btn btn-primary search-button">
              <FaSearch /> Search
            </button>
          </div>
        </form>
      </div>

      {searched && (
        <div className="search-results-container">
          <div className="filters-container card">
            <h3>Filter Platforms</h3>
            <div className="platform-filters">
              <label className="platform-filter">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.blinkit}
                  onChange={() => handlePlatformChange('blinkit')}
                />
                <span>Blinkit</span>
              </label>
              <label className="platform-filter">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.zepto}
                  onChange={() => handlePlatformChange('zepto')}
                />
                <span>Zepto</span>
              </label>
              <label className="platform-filter">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.swiggy}
                  onChange={() => handlePlatformChange('swiggy')}
                />
                <span>Swiggy Instamart</span>
              </label>
              <label className="platform-filter">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.bigbasket}
                  onChange={() => handlePlatformChange('bigbasket')}
                />
                <span>BigBasket</span>
              </label>
              <label className="platform-filter">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.dunzo}
                  onChange={() => handlePlatformChange('dunzo')}
                />
                <span>Dunzo</span>
              </label>
            </div>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <>
              {filteredResults.length === 0 ? (
                <div className="no-results card">
                  <h3>No products found</h3>
                  <p>Try a different search term or check different platforms</p>
                </div>
              ) : (
                <>
                  {bestDeal && (
                    <div className="best-deal-container card">
                      <div className="best-deal-header">
                        <h3>Best Deal</h3>
                        <span className="best-deal-badge">Lowest Price</span>
                      </div>
                      <div className="best-deal-content">
                        <ProductCard product={bestDeal} />
                      </div>
                    </div>
                  )}

                  <div className="all-results">
                    <h3>All Results ({filteredResults.length})</h3>
                    <div className="product-grid">
                      {filteredResults.map((product) => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;