const mongoose = require('mongoose');
const axios = require('axios');

// Analitik olay şeması
const analyticsEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  sessionId: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true
  },
  eventAction: {
    type: String,
    required: true
  },
  eventCategory: {
    type: String,
    required: true
  },
  eventLabel: String,
  eventValue: Number,
  deviceInfo: {
    deviceType: String,
    browser: String,
    os: String,
    resolution: String
  },
  location: {
    country: String,
    city: String,
    region: String
  },
  referrer: String,
  path: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: mongoose.Schema.Types.Mixed
});

// Indeksler oluştur
analyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
analyticsEventSchema.index({ eventCategory: 1, eventAction: 1 });
analyticsEventSchema.index({ timestamp: -1 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

/**
 * Analytics servis sınıfı
 */
class AnalyticsService {
  
  /**
   * Google Analytics Ölçüm ID'si
   * @private
   */
  static #MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
  
  /**
   * Google Analytics API anahtarı
   * @private
   */
  static #API_SECRET = process.env.GA_API_SECRET;
  
  /**
   * Bir analitik olayını MongoDB'ye kaydeder
   * @param {Object} eventData - Olay verileri
   * @returns {Promise<Object>} - Kaydedilen olay
   */
  static async trackEvent(eventData) {
    try {
      // Yerel veritabanına kaydet
      const analyticsEvent = new AnalyticsEvent(eventData);
      await analyticsEvent.save();
      
      // Google Analytics'e gönder
      if (this.#MEASUREMENT_ID && this.#API_SECRET) {
        await this.#sendToGoogleAnalytics(eventData);
      }
      
      return analyticsEvent;
    } catch (error) {
      console.error('Analytics olayı kaydetme hatası:', error);
      // Kritik olmayan bir hata olduğu için hatayı yutuyoruz
      // Ana akış devam etmeli
      return null;
    }
  }
  
  /**
   * Google Analytics 4'e olay gönderir
   * @param {Object} eventData - Olay verileri
   * @returns {Promise<void>}
   * @private
   */
  static async #sendToGoogleAnalytics(eventData) {
    try {
      const { eventType, eventAction, eventCategory, eventLabel, eventValue, userId, sessionId } = eventData;
      
      // Google Analytics 4 için veri hazırla
      const gaData = {
        client_id: sessionId,
        user_id: userId,
        events: [{
          name: eventType,
          params: {
            engagement_time_msec: 100,
            session_id: sessionId,
            action: eventAction,
            category: eventCategory
          }
        }]
      };
      
      // Opsiyonel parametreleri ekle
      if (eventLabel) gaData.events[0].params.label = eventLabel;
      if (eventValue) gaData.events[0].params.value = eventValue;
      
      // Kullanıcı ve cihaz bilgilerini ekle
      if (eventData.deviceInfo) {
        gaData.events[0].params.device_category = eventData.deviceInfo.deviceType;
        gaData.events[0].params.browser = eventData.deviceInfo.browser;
        gaData.events[0].params.os = eventData.deviceInfo.os;
      }
      
      // Lokasyon bilgisini ekle
      if (eventData.location) {
        gaData.events[0].params.country = eventData.location.country;
        gaData.events[0].params.city = eventData.location.city;
      }
      
      // Google Analytics 4 Measurement Protocol API'sine gönder
      await axios.post(`https://www.google-analytics.com/mp/collect?measurement_id=${this.#MEASUREMENT_ID}&api_secret=${this.#API_SECRET}`, gaData);
    } catch (error) {
      console.error('Google Analytics\'e veri gönderme hatası:', error);
    }
  }
  
  /**
   * Kullanıcı oturum açtığında çağrılacak analitik
   * @param {string} userId - Kullanıcı ID
   * @param {string} sessionId - Oturum ID
   * @param {Object} deviceInfo - Cihaz bilgileri
   * @returns {Promise<Object>} - Kaydedilen olay
   */
  static async trackLogin(userId, sessionId, deviceInfo) {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'login',
      eventAction: 'login',
      eventCategory: 'user',
      eventLabel: 'User logged in',
      deviceInfo
    });
  }
  
  /**
   * Kullanıcı kayıt olduğunda çağrılacak analitik
   * @param {string} userId - Kullanıcı ID
   * @param {string} sessionId - Oturum ID
   * @param {Object} deviceInfo - Cihaz bilgileri
   * @returns {Promise<Object>} - Kaydedilen olay
   */
  static async trackRegistration(userId, sessionId, deviceInfo) {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'sign_up',
      eventAction: 'registration',
      eventCategory: 'user',
      eventLabel: 'New user registration',
      deviceInfo
    });
  }
  
  /**
   * İçerik oluşturulduğunda çağrılacak analitik
   * @param {string} userId - Kullanıcı ID
   * @param {string} sessionId - Oturum ID
   * @param {string} contentType - İçerik tipi
   * @param {string} contentId - İçerik ID
   * @returns {Promise<Object>} - Kaydedilen olay
   */
  static async trackContentCreation(userId, sessionId, contentType, contentId) {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'content_creation',
      eventAction: 'create',
      eventCategory: contentType,
      eventLabel: `Created ${contentType}`,
      eventValue: 1,
      metadata: { contentId }
    });
  }
  
  /**
   * Satın alma işleminde çağrılacak analitik
   * @param {string} userId - Kullanıcı ID
   * @param {string} sessionId - Oturum ID
   * @param {string} orderId - Sipariş ID
   * @param {number} amount - Tutar
   * @param {string} currency - Para birimi
   * @param {Array} items - Satın alınan ürünler
   * @returns {Promise<Object>} - Kaydedilen olay
   */
  static async trackPurchase(userId, sessionId, orderId, amount, currency, items) {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'purchase',
      eventAction: 'transaction',
      eventCategory: 'ecommerce',
      eventLabel: `Order #${orderId}`,
      eventValue: amount,
      metadata: {
        orderId,
        currency,
        items
      }
    });
  }
  
  /**
   * Kullanıcı etkinliğini takip etmek için çağrılacak analitik
   * @param {string} userId - Kullanıcı ID
   * @param {string} sessionId - Oturum ID
   * @param {string} action - Etkinlik eylemi
   * @param {Object} metadata - Ek bilgiler
   * @returns {Promise<Object>} - Kaydedilen olay
   */
  static async trackUserActivity(userId, sessionId, action, metadata = {}) {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'user_activity',
      eventAction: action,
      eventCategory: 'engagement',
      metadata
    });
  }
  
  /**
   * Belirli bir kullanıcının etkinlik geçmişini getirir
   * @param {string} userId - Kullanıcı ID
   * @param {Object} options - Filtreleme seçenekleri
   * @returns {Promise<Array>} - Etkinlikler
   */
  static async getUserActivityHistory(userId, options = {}) {
    const { limit = 50, skip = 0, startDate, endDate, eventTypes } = options;
    
    // Filtreleme koşulları
    const query = { userId };
    
    // Tarih aralığı filtresi
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Etkinlik tipleri filtresi
    if (eventTypes && eventTypes.length > 0) {
      query.eventType = { $in: eventTypes };
    }
    
    try {
      const activities = await AnalyticsEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
      
      return activities;
    } catch (error) {
      console.error('Kullanıcı etkinlikleri getirme hatası:', error);
      return [];
    }
  }
  
  /**
   * Kullanıcı başarım metriklerini hesaplar
   * @param {string} userId - Kullanıcı ID
   * @returns {Promise<Object>} - Başarım metrikleri
   */
  static async getUserPerformanceMetrics(userId) {
    try {
      // Son 30 gündeki etkinlikleri al
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Etkinlik sayısını hesapla
      const totalActivities = await AnalyticsEvent.countDocuments({
        userId,
        timestamp: { $gte: thirtyDaysAgo }
      });
      
      // İçerik oluşturma sayısını hesapla
      const contentCreated = await AnalyticsEvent.countDocuments({
        userId,
        eventType: 'content_creation',
        timestamp: { $gte: thirtyDaysAgo }
      });
      
      // Satın alma sayısını hesapla
      const purchases = await AnalyticsEvent.countDocuments({
        userId,
        eventType: 'purchase',
        timestamp: { $gte: thirtyDaysAgo }
      });
      
      // Toplam harcamayı hesapla
      const purchaseEvents = await AnalyticsEvent.find({
        userId,
        eventType: 'purchase',
        timestamp: { $gte: thirtyDaysAgo }
      });
      
      const totalSpent = purchaseEvents.reduce((sum, event) => sum + (event.eventValue || 0), 0);
      
      return {
        totalActivities,
        contentCreated,
        purchases,
        totalSpent,
        period: '30days'
      };
    } catch (error) {
      console.error('Kullanıcı başarım metrikleri hesaplama hatası:', error);
      return {
        totalActivities: 0,
        contentCreated: 0,
        purchases: 0,
        totalSpent: 0,
        period: '30days'
      };
    }
  }
  
  /**
   * Genel platform metriklerini hesaplar
   * @param {Object} options - Filtreleme seçenekleri
   * @returns {Promise<Object>} - Platform metrikleri
   */
  static async getPlatformMetrics(options = {}) {
    const { startDate, endDate } = options;
    
    // Tarih filtresi
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    try {
      // Toplam etkinlik sayısı
      const totalEvents = await AnalyticsEvent.countDocuments(query);
      
      // Aktif kullanıcı sayısı
      const activeUsers = await AnalyticsEvent.distinct('userId', query);
      
      // İçerik oluşturma sayısı
      const contentCreated = await AnalyticsEvent.countDocuments({
        ...query,
        eventType: 'content_creation'
      });
      
      // Satın alma sayısı ve toplam gelir
      const purchaseEvents = await AnalyticsEvent.find({
        ...query,
        eventType: 'purchase'
      });
      
      const totalRevenue = purchaseEvents.reduce((sum, event) => sum + (event.eventValue || 0), 0);
      
      return {
        totalEvents,
        activeUsers: activeUsers.length,
        contentCreated,
        purchases: purchaseEvents.length,
        totalRevenue
      };
    } catch (error) {
      console.error('Platform metrikleri hesaplama hatası:', error);
      return {
        totalEvents: 0,
        activeUsers: 0,
        contentCreated: 0,
        purchases: 0,
        totalRevenue: 0
      };
    }
  }
}

module.exports = AnalyticsService; 