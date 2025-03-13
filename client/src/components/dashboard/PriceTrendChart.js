import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { formatCurrency } from '../../utils/formatters';
import './PriceTrendChart.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const PriceTrendChart = ({ products }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [chartData, setChartData] = useState({ datasets: [] });
  const [options, setOptions] = useState({});

  // Handle product selection (up to 5 products)
  const handleProductChange = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        if (prev.length >= 5) {
          // Remove the first item if we're at the limit
          return [...prev.slice(1), productId];
        }
        return [...prev, productId];
      }
    });
  };

  // Prepare chart data whenever selected products change
  useEffect(() => {
    const colors = [
      '#3498db', // Blue
      '#2ecc71', // Green
      '#e74c3c', // Red
      '#f39c12', // Orange
      '#9b59b6'  // Purple
    ];

    const datasets = selectedProducts.map((productId, index) => {
      const product = products.find(p => p._id === productId);
      
      if (!product || !product.priceHistory || product.priceHistory.length < 2) {
        return null;
      }
      
      // Sort by date
      const sortedHistory = [...product.priceHistory].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      return {
        label: product.name,
        data: sortedHistory.map(item => ({
          x: new Date(item.timestamp),
          y: item.price
        })),
        borderColor: colors[index % colors.length],
        backgroundColor: 'transparent',
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    }).filter(dataset => dataset !== null);

    setChartData({ datasets });

    // Set chart options
    setOptions({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM d'
            }
          },
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          title: {
            display: true,
            text: 'Price'
          },
          beginAtZero: false
        }
      }
    });
  }, [selectedProducts, products]);

  // Find products with enough price history data
  const productsWithHistory = products.filter(
    product => product.priceHistory && product.priceHistory.length >= 2
  );

  // Pre-select a few products if none selected yet
  useEffect(() => {
    if (selectedProducts.length === 0 && productsWithHistory.length > 0) {
      // Select up to 3 products with the most interesting price histories
      const interestingProducts = [...productsWithHistory]
        .sort((a, b) => {
          // Calculate price variance as a measure of interestingness
          const aHistory = a.priceHistory.map(h => h.price);
          const bHistory = b.priceHistory.map(h => h.price);
          
          const aMin = Math.min(...aHistory);
          const aMax = Math.max(...aHistory);
          const aRange = aMax - aMin;
          
          const bMin = Math.min(...bHistory);
          const bMax = Math.max(...bHistory);
          const bRange = bMax - bMin;
          
          return bRange - aRange; // Sort by largest price range first
        })
        .slice(0, 3)
        .map(product => product._id);
      
      setSelectedProducts(interestingProducts);
    }
  }, [products, selectedProducts.length, productsWithHistory]);

  return (
    <div className="price-trend-chart-container">
      {productsWithHistory.length === 0 ? (
        <div className="no-history-message">
          <p>Not enough price history data available yet.</p>
          <p>Add more products or wait for price updates.</p>
        </div>
      ) : (
        <>
          <div className="chart-wrapper">
            <Line options={options} data={chartData} />
          </div>
          
          <div className="product-selection">
            <div className="selection-header">
              <h4>Select Products to Compare (max 5)</h4>
              <span className="selected-count">
                {selectedProducts.length} / 5 selected
              </span>
            </div>
            <div className="product-selection-list">
              {productsWithHistory.map(product => (
                <label 
                  key={product._id} 
                  className={`product-selection-item ${
                    selectedProducts.includes(product._id) ? 'selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product._id)}
                    onChange={() => handleProductChange(product._id)}
                    disabled={
                      !selectedProducts.includes(product._id) && 
                      selectedProducts.length >= 5
                    }
                  />
                  <span className="product-name">{product.name}</span>
                  <span className="product-platform">{product.platform}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PriceTrendChart;