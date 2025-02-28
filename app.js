// app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');
const productRoutes = require('./routes/productRoutes');
const { updatePrices } = require('./controllers/productController');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error: ', err));

// API Routes
app.use('/api/products', productRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Schedule cron job to update prices every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running automated price update...');
  try {
    const result = await updatePrices();
    console.log(`Price update completed: ${result.updatedCount} products updated`);
  } catch (error) {
    console.error('Scheduled price update failed:', error);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;