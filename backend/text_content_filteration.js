require('dotenv').config();
const axios = require('axios');

const SIGHTENGINE_API_USER = process.env.SIGHTENGINE_API_USER;
const SIGHTENGINE_API_SECRET = process.env.SIGHTENGINE_API_SECRET;

/**
 * Analyze text content using Sightengine's text moderation API
 * @param {string} text
 * @returns {Object}
 */
async function analyzeText(text) {
  try {
    const params = {
      api_user: SIGHTENGINE_API_USER,
      api_secret: SIGHTENGINE_API_SECRET,
      text,
      lang: 'en', // Change language if needed
      mode: 'standard', // Can be 'standard' or 'chat' etc.
    };

    const response = await axios.get('https://api.sightengine.com/1.0/text/check.json', { params });
    const result = response.data;

    let containsExplicitContent = false;
    let foundCategories = [];
    let filteredText = text;

    // Check for any flagged categories
    if (result.profanity && result.profanity.matches.length > 0) {
      containsExplicitContent = true;
      foundCategories.push('profanity');
      // Mask out profane words
      result.profanity.matches.forEach(match => {
        const mask = '*'.repeat(match.match.length);
        filteredText = filteredText.replace(new RegExp(match.match, 'gi'), mask);
      });
    }

    if (result.personal && result.personal.matches.length > 0) {
      containsExplicitContent = true;
      foundCategories.push('personal');
    }
    if (result.sexual && result.sexual.matches.length > 0) {
      containsExplicitContent = true;
      foundCategories.push('sexual');
    }
    if (result.insult && result.insult.matches.length > 0) {
      containsExplicitContent = true;
      foundCategories.push('insult');
    }
    if (result.hate && result.hate.matches.length > 0) {
      containsExplicitContent = true;
      foundCategories.push('hate');
    }
    if (result.link && result.link.matches.length > 0) {
      containsExplicitContent = true;
      foundCategories.push('link');
    }
    if (result.spam && result.spam.matches.length > 0) {
      containsExplicitContent = true;
      foundCategories.push('spam');
    }

    return {
      containsExplicitContent,
      foundExplicitCategories: foundCategories,
      filteredText,
      originalText: text,
      sightengineRaw: result
    };
  } catch (error) {
    console.error('Sightengine text moderation error:', error?.response?.data || error);
    throw new Error('Error analyzing text with Sightengine');
  }
}

module.exports = {
  analyzeText
};