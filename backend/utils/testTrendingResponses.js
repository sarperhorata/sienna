/**
 * Trending Topic Test Script
 * 
 * Bu script ilk 3 trending topic'i, her biri için en popüler 2'şer tweet'i 
 * ve Sienna'nın bunlara vereceği potansiyel cevapları gösterir.
 * 
 * NOT: Twitter API token'ları doğrulanamadığı için şu an örnek veri kullanılıyor.
 */

const dotenv = require('dotenv');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// .env dosyasını yükle
dotenv.config();

// OpenAI istemcisi
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Örnek trend konuları döndürür (Twitter API erişilemez olduğunda)
 */
async function getTop3TrendingTopics() {
  try {
    // Örnek trend konular (gerçek verilerden alınmış)
    const top3Trends = [
      { name: '#BLACKPINK', volume: 247932 },
      { name: '#ArtsyApril', volume: 159325 },
      { name: '#WorldHealthDay', volume: 132456 }
    ];
    
    console.log('🔥 TOP 3 TRENDING TOPICS 🔥');
    console.log('===========================');
    console.log('(Örnek veriler - API erişimi olmadığından)')
    top3Trends.forEach((trend, index) => {
      console.log(`${index + 1}. ${trend.name} (${trend.volume || 'N/A'} tweet)`);
    });
    console.log('===========================\n');
    
    return top3Trends;
  } catch (error) {
    console.error('Trend konuları alınırken hata:', error);
    return [];
  }
}

/**
 * Örnek popüler tweetleri döndürür (Twitter API erişilemez olduğunda)
 */
async function getPopularTweetsForTrend(trendName, count = 2) {
  try {
    // Örnek tweet verileri
    const tweetData = {
      '#BLACKPINK': [
        {
          id: '1234567890',
          text: 'BLACKPINK\'s new album is incredible! I think it\'s their best work yet. #BLACKPINK',
          created_at: '2023-04-15T12:30:00Z',
          metrics: {
            like_count: 5423,
            retweet_count: 1243,
            reply_count: 654
          },
          author: {
            id: '987654321',
            username: 'kpop_lover',
            name: 'K-Pop Enthusiast'
          }
        },
        {
          id: '2345678901',
          text: 'BLACKPINK is coming to my city on their world tour! I\'ve already got tickets! So excited! #BLACKPINK #WorldTour',
          created_at: '2023-04-15T14:20:00Z',
          metrics: {
            like_count: 4231,
            retweet_count: 987,
            reply_count: 432
          },
          author: {
            id: '876543210',
            username: 'music_fan',
            name: 'Music Fanatic'
          }
        }
      ],
      '#ArtsyApril': [
        {
          id: '3456789012',
          text: 'Here\'s my latest painting for #ArtsyApril. I mixed watercolors and acrylics, what do you think? Open to critiques!',
          created_at: '2023-04-15T10:15:00Z',
          metrics: {
            like_count: 3254,
            retweet_count: 876,
            reply_count: 321
          },
          author: {
            id: '765432109',
            username: 'artistic_soul',
            name: 'Creative Mind'
          }
        },
        {
          id: '4567890123',
          text: 'Day 15 of the #ArtsyApril challenge: My piece on the theme "Nostalgia". Used a vintage style inspired by my childhood memories.',
          created_at: '2023-04-15T11:45:00Z',
          metrics: {
            like_count: 2987,
            retweet_count: 765,
            reply_count: 298
          },
          author: {
            id: '654321098',
            username: 'paint_master',
            name: 'Paint Everything'
          }
        }
      ],
      '#WorldHealthDay': [
        {
          id: '5678901234',
          text: 'Today is #WorldHealthDay! Grateful for all healthcare workers. Their dedication and work ensure we live in a healthier world.',
          created_at: '2023-04-15T09:30:00Z',
          metrics: {
            like_count: 8765,
            retweet_count: 3254,
            reply_count: 987
          },
          author: {
            id: '543210987',
            username: 'health_advocate',
            name: 'Health For All'
          }
        },
        {
          id: '6789012345',
          text: 'On #WorldHealthDay, I want to emphasize that mental health is just as important as physical health. Take care of yourself, make time for yourself.',
          created_at: '2023-04-15T08:45:00Z',
          metrics: {
            like_count: 7654,
            retweet_count: 2987,
            reply_count: 876
          },
          author: {
            id: '432109876',
            username: 'mental_health_matters',
            name: 'Mind & Body Balance'
          }
        }
      ]
    };
    
    // Trend için tweetleri döndür veya boş dizi
    return tweetData[trendName] || [];
  } catch (error) {
    console.error(`'${trendName}' için tweetler alınırken hata:`, error);
    return [];
  }
}

