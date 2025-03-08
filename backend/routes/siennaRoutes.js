const express = require('express');
const router = express.Router();
const siennaGPTService = require('../services/siennaGPTService');

/**
 * @route   POST /api/sienna/chat
 * @desc    Get a response from Sienna
 * @access  Public
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = await siennaGPTService.getSiennaResponse(
      message, 
      conversationHistory || []
    );
    
    res.json(response);
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to get response from Sienna',
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/sienna/generate-image
 * @desc    Generate an image based on user prompt
 * @access  Public
 */
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Image prompt is required' });
    }
    
    const result = await siennaGPTService.generateImage(prompt);
    res.json(result);
  } catch (error) {
    console.error('Error in image generation endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/sienna/trend-response
 * @desc    Generate Sienna's response to a trending topic
 * @access  Public
 */
router.post('/trend-response', async (req, res) => {
  try {
    const { trend, tweet } = req.body;
    
    if (!trend || !tweet) {
      return res.status(400).json({ error: 'Trend topic and tweet are required' });
    }
    
    const response = await siennaGPTService.respondToTrend(trend, tweet);
    res.json({ response });
  } catch (error) {
    console.error('Error in trend response endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to generate trend response',
      message: error.message 
    });
  }
});

module.exports = router; 