const User = require('../models/User');

/**
 * Kullanıcı skorlama sistemini yöneten servis sınıfı
 */
class ScoringService {
  
  /**
   * Kullanıcının skorunu günceller
   * @param {string} userId - Kullanıcı ID
   * @param {number} points - Eklenecek/çıkarılacak puan (negatif değer de olabilir)
   * @param {string} reason - Skor değişikliği nedeni
   * @returns {Promise<Object>} - Güncellenmiş kullanıcı skoru bilgileri
   */
  static async updateScore(userId, points, reason) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }
      
      // Yeni skoru hesapla, 0-100 aralığında olduğundan emin ol
      let newScore = user.userScore + points;
      newScore = Math.max(0, Math.min(100, newScore));
      
      // Kullanıcıyı güncelle
      user.userScore = newScore;
      await user.save();
      
      // Loglama yapılabilir
      console.log(`User ${userId} score updated: ${user.userScore - points} -> ${newScore} (${points > 0 ? '+' : ''}${points}) - Reason: ${reason}`);
      
      return {
        userId,
        previousScore: user.userScore - points,
        currentScore: newScore,
        change: points,
        reason
      };
    } catch (error) {
      console.error('Skor güncelleme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Kullanıcı skoruna göre içerik fiyatını hesaplar
   * @param {number} basePrice - İçeriğin temel fiyatı (USD)
   * @param {number} userScore - Kullanıcı skoru (0-100)
   * @returns {number} - Hesaplanan fiyat (USD)
   */
  static calculateContentPrice(basePrice, userScore) {
    // Skor yükseldikçe fiyat düşer
    // 0 skorda maksimum fiyat ($50), 100 skorda minimum fiyat ($5)
    
    // 0 skor: Katsayı 1.0 (basePrice * 1.0)
    // 100 skor: Katsayı 0.1 (basePrice * 0.1)
    
    const minMultiplier = 0.1;  // Minimum fiyat katsayısı (skor 100 için)
    const maxMultiplier = 1.0;  // Maksimum fiyat katsayısı (skor 0 için)
    
    // Skor 0 ile 100 arasında olmalı
    const normalizedScore = Math.max(0, Math.min(100, userScore));
    
    // Lineer interpolasyon: (100 - skor) / 100 * (max - min) + min
    const priceMultiplier = (100 - normalizedScore) / 100 * (maxMultiplier - minMultiplier) + minMultiplier;
    
    // Fiyatı hesapla ve iki ondalık basamağa yuvarla
    return Math.round(basePrice * priceMultiplier * 100) / 100;
  }
  
  /**
   * Puanlama olayları
   * Farklı olaylar için kullanıcı puanını ne kadar artıracağımızı tanımlar
   */
  static get ScoringEvents() {
    return {
      PROFILE_COMPLETE: 5,          // Profil tamamlandığında
      VERIFIED_EMAIL: 10,           // E-posta doğrulandığında
      VERIFIED_PHONE: 15,           // Telefon doğrulandığında
      PURCHASE_MADE: 8,             // Satın alma yapıldığında
      CONTENT_CREATED: 3,           // İçerik oluşturulduğunda
      ACTIVE_USER: 2,               // Belirli bir süre aktif kullanıldığında
      INACTIVE_PENALTY: -5,         // Uzun süre inaktif kalındığında
      PAYMENT_ISSUE: -10,           // Ödeme sorunları olduğunda
      SPAM_REPORT: -15,             // Spam raporu alındığında
      POSITIVE_FEEDBACK: 5,         // Olumlu geribildirim alındığında
      NEGATIVE_FEEDBACK: -5,        // Olumsuz geribildirim alındığında
      REFERRED_USER: 10,            // Yeni kullanıcı önerildiğinde
      SOCIAL_MEDIA_CONNECT: 3,      // Sosyal medya hesabı bağlandığında
    };
  }
  
  /**
   * Kullanıcının fiyat kademesini döndürür
   * @param {number} userScore - Kullanıcı skoru
   * @returns {string} - Fiyat kademesi (LOW, MEDIUM, HIGH)
   */
  static getPriceTier(userScore) {
    if (userScore >= 80) return 'LOW';     // 80-100 arası düşük fiyat
    if (userScore >= 40) return 'MEDIUM';  // 40-79 arası orta fiyat
    return 'HIGH';                          // 0-39 arası yüksek fiyat
  }
  
  /**
   * Kullanıcı skorunu bir olaya göre günceller
   * @param {string} userId - Kullanıcı ID
   * @param {string} eventType - Olay tipi (ScoringEvents içinden)
   * @param {string} [details] - Olay detayları
   * @returns {Promise<Object>} - Güncellenmiş kullanıcı skoru bilgileri
   */
  static async handleScoringEvent(userId, eventType, details = '') {
    const points = this.ScoringEvents[eventType] || 0;
    const reason = `${eventType}${details ? ': ' + details : ''}`;
    
    return await this.updateScore(userId, points, reason);
  }
}

module.exports = ScoringService; 