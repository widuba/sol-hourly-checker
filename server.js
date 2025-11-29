// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'prices.json');

// --- Helpers to load/save data ---

function loadPrices() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // If file doesn't exist yet, start with empty array
    return [];
  }
}

function savePrices(prices) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(prices, null, 2), 'utf8');
}

// --- Fetch SOL price from CoinGecko (no API key needed) ---

async function fetchSolPrice() {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'solana',
          vs_currencies: 'usd',
        },
      }
    );

    const price = response.data.solana.usd;
    const timestamp = new Date().toISOString();

    const prices = loadPrices();
    prices.push({
      timestamp,                 // When we pulled it
      priceUsd: price,           // SOL price in USD
      priceTimes4_91: price * 4.91 // SOL price * 4.91
    });

    savePrices(prices);

    console.log(`[${timestamp}] SOL price fetched: $${price}`);
  } catch (err) {
    console.error('Error fetching SOL price:', err.response?.data || err.message);
  }
}

// --- Schedule: run at the start of every hour ---

// "0 * * * *" = at minute 0 of every hour
cron.schedule('0 * * * *', () => {
  console.log('Running hourly SOL price fetch...');
  fetchSolPrice();
});

// Also fetch once when the server starts, so you see data immediately
fetchSolPrice();

// --- API endpoint to get stored prices ---

app.get('/api/prices', (req, res) => {
  const prices = loadPrices();
  res.json(prices);
});

// --- Serve static frontend files from /public ---

app.use(express.static(path.join(__dirname, 'public')));

// --- Start the server ---

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
