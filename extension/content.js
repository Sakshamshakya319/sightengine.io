// Content script for Socio.io extension

// Wait for config to be available
if (!window.SocioConfig) {
  console.error('Socio.io: Configuration not loaded');
}

// Initialize variables
let settings = window.SocioConfig?.DEFAULT_SETTINGS || {
  enableTextFiltering: true,
  enableImageFiltering: true,
  enableStatistics: true,
  autoBlurImages: true,
  sensitivityLevel: 'medium'
};

// Statistics tracking
let sessionStats = {
  textFiltered: 0,
  imagesFiltered: 0
};

// Track filtered elements for recovery
let filteredElements = {
  text: new Map(),
  images: new Map()
};

// Load settings
function loadSettings() {
  chrome.storage.local.get([window.SocioConfig.STORAGE_KEYS.SETTINGS], (result) => {
    if (result[window.SocioConfig.STORAGE_KEYS.SETTINGS]) {
      settings = result[window.SocioConfig.STORAGE_KEYS.SETTINGS];
    }
  });
}

// Update statistics
function updateStats(type, count = 1) {
  // Update session stats
  if (type === window.SocioConfig.FILTER_CATEGORIES.TEXT) {
    sessionStats.textFiltered += count;
  } else if (type === window.SocioConfig.FILTER_CATEGORIES.IMAGE) {
    sessionStats.imagesFiltered += count;
  }
  
  // Send message to background script to update global stats
  chrome.runtime.sendMessage({
    action: 'updateStats',
    type: type,
    count: count
  });
}

// Update history
function updateHistory(type, content, filteredContent) {
  const domain = window.location.hostname;
  
  // Create history item
  const historyItem = {
    type: type,
    originalContent: type === window.SocioConfig.FILTER_CATEGORIES.TEXT ? content : 'image', // Don't store full image data
    filteredContent: type === window.SocioConfig.FILTER_CATEGORIES.TEXT ? filteredContent : 'blurred-image',
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  // Send message to background script to update history
  chrome.runtime.sendMessage({
    action: 'updateHistory',
    domain: domain,
    item: historyItem
  });
}

// Filter text content
async function filterTextContent(element) {
  if (!settings.enableTextFiltering || !element || !element.textContent) {
    return;
  }
  
  const originalText = element.textContent.trim();
  if (originalText.length < 3) {
    return; // Skip very short text
  }
  
  try {
    // Call backend API to filter text
    const response = await fetch(`${window.SocioConfig.BACKEND_API_URL}/api/filter-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: originalText })
    });
    
    if (!response.ok) {
      throw new Error('Text filtering request failed');
    }
    
    const result = await response.json();
    
    // If explicit content found, replace it
    if (result.containsExplicitContent) {
      // Save original text for recovery
      const elementId = 'socio-' + Math.random().toString(36).substr(2, 9);
      element.setAttribute('data-socio-id', elementId);
      filteredElements.text.set(elementId, {
        element: element,
        originalText: originalText
      });
      
      // Replace the text
      element.textContent = result.filteredText;
      
      // Add filtered class for styling
      element.classList.add('socio-filtered-text');
      
      // Update statistics
      updateStats(window.SocioConfig.FILTER_CATEGORIES.TEXT);
      
      // Update history
      updateHistory(
        window.SocioConfig.FILTER_CATEGORIES.TEXT,
        originalText,
        result.filteredText
      );
      
      return true;
    }
  } catch (error) {
    console.error('Socio.io text filtering error:', error);
  }
  
  return false;
}

// Filter image content
async function filterImageContent(imgElement) {
  if (!settings.enableImageFiltering || !imgElement || !imgElement.src) {
    return;
  }
  
  // Skip images that are too small or already processed
  if (imgElement.width < 50 || imgElement.height < 50 || 
      imgElement.classList.contains('socio-filtered-image') ||
      imgElement.classList.contains('socio-safe-image')) {
    return;
  }
  
  try {
    // Call backend API to filter image
    const response = await fetch(`${window.SocioConfig.BACKEND_API_URL}/api/filter-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl: imgElement.src })
    });
    
    if (!response.ok) {
      throw new Error('Image filtering request failed');
    }
    
    const result = await response.json();
    
    // If inappropriate content found, blur the image
    if (result.isInappropriate) {
      // Save original image for recovery
      const elementId = 'socio-' + Math.random().toString(36).substr(2, 9);
      imgElement.setAttribute('data-socio-id', elementId);
      filteredElements.images.set(elementId, {
        element: imgElement,
        originalSrc: imgElement.src
      });
      
      // Create parent wrapper if it doesn't exist
      let wrapper = imgElement.parentElement;
      if (!wrapper.classList.contains('socio-image-wrapper')) {
        wrapper = document.createElement('div');
        wrapper.className = 'socio-image-wrapper';
        imgElement.parentNode.insertBefore(wrapper, imgElement);
        wrapper.appendChild(imgElement);
      }
      
      // Create overlay if it doesn't exist
      let overlay = wrapper.querySelector('.socio-image-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'socio-image-overlay';
        wrapper.appendChild(overlay);
        
        // Add message and button to the overlay
        const message = document.createElement('div');
        message.className = 'socio-overlay-message';
        message.textContent = 'This image is blurred by Socio.io extension';
        
        const button = document.createElement('button');
        button.className = 'socio-view-image-btn';
        button.textContent = 'View Image';
        button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          imgElement.classList.toggle('socio-temp-unblur');
          overlay.classList.toggle('socio-overlay-hidden');
        });
        
        overlay.appendChild(message);
        overlay.appendChild(button);
      }
      
      // Add filtered class for styling
      imgElement.classList.add('socio-filtered-image');
      
      // Update statistics
      updateStats(window.SocioConfig.FILTER_CATEGORIES.IMAGE);
      
      // Update history
      updateHistory(
        window.SocioConfig.FILTER_CATEGORIES.IMAGE,
        imgElement.src,
        'blurred-image'
      );
      
      return true;
    } else {
      // Mark as safe to avoid reprocessing
      imgElement.classList.add('socio-safe-image');
    }
  } catch (error) {
    console.error('Socio.io image filtering error:', error);
  }
  
  return false;
}

