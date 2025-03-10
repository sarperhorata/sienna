const axios = require('axios');
const mongoose = require('mongoose');
const twitterService = require('./twitterService');
const schedule = require('node-schedule');

// Hashtag schema
const hashtagSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['instagram', 'twitter'],
    required: true
  },
  tag: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  engagement: {
    type: Number,
    default: 0
  },
  popularity: {
    type: Number,
    default: 0
  },
  postCount: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index oluştur
hashtagSchema.index({ platform: 1, tag: 1 }, { unique: true });
hashtagSchema.index({ category: 1, popularity: -1 });

const Hashtag = mongoose.model('Hashtag', hashtagSchema);

/**
 * Hashtag ve trending topic verilerini yöneten servis
 */
class HashtagService {
  
  /**
   * RapidAPI'den Instagram hashtaglerini alır
   * @param {string} category - Hashtag kategorisi
   * @returns {Promise<Array>} - Hashtagler
   */
  static async fetchInstagramHashtags(category = 'general') {
    try {
      // RapidAPI üzerinden Instagram Hashtag API'si
      // Not: Bu API anahtarını .env dosyasına eklemelisiniz
      const response = await axios.get('https://top-instagram-hashtags.p.rapidapi.com/hashtags', {
        params: { category },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'top-instagram-hashtags.p.rapidapi.com'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Instagram hashtag getirme hatası:', error);
      // Hata durumunda boş dizi döndür
      return [];
    }
  }
  
  /**
   * Twitter trending topiclerini twitterService üzerinden alır
   * @param {number} woeid - Dünya üzerindeki konum ID'si (1 = worldwide)
   * @returns {Promise<Array>} - Trending topicler
   */
  static async fetchTwitterTrends(woeid = 1) {
    try {
      const trends = await twitterService.getTrends(woeid);
      return trends[0]?.trends || [];
    } catch (error) {
      console.error('Twitter trend getirme hatası:', error);
      return [];
    }
  }
  
  /**
   * Instagram hashtaglerini veritabanına kaydeder
   * @param {Array} hashtags - Hashtagler
   * @param {string} category - Kategori
   * @returns {Promise<void>}
   */
  static async saveInstagramHashtags(hashtags, category = 'general') {
    try {
      const operations = hashtags.map(tag => ({
        updateOne: {
          filter: { platform: 'instagram', tag: tag.name },
          update: {
            $set: {
              category,
              engagement: tag.engagement || 0,
              popularity: tag.popularity || 0,
              postCount: tag.post_count || 0,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      }));
      
      if (operations.length > 0) {
        await Hashtag.bulkWrite(operations);
        console.log(`${operations.length} Instagram hashtag kaydedildi (${category})`);
      }
    } catch (error) {
      console.error('Instagram hashtag kaydetme hatası:', error);
    }
  }
  
  /**
   * Twitter trendlerini veritabanına kaydeder
   * @param {Array} trends - Trendler
   * @returns {Promise<void>}
   */
  static async saveTwitterTrends(trends) {
    try {
      const operations = trends.map(trend => ({
        updateOne: {
          filter: { platform: 'twitter', tag: trend.name },
          update: {
            $set: {
              category: 'trending',
              engagement: trend.tweet_volume || 0,
              popularity: trend.tweet_volume ? trend.tweet_volume / 1000 : 0,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      }));
      
      if (operations.length > 0) {
        await Hashtag.bulkWrite(operations);
        console.log(`${operations.length} Twitter trend kaydedildi`);
      }
    } catch (error) {
      console.error('Twitter trend kaydetme hatası:', error);
    }
  }
  
  /**
   * Tüm hashtag ve trendleri güncelleyen zamanlanmış görev
   */
  static scheduleUpdates() {
    // Her gün saat 03:00'da çalış (gece trafiğin az olduğu zamanda)
    schedule.scheduleJob('0 3 * * *', async () => {
      console.log('Günlük hashtag ve trend güncelleme başladı');
      
      // Instagram kategorileri
      const categories = ['general', 'fashion', 'travel', 'food', 'fitness', 'beauty'];
      
      // Her kategori için Instagram hashtaglerini güncelle
      for (const category of categories) {
        const hashtags = await this.fetchInstagramHashtags(category);
        await this.saveInstagramHashtags(hashtags, category);
        
        // API limit aşımı olmaması için bekle
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Twitter worldwide trendlerini güncelle
      const trends = await this.fetchTwitterTrends();
      await this.saveTwitterTrends(trends);
      
      // İsteğe bağlı: Ülkeye özgü trendler (Türkiye için woeid: 23424969)
      const trTrends = await this.fetchTwitterTrends(23424969);
      await this.saveTwitterTrends(trTrends);
      
      console.log('Günlük hashtag ve trend güncelleme tamamlandı');
    });
    
    console.log('Hashtag ve trend güncelleme zamanlandı (her gün 03:00)');
  }
  
  /**
   * Belirli bir kategori için popüler hashtagleri getirir
   * @param {string} category - Kategori
   * @param {string} platform - Platform (instagram veya twitter)
   * @param {number} limit - Maksimum hashtag sayısı
   * @returns {Promise<Array>} - Hashtagler
   */
  static async getPopularHashtags(category = 'general', platform = 'instagram', limit = 30) {
    try {
      const hashtags = await Hashtag.find({
        platform,
        category
      })
      .sort({ popularity: -1 })
      .limit(limit)
      .select('tag engagement postCount');
      
      return hashtags.map(h => ({
        name: h.tag,
        engagement: h.engagement,
        postCount: h.postCount
      }));
    } catch (error) {
      console.error('Hashtag getirme hatası:', error);
      return [];
    }
  }
  
  /**
   * Hashtag veritabanını manuel olarak günceller
   */
  static async manualUpdate() {
    console.log('Manuel hashtag ve trend güncelleme başladı');
    
    // Instagram kategorileri
    const categories = ['general', 'fashion', 'travel', 'food', 'fitness', 'beauty'];
    
    // Her kategori için Instagram hashtaglerini güncelle
    for (const category of categories) {
      const hashtags = await this.fetchInstagramHashtags(category);
      await this.saveInstagramHashtags(hashtags, category);
      
      // API limit aşımı olmaması için bekle
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Twitter worldwide trendlerini güncelle
    const trends = await this.fetchTwitterTrends();
    await this.saveTwitterTrends(trends);
    
    // Türkiye trendleri
    const trTrends = await this.fetchTwitterTrends(23424969);
    await this.saveTwitterTrends(trTrends);
    
    console.log('Manuel hashtag ve trend güncelleme tamamlandı');
  }
  
  /**
   * Verilen metne ve kategoriye göre hashtag önerileri yapar
   * @param {string} text - İçerik metni
   * @param {string} category - Kategori
   * @param {number} count - Önerilecek hashtag sayısı
   * @returns {Promise<Array>} - Önerilen hashtagler
   */
  static async suggestHashtags(text, category = 'general', count = 15) {
    try {
      // Kategoriye göre hashtagleri getir
      const categoryHashtags = await this.getPopularHashtags(category, 'instagram', 30);
      
      // Metinde geçen kelimeleri çıkar
      const words = text.toLowerCase()
        .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      // Kelime frekansı hesapla
      const wordFreq = {};
      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
      
      // Her hashtag için bir skor hesapla
      const scoredHashtags = categoryHashtags.map(hashtag => {
        let relevanceScore = 0;
        const hashtagName = hashtag.name.replace('#', '').toLowerCase();
        
        // İçerik kelimelerine benzerlik skoru
        for (const word in wordFreq) {
          if (hashtagName.includes(word) || word.includes(hashtagName)) {
            relevanceScore += wordFreq[word] * 2;
          }
        }
        
        // Popülerlik ve ilgililik skorunu birleştir
        const finalScore = (hashtag.engagement * 0.7) + (relevanceScore * 0.3);
        
        return {
          ...hashtag,
          relevanceScore,
          finalScore
        };
      });
      
      // Skora göre sırala ve istenilen sayıda döndür
      return scoredHashtags
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, count);
    } catch (error) {
      console.error('Hashtag önerisi hatası:', error);
      return [];
    }
  }
}

module.exports = HashtagService; 