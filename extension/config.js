// Configuration file for Socio.io extension

// Backend API URL - update this after deploying to Render
const BACKEND_API_URL = 'https://socio-io-backend.onrender.com';

// Storage keys
const STORAGE_KEYS = {
  STATS: 'socio_io_stats',
  HISTORY: 'socio_io_history',
  SETTINGS: 'socio_io_settings'
};

// Default settings
const DEFAULT_SETTINGS = {
  enableTextFiltering: true,
  enableImageFiltering: true,
  enableStatistics: true,
  autoBlurImages: true,
  sensitivityLevel: 'medium' // 'low', 'medium', 'high'
};

// Filter categories
const FILTER_CATEGORIES = {
  TEXT: 'text',
  IMAGE: 'image'
};

// Export configuration
window.SocioConfig = {
  BACKEND_API_URL,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  FILTER_CATEGORIES
};