const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// All payment routes require authentication
router.use(authenticate);

// Create payment intent for Stripe
router.post('/create-payment-intent', paymentController.createPaymentIntent);

// Handle successful payment
router.post('/payment-success', paymentController.handlePaymentSuccess);

// Subscribe to premium
router.post('/subscribe-premium', paymentController.subscribeToPremium);

// Process crypto payment
router.post('/crypto-payment', paymentController.processCryptoPayment);

module.exports = router; 