/**
 * Verilen tweet'e Sienna'nın cevap oluşturur
 */
async function generateSiennaResponse(tweet, trend) {
  try {
    // OpenAI prompt oluştur
    const prompt = `
    You are Sienna Carter, a famous social media personality.
    You write attention-grabbing and witty responses on Twitter.
    
    Write an attention-grabbing, witty, and charming response to the tweet below.
    The response should match your personality - smart, fun, and slightly flirtatious.
    Response must be under 280 characters.
    Use emojis where appropriate but don't overdo it.
    
    TRENDING TOPIC: ${trend.name}
    
    TWEET:
    ${tweet.author.name} (@${tweet.author.username}): ${tweet.text}
    
    RESPONSE:
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are Sienna Carter. A famous social media personality. Your Twitter comments are short, witty, and attention-grabbing." },
        { role: "user", content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.8
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating response:', error);
    return "Could not generate response due to API error.";
  }
}

/**
 * Tweet'leri güzelce formatla ve ekrana bas
 */
function displayTweet(tweet, index, trend) {
  const metrics = tweet.metrics;
  console.log(`${index}. TWEET (${trend.name})`);
  console.log(`🧑 ${tweet.author.name} (@${tweet.author.username})`);
  console.log(`💬 ${tweet.text}`);
  console.log(`❤️ ${metrics.like_count} 🔄 ${metrics.retweet_count} 💬 ${metrics.reply_count}`);
  console.log(`🔗 https://twitter.com/i/web/status/${tweet.id}`);
  console.log('---------------------------------------------------');
}

/**
 * Ana test fonksiyonu
 */
async function runTest() {
  try {
    console.log('Twitter Trending Topics ve Sienna Cevapları Testi Başlıyor...\n');
    
    // İlk 3 trend konuyu al
    const top3Trends = await getTop3TrendingTopics();
    
    if (top3Trends.length === 0) {
      console.log('Trend konular alınamadı!');
      return;
    }
    
    // Her trend için popüler tweetleri al ve cevaplar oluştur
    for (let i = 0; i < top3Trends.length; i++) {
      const trend = top3Trends[i];
      console.log(`\n🌟 TREND #${i+1}: ${trend.name} 🌟\n`);
      
      // Bu trend için popüler tweetleri al
      const popularTweets = await getPopularTweetsForTrend(trend.name);
      
      if (popularTweets.length === 0) {
        console.log(`Bu trend için tweet bulunamadı!`);
        continue;
      }
      
      // Her popüler tweet için
      for (let j = 0; j < popularTweets.length; j++) {
        const tweet = popularTweets[j];
        
        // Tweet'i göster
        displayTweet(tweet, j+1, trend);
        
        // Sienna'nın cevabını oluştur
        console.log('👱‍♀️ SIENNA\'NIN CEVABI:');
        const response = await generateSiennaResponse(tweet, trend);
        console.log(response);
        console.log(`📏 Karakter sayısı: ${response.length}/280`);
        console.log('===================================================\n');
      }
    }
    
    console.log('Test tamamlandı!');
  } catch (error) {
    console.error('Test sırasında hata:', error);
  }
}

// Testi çalıştır
runTest(); 