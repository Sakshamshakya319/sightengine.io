require('dotenv').config();
const express = require('express');
const cors = require('cors');
const textFilter = require('./text_content_filteration');
const imageFilter = require('./image_filteration');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Socio.io backend is running' });
});

// Text content filtering endpoint
app.post('/api/filter-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    
    const result = await textFilter.analyzeText(text);
    res.json(result);
  } catch (error) {
    console.error('Error in text filtering:', error);
    res.status(500).json({ error: 'Failed to analyze text content', details: error.message });
  }
});

// Image content filtering endpoint
app.post('/api/filter-image', async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;
    
    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ error: 'Image URL or base64 data is required' });
    }
    
    const result = await imageFilter.analyzeImage(imageUrl || imageBase64);
    res.json(result);
  } catch (error) {
    console.error('Error in image filtering:', error);
    res.status(500).json({ error: 'Failed to analyze image content', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Socio.io backend server running on port ${PORT}`);
});

module.exports = app;