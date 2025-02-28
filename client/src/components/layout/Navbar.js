import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaSearch, FaPlus, FaChartLine } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <h1>PriceCompare</h1>
        </Link>
        <ul className="nav-links">
          <li>
            <Link to="/">
              <FaHome /> Home
            </Link>
          </li>
          <li>
            <Link to="/search">
              <FaSearch /> Search
            </Link>
          </li>
          <li>
            <Link to="/add-product">
              <FaPlus /> Add Product
            </Link>
          </li>
          <li>
            <Link to="/dashboard">
              <FaChartLine /> Dashboard
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;