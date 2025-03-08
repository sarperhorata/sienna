const axios = require('axios');
const { Client } = require('twitter-api-sdk');
const OpenAI = require('openai');
const Tweet = require('../models/Tweet');

// OpenAI istemcisi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Twitter istemcisi oluşturma
let twitterClient = null;

/**
 * Twitter API istemcisini yapılandırır
 */
function setupTwitterClient() {
  try {
    twitterClient = new Client(process.env.TWITTER_BEARER_TOKEN);
    return true;
  } catch (error) {
    console.error('Twitter istemcisi oluşturulurken hata:', error);
    return false;
  }
}

/**
 * ABD'deki trend olan konuları getirir
 * Önbellek süresi: 1 saat
 */
const trendCache = {
  data: null,
  timestamp: null,
  maxAge: 60 * 60 * 1000 // 1 saat (milisaniye cinsinden)
};

async function getTrendingTopics() {
  try {
    // Önbellekteki veri hala geçerliyse, onu kullan
    const now = Date.now();
    if (trendCache.data && trendCache.timestamp && (now - trendCache.timestamp < trendCache.maxAge)) {
      console.log('Önbellekten trend konuları kullanılıyor');
      return trendCache.data;
    }

    if (!twitterClient) {
      const success = setupTwitterClient();
      if (!success) {
        throw new Error('Twitter client kurulumu başarısız oldu');
      }
    }

    // US WOEID: 23424977
    const response = await twitterClient.trends.trendsPlace('23424977');
    
    // İlk 10 trendi al
    const trends = response.data[0].trends.slice(0, 10).map(trend => ({
      name: trend.name,
      volume: trend.tweet_volume || 0
    }));
    
    // Sonuçları önbelleğe al
    trendCache.data = trends;
    trendCache.timestamp = now;
    
    return trends;
  } catch (error) {
    console.error('Trend konuları alınırken hata:', error);
    // Hata durumunda, önbellekte veri varsa onu kullan, yoksa boş dizi döndür
    return trendCache.data || [];
  }
}

// Tweet örnekleri için önbellek
const tweetCache = {
  data: {},
  timestamp: {},
  maxAge: 30 * 60 * 1000 // 30 dakika (milisaniye cinsinden)
};

/**
 * Bir trend ile ilgili örnek tweetleri getirir
 */
async function getTweetsForTrend(trendName, count = 5) {
  try {
    // Önbellekteki veri hala geçerliyse, onu kullan
    const now = Date.now();
    if (tweetCache.data[trendName] && tweetCache.timestamp[trendName] && 
       (now - tweetCache.timestamp[trendName] < tweetCache.maxAge)) {
      console.log(`'${trendName}' trendi için önbellekten tweetler kullanılıyor`);
      return tweetCache.data[trendName].slice(0, count);
    }

    if (!twitterClient) {
      const success = setupTwitterClient();
      if (!success) {
        throw new Error('Twitter client kurulumu başarısız oldu');
      }
    }

    const response = await twitterClient.tweets.tweetsRecentSearch({
      query: trendName,
      max_results: count,
      "tweet.fields": ["author_id", "created_at", "text", "public_metrics"]
    });
    
    // Sonuçları önbelleğe al
    tweetCache.data[trendName] = response.data || [];
    tweetCache.timestamp[trendName] = now;
    
    return response.data;
  } catch (error) {
    console.error(`'${trendName}' için tweetler alınırken hata:`, error);
    // Hata durumunda, önbellekte veri varsa onu kullan, yoksa boş dizi döndür
    return tweetCache.data[trendName] || [];
  }
}

/**
 * Trendlerden ve örnek tweetlerden bir yanıt oluşturur
 */
async function generateTweetResponse(trends) {
  try {
    // En popüler 3 trend için tweetleri al
    const topTrends = trends.slice(0, 3);
    let tweetExamples = [];
    
    for (const trend of topTrends) {
      const tweets = await getTweetsForTrend(trend.name, 3);
      if (tweets.length > 0) {
        tweetExamples.push({
          trend: trend.name,
          tweets: tweets.map(t => t.text)
        });
      }
    }
    
    // Trend ve tweet örneklerini birleştir
    const trendData = tweetExamples.map(item => {
      return `TREND: ${item.trend}\nTWEETLER:\n${item.tweets.join('\n')}\n`;
    }).join('\n');
    
    // OpenAI prompt oluştur
    const prompt = `
    Sen Sienna Carter'sın, ünlü bir sosyal medya kişiliği. 
    Twitter'da trend olan konular hakkında dikkat çekici ve zekice yanıtlar yazıyorsun.
    
    Aşağıdaki trend olan konular ve örnek tweetler hakkında dikkat çekici ve ilgi uyandırıcı bir tweet yaz.
    Tweet, senin kişiliğine uygun olmalı - zeki, eğlenceli ve biraz çekici.
    Tweet kesinlikle 280 karakteri geçmemeli.
    Mümkünse emoji kullan ama aşırıya kaçma. Hashtag kullanabilirsin.
    
    TREND KONULARI VE ÖRNEK TWEETLER:
    ${trendData}
    
    TWEET:
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Sen Sienna Carter'sın. Sosyal medyada ünlü bir kişilik." },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });
    
    const generatedTweet = response.choices[0].message.content.trim();
    
    // Veritabanına kaydet
    const newTweet = new Tweet({
      content: generatedTweet,
      prompt: prompt,
      trends: topTrends,
      posted: false
    });
    
    await newTweet.save();
    
    return newTweet;
  } catch (error) {
    console.error('Tweet oluşturulurken hata:', error);
    throw error;
  }
}

/**
 * Oluşturulan tweeti Twitter'da paylaş
 */
async function postTweet(tweetId) {
  try {
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      throw new Error('Tweet bulunamadı');
    }
    
    // Twitter API v2 için client oluştur
    const userClient = new Client(process.env.TWITTER_ACCESS_TOKEN);
    
    // Tweeti gönder
    const response = await userClient.tweets.createTweet({
      text: tweet.content
    });
    
    // Tweet bilgilerini güncelle
    tweet.posted = true;
    tweet.postTime = new Date();
    tweet.tweetId = response.data.id;
    await tweet.save();
    
    return tweet;
  } catch (error) {
    console.error('Tweet paylaşılırken hata:', error);
    throw error;
  }
}

/**
 * En son tweetleri getirir
 */
async function getRecentTweets(limit = 10) {
  try {
    const tweets = await Tweet.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return tweets;
  } catch (error) {
    console.error('Son tweetler alınırken hata:', error);
    return [];
  }
}

module.exports = {
  getTrendingTopics,
  getTweetsForTrend,
  generateTweetResponse,
  postTweet,
  getRecentTweets
}; 