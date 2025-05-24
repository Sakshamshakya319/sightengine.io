// Test script to verify connection to the backend

const axios = require('axios');

const BACKEND_URL = 'https://sightengine-io.onrender.com';

async function testConnection() {
  console.log(`Testing connection to ${BACKEND_URL}...`);
  
  try {
    // Test root endpoint
    console.log('\nTesting root endpoint:');
    const rootResponse = await axios.get(BACKEND_URL);
    console.log('Status:', rootResponse.status);
    console.log('Data:', rootResponse.data);
    
    // Test health endpoint
    console.log('\nTesting health endpoint:');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('Status:', healthResponse.status);
    console.log('Data:', healthResponse.data);
    
    // Test text filtering endpoint with a simple request
    console.log('\nTesting text filtering endpoint:');
    const textResponse = await axios.post(`${BACKEND_URL}/api/filter-text`, {
      text: 'This is a test message'
    });
    console.log('Status:', textResponse.status);
    console.log('Data:', textResponse.data);
    
    console.log('\nAll tests passed successfully!');
  } catch (error) {
    console.error('\nError during connection test:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testConnection();