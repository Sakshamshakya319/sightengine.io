// Simple build script for the Socio.io backend (Sightengine version)
const fs = require('fs');
const path = require('path');

console.log('Building Socio.io backend...');

// Ensure .env file exists
const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('Creating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('Please update the .env file with your actual configuration values.');
}

// Warn if Sightengine keys are missing from .env
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('SIGHTENGINE_API_USER') || !envContent.includes('SIGHTENGINE_API_SECRET')) {
    console.log('\x1b[33m%s\x1b[0m', 'WARNING: SIGHTENGINE_API_USER or SIGHTENGINE_API_SECRET is missing in your .env file!');
    console.log('Please obtain your Sightengine credentials and add them to your .env file.');
  }
} else {
  console.log('\x1b[33m%s\x1b[0m', 'WARNING: .env file not found! Please create and configure your .env file.');
}

// Check dependencies
try {
  require('axios');
  require('express');
  require('cors');
  require('dotenv');
  console.log('\x1b[32m%s\x1b[0m', 'All dependencies are installed.');
} catch (error) {
  console.log('\x1b[31m%s\x1b[0m', 'Missing dependencies detected.');
  console.log('Please run: npm install');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', 'Build completed successfully!');
console.log('To start the server, run: npm start');