// Popup script for Socio.io extension

// DOM elements
const connectionStatus = document.getElementById('connection-status');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const totalFiltered = document.getElementById('total-filtered');
const textFiltered = document.getElementById('text-filtered');
const imagesFiltered = document.getElementById('images-filtered');
const lastUpdated = document.getElementById('last-updated');
const domainDropdown = document.getElementById('domain-dropdown');
const historyList = document.getElementById('history-list');
const recoverContentBtn = document.getElementById('recover-content-btn');
const saveSettingsBtn = document.getElementById('save-settings');

// Settings form elements
const enableTextFiltering = document.getElementById('enable-text-filtering');
const enableImageFiltering = document.getElementById('enable-image-filtering');
const enableStatistics = document.getElementById('enable-statistics');
const autoBlurImages = document.getElementById('auto-blur-images');
const sensitivityLevel = document.getElementById('sensitivity-level');

// Check connection to backend
function checkConnection() {
  connectionStatus.textContent = 'Checking connection...';
  connectionStatus.className = 'socio-status connecting';
  
  chrome.runtime.sendMessage({
    action: 'checkConnection',
    apiUrl: window.SocioConfig.BACKEND_API_URL
  }, (response) => {
    if (response && response.success) {
      connectionStatus.textContent = 'Connected';
      connectionStatus.className = 'socio-status connected';
    } else {
      connectionStatus.textContent = 'Disconnected';
      connectionStatus.className = 'socio-status disconnected';
    }
  });
}

// Load statistics
function loadStatistics() {
  chrome.storage.local.get([window.SocioConfig.STORAGE_KEYS.STATS], (result) => {
    const stats = result[window.SocioConfig.STORAGE_KEYS.STATS] || {
      totalFiltered: 0,
      textFiltered: 0,
      imagesFiltered: 0,
      lastUpdated: null
    };
    
    // Update UI
    totalFiltered.textContent = stats.totalFiltered;
    textFiltered.textContent = stats.textFiltered;
    imagesFiltered.textContent = stats.imagesFiltered;
    
    // Update last updated timestamp
    if (stats.lastUpdated) {
      const date = new Date(stats.lastUpdated);
      lastUpdated.textContent = `Last updated: ${date.toLocaleString()}`;
    } else {
      lastUpdated.textContent = 'Last updated: Never';
    }
    
    // Add animation effect
    totalFiltered.classList.add('stat-updated');
    textFiltered.classList.add('stat-updated');
    imagesFiltered.classList.add('stat-updated');
    
    // Remove animation class after animation completes
    setTimeout(() => {
      totalFiltered.classList.remove('stat-updated');
      textFiltered.classList.remove('stat-updated');
      imagesFiltered.classList.remove('stat-updated');
    }, 1000);
  });
}

// Load history domains
function loadHistoryDomains() {
  chrome.storage.local.get([window.SocioConfig.STORAGE_KEYS.HISTORY], (result) => {
    const history = result[window.SocioConfig.STORAGE_KEYS.HISTORY] || {};
    
    // Clear existing options except the first one
    while (domainDropdown.options.length > 1) {
      domainDropdown.remove(1);
    }
    
    // Add domains to dropdown
    Object.keys(history).forEach((domain) => {
      const option = document.createElement('option');
      option.value = domain;
      option.textContent = domain;
      domainDropdown.appendChild(option);
    });
  });
}

// Load domain history
function loadDomainHistory(domain) {
  chrome.storage.local.get([window.SocioConfig.STORAGE_KEYS.HISTORY], (result) => {
    const history = result[window.SocioConfig.STORAGE_KEYS.HISTORY] || {};
    const domainHistory = history[domain] || [];
    
    // Clear history list
    historyList.innerHTML = '';
    
    if (domainHistory.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No history for this domain';
      historyList.appendChild(emptyMessage);
      return;
    }
    
    // Add history items
    domainHistory.forEach((item) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const itemType = document.createElement('span');
      itemType.className = `item-type ${item.type}`;
      itemType.textContent = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      
      const itemContent = document.createElement('div');
      itemContent.className = 'item-content';
      
      if (item.type === window.SocioConfig.FILTER_CATEGORIES.TEXT) {
        // For text items, show truncated content
        const truncatedText = item.originalContent.length > 50 
          ? item.originalContent.substring(0, 50) + '...' 
          : item.originalContent;
        
        itemContent.textContent = truncatedText;
      } else {
        // For image items, show a placeholder
        itemContent.textContent = '[Image content]';
      }
      
      const itemTimestamp = document.createElement('span');
      itemTimestamp.className = 'item-timestamp';
      
      const date = new Date(item.timestamp);
      itemTimestamp.textContent = date.toLocaleString();
      
      historyItem.appendChild(itemType);
      historyItem.appendChild(itemContent);
      historyItem.appendChild(itemTimestamp);
      
      historyList.appendChild(historyItem);
    });
  });
}

