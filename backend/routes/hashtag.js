const express = require('express');
const router = express.Router();
const hashtagService = require('../services/hashtagService');
const auth = require('../middleware/auth');

/**
 * @route GET /api/hashtag/popular
 * @desc Popüler hashtagleri getirir
 * @access Public
 */
router.get('/popular', async (req, res) => {
  try {
    const { category = 'general', platform = 'instagram', limit = 30 } = req.query;
    
    const hashtags = await hashtagService.getPopularHashtags(
      category,
      platform,
      parseInt(limit, 10)
    );
    
    res.json({ success: true, hashtags });
  } catch (error) {
    console.error('Popüler hashtag getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route GET /api/hashtag/twitter/trending
 * @desc Twitter trending topiclerini getirir
 * @access Public
 */
router.get('/twitter/trending', async (req, res) => {
  try {
    const { woeid = 1 } = req.query;
    
    const trends = await hashtagService.fetchTwitterTrends(parseInt(woeid, 10));
    
    res.json({ success: true, trends });
  } catch (error) {
    console.error('Twitter trend getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route POST /api/hashtag/suggest
 * @desc Metin için hashtag önerileri yapar
 * @access Private
 */
router.post('/suggest', auth, async (req, res) => {
  try {
    const { text, category = 'general', count = 15 } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text field is required'
      });
    }
    
    const suggestions = await hashtagService.suggestHashtags(
      text,
      category,
      parseInt(count, 10)
    );
    
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Hashtag önerisi hatası:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route POST /api/hashtag/update
 * @desc Hashtag veritabanını manuel olarak günceller (Sadece admin)
 * @access Private
 */
router.post('/update', auth, async (req, res) => {
  try {
    // Sadece admin kullanabilir
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }
    
    // Güncelleme işlemini başlat
    hashtagService.manualUpdate();
    
    res.json({
      success: true,
      message: 'Hashtag ve trend güncelleme işlemi başlatıldı'
    });
  } catch (error) {
    console.error('Manuel güncelleme hatası:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 