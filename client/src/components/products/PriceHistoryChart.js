import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatCurrency, formatDate } from '../../utils/formatters';
import './PriceHistoryChart.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PriceHistoryChart = ({ priceHistory }) => {
  // Sort price history by date (oldest first)
  const sortedHistory = [...priceHistory].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Extract the data for the chart
  const labels = sortedHistory.map(item => {
    const date = new Date(item.timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  
  const prices = sortedHistory.map(item => item.price);

  // Calculate min and max for y-axis padding
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;

  // Set up chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const price = context.dataset.data[index];
            const date = new Date(sortedHistory[index].timestamp);
            
            return [
              `Price: ${formatCurrency(price)}`,
              `Date: ${formatDate(date)}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        min: Math.max(0, minPrice - padding),
        max: maxPrice + padding,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  // Prepare the chart data
  const data = {
    labels,
    datasets: [
      {
        label: 'Price',
        data: prices,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointBackgroundColor: '#3498db',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  return (
    <div className="price-history-chart">
      <Line options={options} data={data} />
    </div>
  );
};

export default PriceHistoryChart;