// Load settings
function loadSettings() {
  chrome.storage.local.get([window.SocioConfig.STORAGE_KEYS.SETTINGS], (result) => {
    const settings = result[window.SocioConfig.STORAGE_KEYS.SETTINGS] || window.SocioConfig.DEFAULT_SETTINGS;
    
    // Update UI
    enableTextFiltering.checked = settings.enableTextFiltering;
    enableImageFiltering.checked = settings.enableImageFiltering;
    enableStatistics.checked = settings.enableStatistics;
    autoBlurImages.checked = settings.autoBlurImages;
    
    // Set sensitivity level
    if (settings.sensitivityLevel === 'low') {
      sensitivityLevel.value = 1;
    } else if (settings.sensitivityLevel === 'medium') {
      sensitivityLevel.value = 2;
    } else if (settings.sensitivityLevel === 'high') {
      sensitivityLevel.value = 3;
    }
  });
}

// Save settings
function saveSettings() {
  // Get sensitivity level string
  let sensitivityLevelString = 'medium';
  if (sensitivityLevel.value === '1') {
    sensitivityLevelString = 'low';
  } else if (sensitivityLevel.value === '3') {
    sensitivityLevelString = 'high';
  }
  
  // Create settings object
  const settings = {
    enableTextFiltering: enableTextFiltering.checked,
    enableImageFiltering: enableImageFiltering.checked,
    enableStatistics: enableStatistics.checked,
    autoBlurImages: autoBlurImages.checked,
    sensitivityLevel: sensitivityLevelString
  };
  
  // Save to storage
  chrome.storage.local.set({ [window.SocioConfig.STORAGE_KEYS.SETTINGS]: settings }, () => {
    // Show success message
    saveSettingsBtn.textContent = 'Saved!';
    saveSettingsBtn.classList.add('saved');
    
    setTimeout(() => {
      saveSettingsBtn.textContent = 'Save Settings';
      saveSettingsBtn.classList.remove('saved');
    }, 2000);
  });
}

// Recover content on the active tab
function recoverContent() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'recoverContent' });
      
      // Show feedback
      recoverContentBtn.textContent = 'Content Recovered!';
      setTimeout(() => {
        recoverContentBtn.textContent = 'Recover Content';
      }, 2000);
    }
  });
}

// Tab switching
tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons and content
    tabButtons.forEach((btn) => btn.classList.remove('active'));
    tabContents.forEach((content) => content.classList.remove('active'));
    
    // Add active class to clicked button and corresponding content
    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    // Load tab specific data
    if (tabId === 'stats') {
      loadStatistics();
    } else if (tabId === 'history') {
      loadHistoryDomains();
    } else if (tabId === 'settings') {
      loadSettings();
    }
  });
});

// Domain dropdown change
domainDropdown.addEventListener('change', () => {
  const selectedDomain = domainDropdown.value;
  if (selectedDomain) {
    loadDomainHistory(selectedDomain);
  } else {
    historyList.innerHTML = '<p class="empty-message">Select a domain to view history</p>';
  }
});

// Save settings button
saveSettingsBtn.addEventListener('click', saveSettings);

// Recover content button
recoverContentBtn.addEventListener('click', recoverContent);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'statsUpdated') {
    loadStatistics();
  }
});

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Check connection
  checkConnection();
  
  // Load initial data
  loadStatistics();
  loadHistoryDomains();
  loadSettings();
  
  // Listen for content script connection
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'socio-content') {
      connectionStatus.textContent = 'Connected to page';
      connectionStatus.className = 'socio-status connected';
    }
  });
});