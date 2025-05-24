// Background script for Socio.io extension

// Initialize statistics on installation
chrome.runtime.onInstalled.addListener(() => {
  const defaultStats = {
    totalFiltered: 0,
    textFiltered: 0,
    imagesFiltered: 0,
    lastUpdated: new Date().toISOString()
  };

  const defaultHistory = {};
  const defaultSettings = window.SocioConfig?.DEFAULT_SETTINGS || {
    enableTextFiltering: true,
    enableImageFiltering: true,
    enableStatistics: true,
    autoBlurImages: true,
    sensitivityLevel: 'medium'
  };

  // Initialize storage with default values
  chrome.storage.local.set({
    'socio_io_stats': defaultStats,
    'socio_io_history': defaultHistory,
    'socio_io_settings': defaultSettings
  });
});

// Connection check functionality
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle connection check message
  if (message.action === 'checkConnection') {
    const apiUrl = message.apiUrl || 'https://socio-io-backend.onrender.com';
    
    fetch(`${apiUrl}/health`)
      .then(response => {
        if (response.ok) return response.json();
        throw new Error('Connection failed');
      })
      .then(data => {
        if (data.status === 'ok') {
          sendResponse({ success: true, message: 'Connected to Socio.io backend' });
        } else {
          sendResponse({ success: false, message: 'Invalid response from server' });
        }
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          message: `Failed to connect to backend: ${error.message}` 
        });
      });
    
    return true; // Indicates async response
  }
  
  // Handle statistics update message
  if (message.action === 'updateStats') {
    chrome.storage.local.get(['socio_io_stats'], function(result) {
      let stats = result.socio_io_stats || {
        totalFiltered: 0,
        textFiltered: 0,
        imagesFiltered: 0,
        lastUpdated: new Date().toISOString()
      };
      
      // Update stats based on filter type
      stats.totalFiltered += message.count || 1;
      
      if (message.type === 'text') {
        stats.textFiltered += message.count || 1;
      } else if (message.type === 'image') {
        stats.imagesFiltered += message.count || 1;
      }
      
      stats.lastUpdated = new Date().toISOString();
      
      // Save updated stats
      chrome.storage.local.set({ 'socio_io_stats': stats });
      
      // Respond with updated stats
      sendResponse({ success: true, stats });
    });
    
    return true; // Indicates async response
  }
  
  // Handle history update message
  if (message.action === 'updateHistory') {
    const { domain, item } = message;
    
    if (!domain || !item) {
      sendResponse({ success: false, message: 'Missing domain or item' });
      return true;
    }
    
    chrome.storage.local.get(['socio_io_history'], function(result) {
      let history = result.socio_io_history || {};
      
      // Initialize domain history if it doesn't exist
      if (!history[domain]) {
        history[domain] = [];
      }
      
      // Add item to domain history
      item.timestamp = new Date().toISOString();
      history[domain].unshift(item); // Add to the beginning of the array
      
      // Limit history items per domain to 100
      if (history[domain].length > 100) {
        history[domain] = history[domain].slice(0, 100);
      }
      
      // Save updated history
      chrome.storage.local.set({ 'socio_io_history': history });
      
      // Respond with updated history for the domain
      sendResponse({ success: true, history: history[domain] });
    });
    
    return true; // Indicates async response
  }
});