const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');
const auth = require('../middleware/auth');
const User = require('../models/User');

/**
 * @route POST /api/telegram/webhook
 * @desc Telegram webhook endpoint
 * @access Public
 */
router.post('/webhook', async (req, res) => {
  try {
    await telegramService.processUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/telegram/set-webhook
 * @desc Telegram webhook ayarlama
 * @access Private (Admin only)
 */
router.post('/set-webhook', auth, async (req, res) => {
  try {
    // Sadece admin rolündeki kullanıcıların bu endpointi kullanmasına izin ver
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ message: 'webhookUrl gerekli' });
    }

    const result = await telegramService.setWebhook(webhookUrl);
    res.json(result);
  } catch (error) {
    console.error('Webhook ayarlama hatası:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/telegram/verify
 * @desc Kullanıcı telegram doğrulama kodu onaylama
 * @access Private
 */
router.post('/verify', auth, async (req, res) => {
  try {
    const { verificationCode } = req.body;
    if (!verificationCode) {
      return res.status(400).json({ message: 'Doğrulama kodu gerekli' });
    }

    const success = await telegramService.verifyUser(req.user.id, verificationCode);
    
    if (success) {
      res.json({ 
        message: 'Hesabınız başarıyla doğrulandı',
        verified: true
      });
    } else {
      res.status(400).json({ 
        message: 'Geçersiz veya süresi dolmuş doğrulama kodu',
        verified: false
      });
    }
  } catch (error) {
    console.error('Doğrulama hatası:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/telegram/status
 * @desc Kullanıcının telegram doğrulama durumunu kontrol et
 * @access Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('verified verificationMethod telegramId');
    
    res.json({
      verified: user.verified,
      verificationMethod: user.verificationMethod,
      telegramConnected: !!user.telegramId
    });
  } catch (error) {
    console.error('Durum kontrolü hatası:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 