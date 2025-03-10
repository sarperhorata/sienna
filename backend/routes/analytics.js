const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @route POST /api/analytics/event
 * @desc Analitik olayı kaydet
 * @access Public
 */
router.post('/event', async (req, res) => {
  try {
    const { 
      eventType, 
      eventAction, 
      eventCategory, 
      eventLabel, 
      eventValue,
      sessionId,
      userId,
      deviceInfo,
      location,
      referrer,
      path,
      metadata
    } = req.body;
    
    // Zorunlu alanları kontrol et
    if (!eventType || !eventAction || !eventCategory) {
      return res.status(400).json({
        success: false,
        message: 'eventType, eventAction ve eventCategory alanları zorunludur'
      });
    }
    
    // Session ID yoksa oluştur
    const finalSessionId = sessionId || uuidv4();
    
    // Analitik olayını kaydet
    const event = await analyticsService.trackEvent({
      eventType,
      eventAction,
      eventCategory,
      eventLabel,
      eventValue,
      sessionId: finalSessionId,
      userId,
      deviceInfo,
      location,
      referrer,
      path,
      metadata
    });
    
    res.json({
      success: true,
      sessionId: finalSessionId
    });
  } catch (error) {
    console.error('Analitik olayı kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route POST /api/analytics/user-activity
 * @desc Kullanıcı etkinliği kaydet
 * @access Private
 */
router.post('/user-activity', auth, async (req, res) => {
  try {
    const { sessionId, action, metadata } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'action alanı zorunludur'
      });
    }
    
    // Kullanıcı etkinliğini kaydet
    await analyticsService.trackUserActivity(
      req.user.id,
      sessionId || uuidv4(),
      action,
      metadata
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Kullanıcı etkinliği kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route GET /api/analytics/user-history
 * @desc Kullanıcının etkinlik geçmişini getirir
 * @access Private
 */
router.get('/user-history', auth, async (req, res) => {
  try {
    const { limit, skip, startDate, endDate, eventTypes } = req.query;
    
    // Kullanıcı etkinlik geçmişini getir
    const history = await analyticsService.getUserActivityHistory(
      req.user.id,
      {
        limit: parseInt(limit, 10) || 50,
        skip: parseInt(skip, 10) || 0,
        startDate,
        endDate,
        eventTypes: eventTypes ? eventTypes.split(',') : undefined
      }
    );
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Kullanıcı geçmişi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route GET /api/analytics/user-metrics
 * @desc Kullanıcının başarım metriklerini getirir
 * @access Private
 */
router.get('/user-metrics', auth, async (req, res) => {
  try {
    // Kullanıcı başarım metriklerini getir
    const metrics = await analyticsService.getUserPerformanceMetrics(req.user.id);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Kullanıcı metrikleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route GET /api/analytics/platform-metrics
 * @desc Platform metriklerini getirir (sadece admin)
 * @access Private
 */
router.get('/platform-metrics', auth, async (req, res) => {
  try {
    // Sadece admin erişebilir
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gereklidir'
      });
    }
    
    const { startDate, endDate } = req.query;
    
    // Platform metriklerini getir
    const metrics = await analyticsService.getPlatformMetrics({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Platform metrikleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 