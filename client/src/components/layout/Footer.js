import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <p>PriceCompare &copy; {new Date().getFullYear()} - Compare prices across quick commerce platforms</p>
      </div>
    </footer>
  );
};

export default Footer;