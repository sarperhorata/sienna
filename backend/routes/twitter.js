const express = require('express');
const router = express.Router();
const twitterController = require('../controllers/twitterController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Açık rotalar - kimlik doğrulama gerektirmez

// Korumalı rotalar - kimlik doğrulama gerektirir
router.use(authenticate);

// Tweetleri getir
router.get('/tweets', twitterController.getAllTweets);

// Belirli bir tweeti getir
router.get('/tweets/:tweetId', twitterController.getTweetById);

// Trend konuları getir
router.get('/trends', twitterController.getTrendingTopics);

// Admin rotaları - admin rolü gerektirir
router.use(isAdmin);

// Tweet oluştur
router.post('/generate', twitterController.generateTweet);

// Belirli bir tweeti paylaş
router.post('/tweets/:tweetId/post', twitterController.postTweet);

// Tweet zamanlamasını başlat
router.post('/schedule/start', twitterController.startTweetSchedule);

// Tweet zamanlamasını durdur
router.post('/schedule/stop', twitterController.stopTweetSchedule);

module.exports = router; 