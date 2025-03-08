const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// All chat routes require authentication
router.use(authenticate);

// Get chat history
router.get('/history', chatController.getChatHistory);

// Send message to Sienna
router.post('/message', chatController.sendMessage);

module.exports = router; 