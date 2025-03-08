const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { authenticate, isAdmin, isPremium } = require('../middleware/auth');

// Public routes
// Get all public images - no authentication needed
router.get('/public', imageController.getPublicImages);

// Protected routes - require authentication
router.use(authenticate);

// Get a single image by ID
router.get('/:id', imageController.getImageById);

// Generate a standard image
router.post('/generate', imageController.generateImage);

// Generate an enhanced image
router.post('/generate/enhanced', imageController.generateEnhancedImage);

// Generate image using Python scripts
router.post('/generate/python', imageController.generatePythonImage);

// Premium routes - require premium subscription
router.use(isPremium);

// Get premium images - requires premium subscription
router.get('/premium', imageController.getPremiumImages);

// Get NSFW images - requires premium subscription
router.get('/nsfw', imageController.getNsfwImages);

// Admin routes - require admin role
router.use(isAdmin);

// Train model - admin only
router.post('/train', imageController.trainModel);

module.exports = router; 