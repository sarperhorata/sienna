const axios = require('axios');
const User = require('../models/User');

// Telegram API URL
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Telegram servis sınıfı
 */
class TelegramService {
  
  /**
   * Telegram Bot'un webhook bilgilerini ayarlar
   * @param {string} webhookUrl - Webhook URL'i
   * @returns {Promise<Object>} - Yanıt
   */
  static async setWebhook(webhookUrl) {
    try {
      const response = await axios.post(`${TELEGRAM_API}/setWebhook`, {
        url: webhookUrl,
        drop_pending_updates: true
      });
      return response.data;
    } catch (error) {
      console.error('Telegram webhook hatası:', error);
      throw error;
    }
  }

  /**
   * Telegram'dan gelen webhook isteklerini işler
   * @param {Object} update - Telegram update nesnesi
   * @returns {Promise<void>}
   */
  static async processUpdate(update) {
    try {
      if (update.message) {
        await this.processMessage(update.message);
      } else if (update.callback_query) {
        await this.processCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error('Telegram işleme hatası:', error);
    }
  }

  /**
   * Telegram'dan gelen mesajları işler
   * @param {Object} message - Telegram mesaj nesnesi
   * @returns {Promise<void>}
   */
  static async processMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;

    if (text === '/start') {
      await this.sendMessage(chatId, 'Sienna Carter hesabını doğrulamak için buraya tıkla! /verify');
    } else if (text === '/verify') {
      const verificationCode = this.generateVerificationCode();
      await this.sendMessage(chatId, `Doğrulama kodun: ${verificationCode}\n\nBu kodu web sitemizde girerek hesabını doğrulayabilirsin.`);
      
      // Kodu veritabanına kaydet (gerçek uygulamada bu kod geçici bir depoda saklanmalı)
      // Bu örnek kod sadece konsepti göstermek içindir
      global.verificationCodes = global.verificationCodes || {};
      global.verificationCodes[verificationCode] = {
        telegramId: chatId,
        createdAt: new Date(),
        // 10 dakika sonra geçersiz olacak
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };
    }
  }

  /**
   * Kullanıcıyı Telegram üzerinden doğrular
   * @param {string} userId - MongoDB'deki kullanıcı ID'si
   * @param {string} verificationCode - Doğrulama kodu
   * @returns {Promise<boolean>} - Doğrulama başarılı ise true
   */
  static async verifyUser(userId, verificationCode) {
    // Doğrulama kodunu kontrol et
    const verificationData = global.verificationCodes && global.verificationCodes[verificationCode];
    
    if (!verificationData) {
      return false; // Kod bulunamadı
    }
    
    if (verificationData.expiresAt < new Date()) {
      delete global.verificationCodes[verificationCode];
      return false; // Kod süresi dolmuş
    }
    
    // Kullanıcıyı güncelle
    try {
      const user = await User.findById(userId);
      if (!user) return false;
      
      user.verified = true;
      user.verificationMethod = 'telegram';
      user.telegramId = verificationData.telegramId;
      await user.save();
      
      // Kullanılan kodu sil
      delete global.verificationCodes[verificationCode];
      
      // Kullanıcıya doğrulama mesajı gönder
      await this.sendMessage(
        verificationData.telegramId, 
        'Hesabın başarıyla doğrulandı! Artık Sienna Carter platformunu kullanabilirsin.'
      );
      
      return true;
    } catch (error) {
      console.error('Kullanıcı doğrulama hatası:', error);
      return false;
    }
  }

  /**
   * Telegram üzerinden mesaj gönderir
   * @param {string|number} chatId - Telegram chat ID'si
   * @param {string} text - Gönderilecek mesaj
   * @param {Object} [options] - Ek seçenekler
   * @returns {Promise<Object>} - Yanıt
   */
  static async sendMessage(chatId, text, options = {}) {
    try {
      const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Telegram mesaj gönderme hatası:', error);
      throw error;
    }
  }

  /**
   * Callback query işler
   * @param {Object} callbackQuery - Callback query nesnesi
   * @returns {Promise<void>}
   */
  static async processCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    await this.answerCallbackQuery(callbackQuery.id);
    
    // Burada callback veri tipine göre işlem yapabilirsiniz
    if (data.startsWith('verify_')) {
      const code = data.replace('verify_', '');
      await this.sendMessage(chatId, `Doğrulama kodun: ${code}`);
    }
  }

  /**
   * Callback query'yi yanıtlar
   * @param {string} callbackQueryId - Callback query ID'si
   * @param {Object} [options] - Ek seçenekler
   * @returns {Promise<Object>} - Yanıt
   */
  static async answerCallbackQuery(callbackQueryId, options = {}) {
    try {
      const response = await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Telegram callback yanıtlama hatası:', error);
      throw error;
    }
  }

  /**
   * Rastgele doğrulama kodu oluşturur
   * @returns {string} - 6 haneli doğrulama kodu
   */
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = TelegramService; 