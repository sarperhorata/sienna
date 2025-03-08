const twitterService = require('../utils/twitterService');
const Tweet = require('../models/Tweet');
const schedule = require('node-schedule');

// Günlük zamanlanmış tweet işi
let tweetJob = null;

/**
 * Trend konuları getir
 */
exports.getTrendingTopics = async (req, res) => {
  try {
    const trends = await twitterService.getTrendingTopics();
    res.json(trends);
  } catch (error) {
    console.error('Trend konuları alınırken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Yapay zeka ile tweet oluştur ama paylaşma
 */
exports.generateTweet = async (req, res) => {
  try {
    // Trend konuları al
    const trends = await twitterService.getTrendingTopics();
    
    if (!trends || trends.length === 0) {
      return res.status(404).json({ message: 'Trend konular bulunamadı' });
    }
    
    // Tweet yanıtı oluştur
    const tweet = await twitterService.generateTweetResponse(trends);
    
    res.status(201).json(tweet);
  } catch (error) {
    console.error('Tweet oluşturulurken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Belirli bir tweeti Twitter'da paylaş
 */
exports.postTweet = async (req, res) => {
  try {
    const { tweetId } = req.params;
    
    const tweet = await twitterService.postTweet(tweetId);
    
    res.json({
      message: 'Tweet başarıyla paylaşıldı',
      tweet
    });
  } catch (error) {
    console.error('Tweet paylaşılırken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Tüm tweetleri getir
 */
exports.getAllTweets = async (req, res) => {
  try {
    const tweets = await Tweet.find().sort({ createdAt: -1 });
    res.json(tweets);
  } catch (error) {
    console.error('Tweetler alınırken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Belirli bir tweeti getir
 */
exports.getTweetById = async (req, res) => {
  try {
    const { tweetId } = req.params;
    
    const tweet = await Tweet.findById(tweetId);
    
    if (!tweet) {
      return res.status(404).json({ message: 'Tweet bulunamadı' });
    }
    
    res.json(tweet);
  } catch (error) {
    console.error('Tweet alınırken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Otomatik tweet oluşturma zamanlamasını başlat
 */
exports.startTweetSchedule = async (req, res) => {
  try {
    const { cronExpression = '0 0 * * *' } = req.body; // Varsayılan: Her gün gece yarısı (00:00)
    
    // Önceki zamanlayıcıyı iptal et
    if (tweetJob) {
      tweetJob.cancel();
    }
    
    // Yeni zamanlayıcı oluştur
    tweetJob = schedule.scheduleJob(cronExpression, async () => {
      try {
        console.log('Zamanlanmış tweet çalışıyor:', new Date());
        
        // Trend konuları al
        const trends = await twitterService.getTrendingTopics();
        
        if (!trends || trends.length === 0) {
          console.error('Trend konular bulunamadı');
          return;
        }
        
        // Tweet oluştur
        const tweet = await twitterService.generateTweetResponse(trends);
        
        // Tweeti paylaş
        await twitterService.postTweet(tweet._id);
        
        console.log('Zamanlanmış tweet paylaşıldı:', tweet.content);
      } catch (error) {
        console.error('Zamanlanmış tweet işi başarısız oldu:', error);
      }
    });
    
    res.json({
      message: 'Tweet zamanlayıcı başlatıldı',
      nextInvocation: tweetJob.nextInvocation()
    });
  } catch (error) {
    console.error('Tweet zamanlayıcı başlatılırken hata:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Otomatik tweet oluşturma zamanlamasını durdur
 */
exports.stopTweetSchedule = (req, res) => {
  try {
    if (tweetJob) {
      tweetJob.cancel();
      tweetJob = null;
      res.json({ message: 'Tweet zamanlayıcı durduruldu' });
    } else {
      res.status(400).json({ message: 'Tweet zamanlayıcı zaten durmuş durumda' });
    }
  } catch (error) {
    console.error('Tweet zamanlayıcı durdurulurken hata:', error);
    res.status(500).json({ message: error.message });
  }
}; 