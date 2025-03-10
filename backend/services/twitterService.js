const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
const OAuth = require('oauth-1.0a');

/**
 * Twitter (X) API ile etkileşimleri yöneten servis sınıfı
 */
class TwitterService {
  
  /**
   * Ana Twitter API konfigürasyonu
   * @private
   */
  static #mainConfig = {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    bearerToken: process.env.TWITTER_BEARER_TOKEN
  };
  
  /**
   * Tweet okuma için kullanılacak hesaplar
   * @private
   */
  static #readAccounts = [
    {
      name: 'sarper',
      apiKey: process.env.TWITTER1_API_KEY,
      apiSecret: process.env.TWITTER1_API_SECRET,
      accessToken: process.env.TWITTER1_ACCESS_TOKEN,
      accessTokenSecret: process.env.TWITTER1_ACCESS_TOKEN_SECRET,
      bearerToken: process.env.TWITTER1_BEARER_TOKEN
    },
    {
      name: 'gunes',
      apiKey: process.env.TWITTER3_API_KEY,
      apiSecret: process.env.TWITTER3_API_SECRET,
      accessToken: process.env.TWITTER3_ACCESS_TOKEN,
      accessTokenSecret: process.env.TWITTER3_ACCESS_TOKEN_SECRET,
      bearerToken: process.env.TWITTER3_BEARER_TOKEN
    }
  ];
  
  /**
   * OAuth 1.0a oluşturur
   * @param {Object} config - API Konfigürasyonu
   * @returns {Object} - OAuth nesnesi
   * @private
   */
  static #createOAuth(config) {
    return OAuth({
      consumer: {
        key: config.apiKey,
        secret: config.apiSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
      }
    });
  }
  
  /**
   * OAuth imzalı istek yapar
   * @param {string} method - HTTP metodu
   * @param {string} url - İstek URL'i
   * @param {Object} data - İstek verileri
   * @param {Object} config - API Konfigürasyonu
   * @returns {Promise<Object>} - API yanıtı
   * @private
   */
  static async #makeOAuthRequest(method, url, data, config) {
    const oauth = this.#createOAuth(config);
    
    const requestData = {
      url,
      method
    };
    
    const headers = oauth.toHeader(oauth.authorize(requestData, {
      key: config.accessToken,
      secret: config.accessTokenSecret
    }));
    
    try {
      let response;
      if (method === 'GET') {
        const fullUrl = data ? `${url}?${querystring.stringify(data)}` : url;
        response = await axios.get(fullUrl, { headers });
      } else {
        response = await axios.post(url, data, { headers });
      }
      return response.data;
    } catch (error) {
      console.error('Twitter API isteği hatası:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Bearer token ile istek yapar
   * @param {string} method - HTTP metodu
   * @param {string} url - İstek URL'i
   * @param {Object} data - İstek verileri
   * @param {string} bearerToken - Bearer token
   * @returns {Promise<Object>} - API yanıtı
   * @private
   */
  static async #makeBearerRequest(method, url, data, bearerToken) {
    const headers = {
      Authorization: `Bearer ${bearerToken}`
    };
    
    try {
      let response;
      if (method === 'GET') {
        const fullUrl = data ? `${url}?${querystring.stringify(data)}` : url;
        response = await axios.get(fullUrl, { headers });
      } else {
        response = await axios.post(url, data, { headers });
      }
      return response.data;
    } catch (error) {
      console.error('Twitter API bearer isteği hatası:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Tweet gönderir
   * @param {string} text - Tweet metni
   * @returns {Promise<Object>} - API yanıtı
   */
  static async postTweet(text) {
    const url = 'https://api.twitter.com/2/tweets';
    const data = { text };
    
    return await this.#makeOAuthRequest('POST', url, data, this.#mainConfig);
  }
  
  /**
   * Bir tweet'e yanıt verir
   * @param {string} replyToTweetId - Yanıtlanacak tweet ID'si
   * @param {string} text - Yanıt metni
   * @returns {Promise<Object>} - API yanıtı
   */
  static async replyToTweet(replyToTweetId, text) {
    const url = 'https://api.twitter.com/2/tweets';
    const data = {
      text,
      reply: {
        in_reply_to_tweet_id: replyToTweetId
      }
    };
    
    return await this.#makeOAuthRequest('POST', url, data, this.#mainConfig);
  }
  
  /**
   * Kullanılabilir okuma hesaplarından birini döndürür
   * @returns {Object} - Hesap konfigürasyonu
   * @private
   */
  static #getReadAccount() {
    // Basit bir yük dengeleme: rastgele bir hesap seç
    const index = Math.floor(Math.random() * this.#readAccounts.length);
    return this.#readAccounts[index];
  }
  
  /**
   * Tweetleri arar
   * @param {string} query - Arama sorgusu
   * @param {Object} options - Arama seçenekleri
   * @returns {Promise<Object>} - API yanıtı
   */
  static async searchTweets(query, options = {}) {
    const url = 'https://api.twitter.com/2/tweets/search/recent';
    
    const params = {
      query,
      max_results: options.maxResults || 10,
      ...options
    };
    
    const account = this.#getReadAccount();
    return await this.#makeBearerRequest('GET', url, params, account.bearerToken);
  }
  
  /**
   * Bir kullanıcının tweetlerini getirir
   * @param {string} userId - Twitter kullanıcı ID'si
   * @param {Object} options - İstek seçenekleri
   * @returns {Promise<Object>} - API yanıtı
   */
  static async getUserTweets(userId, options = {}) {
    const url = `https://api.twitter.com/2/users/${userId}/tweets`;
    
    const params = {
      max_results: options.maxResults || 10,
      ...options
    };
    
    const account = this.#getReadAccount();
    return await this.#makeBearerRequest('GET', url, params, account.bearerToken);
  }
  
  /**
   * Twitter kullanıcı ID'sine göre kullanıcı bilgilerini getirir
   * @param {string} userId - Twitter kullanıcı ID'si
   * @returns {Promise<Object>} - API yanıtı
   */
  static async getUserById(userId) {
    const url = `https://api.twitter.com/2/users/${userId}`;
    
    const params = {
      user.fields: 'description,profile_image_url,public_metrics'
    };
    
    const account = this.#getReadAccount();
    return await this.#makeBearerRequest('GET', url, params, account.bearerToken);
  }
  
  /**
   * Kullanıcı adına göre kullanıcı bilgilerini getirir
   * @param {string} username - Twitter kullanıcı adı (@işareti olmadan)
   * @returns {Promise<Object>} - API yanıtı
   */
  static async getUserByUsername(username) {
    const url = `https://api.twitter.com/2/users/by/username/${username}`;
    
    const params = {
      'user.fields': 'description,profile_image_url,public_metrics'
    };
    
    const account = this.#getReadAccount();
    return await this.#makeBearerRequest('GET', url, params, account.bearerToken);
  }
  
  /**
   * Twitter trendlerini getirir
   * @param {string} woeid - Dünya üzerindeki konum ID'si (Where On Earth ID)
   * @returns {Promise<Object>} - API yanıtı
   */
  static async getTrends(woeid = 1) { // 1 = worldwide
    const url = 'https://api.twitter.com/1.1/trends/place.json';
    
    const params = {
      id: woeid
    };
    
    const account = this.#getReadAccount();
    return await this.#makeBearerRequest('GET', url, params, account.bearerToken);
  }
  
  /**
   * Tweet istatistiklerini getirir
   * @param {string} tweetId - Tweet ID'si
   * @returns {Promise<Object>} - API yanıtı
   */
  static async getTweetStats(tweetId) {
    const url = `https://api.twitter.com/2/tweets/${tweetId}`;
    
    const params = {
      'tweet.fields': 'public_metrics,non_public_metrics,organic_metrics'
    };
    
    return await this.#makeOAuthRequest('GET', url, params, this.#mainConfig);
  }
  
  /**
   * X hesabının bağlantı durumunu test eder
   * @returns {Promise<boolean>} - Bağlantı başarılı ise true
   */
  static async testConnection() {
    try {
      const result = await this.getUserByUsername('Twitter');
      return !!result && !!result.data;
    } catch (error) {
      console.error('Twitter bağlantı testi hatası:', error);
      return false;
    }
  }
}

module.exports = TwitterService; 