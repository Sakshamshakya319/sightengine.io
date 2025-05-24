require('dotenv').config();
const axios = require('axios');

const SIGHTENGINE_API_USER = process.env.SIGHTENGINE_API_USER;
const SIGHTENGINE_API_SECRET = process.env.SIGHTENGINE_API_SECRET;

// Helper to call Sightengine for moderation
async function analyzeImage(imageSource) {
  try {
    let data = {
      api_user: SIGHTENGINE_API_USER,
      api_secret: SIGHTENGINE_API_SECRET,
      models: 'nudity,wad,offensive,scam,gore', // Add/remove models as per your needs
    };

    // Sightengine accepts either url or media (base64)
    if (imageSource.startsWith('http')) {
      data.url = imageSource;
    } else {
      // Remove "data:image/..." prefix if it exists
      const base64 = imageSource.replace(/^data:image\/\w+;base64,/, '');
      data.media = base64;
    }

    const response = await axios.post('https://api.sightengine.com/1.0/check.json', null, { params: data });

    const result = response.data;

    // Check for inappropriate content
    let isInappropriate = false;
    let triggeredCategories = [];
    let reasons = [];

    // Adult/Nudity
    if (result.nudity && (result.nudity.safe < 0.85)) {
      isInappropriate = true;
      triggeredCategories.push('nudity');
      reasons.push('Possible nudity');
    }

    // Weapons/Alcohol/Drugs
    if (result.weapon > 0.3) {
      isInappropriate = true;
      triggeredCategories.push('weapon');
      reasons.push('Possible weapons');
    }
    if (result.alcohol > 0.3) {
      isInappropriate = true;
      triggeredCategories.push('alcohol');
      reasons.push('Possible alcohol');
    }
    if (result.drugs > 0.3) {
      isInappropriate = true;
      triggeredCategories.push('drugs');
      reasons.push('Possible drugs');
    }

    // Offensive
    if (result.offensive && result.offensive.prob > 0.3) {
      isInappropriate = true;
      triggeredCategories.push('offensive');
      reasons.push('Offensive content');
    }

    // Scam
    if (result.scam && result.scam.prob > 0.3) {
      isInappropriate = true;
      triggeredCategories.push('scam');
      reasons.push('Scam detected');
    }

    // Gore
    if (result.gore && result.gore.prob > 0.3) {
      isInappropriate = true;
      triggeredCategories.push('gore');
      reasons.push('Gore/violence detected');
    }

    const message = isInappropriate
      ? `Image contains inappropriate content: ${triggeredCategories.join(', ')}`
      : 'Image is appropriate';

    return {
      isInappropriate,
      message,
      triggeredCategories,
      sightengineRaw: result
    };
  } catch (error) {
    console.error('Sightengine image moderation error:', error?.response?.data || error);
    throw new Error('Error analyzing image with Sightengine');
  }
}

module.exports = {
  analyzeImage
};