// Recover filtered content
function recoverContent() {
  // Recover text content
  filteredElements.text.forEach((item) => {
    if (item.element && item.originalText) {
      item.element.textContent = item.originalText;
      item.element.classList.remove('socio-filtered-text');
    }
  });
  
  // Recover images
  filteredElements.images.forEach((item) => {
    if (item.element) {
      item.element.classList.remove('socio-filtered-image');
      
      // Remove the overlay
      const wrapper = item.element.closest('.socio-image-wrapper');
      if (wrapper) {
        const overlay = wrapper.querySelector('.socio-image-overlay');
        if (overlay) {
          wrapper.removeChild(overlay);
        }
        
        // Unwrap the image if possible
        if (wrapper.parentNode) {
          wrapper.parentNode.insertBefore(item.element, wrapper);
          wrapper.parentNode.removeChild(wrapper);
        }
      }
    }
  });
  
  // Clear filtered elements maps
  filteredElements.text.clear();
  filteredElements.images.clear();
  
  // Add recovery button to the page
  const recoveryButton = document.createElement('button');
  recoveryButton.id = 'socio-recovery-notification';
  recoveryButton.textContent = 'Content recovered';
  document.body.appendChild(recoveryButton);
  
  // Remove the notification after 3 seconds
  setTimeout(() => {
    if (recoveryButton.parentNode) {
      recoveryButton.parentNode.removeChild(recoveryButton);
    }
  }, 3000);
}

// Process text nodes
function processTextNodes() {
  if (!settings.enableTextFiltering) return;
  
  // Get all text-containing elements (paragraphs, headings, divs, spans)
  const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, a, li');
  
  textElements.forEach(async (element) => {
    // Skip elements with no text or that have already been processed
    if (!element.textContent.trim() || 
        element.classList.contains('socio-filtered-text') || 
        element.classList.contains('socio-safe-text')) {
      return;
    }
    
    // Skip elements that are part of the Socio.io UI
    if (element.closest('.socio-ui') || element.closest('.socio-image-overlay')) {
      return;
    }
    
    // Process the element
    const wasFiltered = await filterTextContent(element);
    
    // Mark as processed
    if (!wasFiltered) {
      element.classList.add('socio-safe-text');
    }
  });
}

// Process images
function processImages() {
  if (!settings.enableImageFiltering) return;
  
  // Get all images
  const images = document.querySelectorAll('img');
  
  images.forEach(async (img) => {
    // Skip already processed images or images without a source
    if (!img.src || 
        img.classList.contains('socio-filtered-image') || 
        img.classList.contains('socio-safe-image')) {
      return;
    }
    
    // Skip images that are part of the Socio.io UI
    if (img.closest('.socio-ui')) {
      return;
    }
    
    // Process the image
    await filterImageContent(img);
  });
}

// Process the entire page
function processPage() {
  processTextNodes();
  processImages();
}

// Add recover button to the page
function addRecoverButton() {
  // Check if button already exists
  if (document.getElementById('socio-recover-btn')) {
    return;
  }
  
  // Create recover button
  const recoverBtn = document.createElement('button');
  recoverBtn.id = 'socio-recover-btn';
  recoverBtn.textContent = 'Recover Content';
  recoverBtn.addEventListener('click', recoverContent);
  
  // Add to the page
  document.body.appendChild(recoverBtn);
}

// Check connection to backend
function checkConnection() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'checkConnection',
      apiUrl: window.SocioConfig.BACKEND_API_URL
    }, (response) => {
      resolve(response?.success || false);
    });
  });
}

// Initialize extension
async function initialize() {
  // Load settings
  loadSettings();
  
  // Check connection to backend
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    console.error('Socio.io: Failed to connect to backend');
    return;
  }
  
  // Process the page
  processPage();
  
  // Add recover button
  addRecoverButton();
  
  // Set up mutation observer to detect new content
  const observer = new MutationObserver((mutations) => {
    let shouldProcessText = false;
    let shouldProcessImages = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if new text content was added
            if (node.textContent && node.textContent.trim()) {
              shouldProcessText = true;
            }
            
            // Check if new images were added
            if (node.tagName === 'IMG' || node.querySelectorAll('img').length > 0) {
              shouldProcessImages = true;
            }
            
            // If both types of content were found, we can stop checking
            if (shouldProcessText && shouldProcessImages) {
              break;
            }
          }
        }
      }
      
      // If both types of content were found, we can stop checking mutations
      if (shouldProcessText && shouldProcessImages) {
        break;
      }
    }
    
    // Process only the necessary content types
    if (shouldProcessText) {
      processTextNodes();
    }
    
    if (shouldProcessImages) {
      processImages();
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start the extension
window.addEventListener('load', initialize);