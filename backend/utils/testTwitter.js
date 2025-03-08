/**
 * Twitter API Entegrasyonu Test Script
 * 
 * Bu script Twitter API entegrasyonunu test etmek için kullanılır.
 * Trend olan konuları alır, bir tweet oluşturur ve isterseniz paylaşabilir.
 * Ayrıca Twitter API kullanım limitlerini de kontrol edebilir.
 */

const dotenv = require('dotenv');
const twitterService = require('./twitterService');
const mongoose = require('mongoose');
const axios = require('axios');

// .env dosyasını yükle
dotenv.config();

// MongoDB bağlantısı
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sienna-carter', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    process.exit(1);
  }
}

// Twitter API kullanım limitlerini kontrol et
async function checkAPILimits() {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    const response = await axios.get('https://api.twitter.com/2/rate_limit_status', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    });
    
    console.log('Twitter API Kullanım Limitleri:');
    console.log('-----------------------------------------');
    
    // Trend limitleri
    const trendLimits = response.data.resources?.trends?.['/trends/place'];
    if (trendLimits) {
      console.log('Trend Limitleri:');
      console.log(`  Kalan: ${trendLimits.remaining}/${trendLimits.limit}`);
      console.log(`  Sıfırlanma: ${new Date(trendLimits.reset * 1000).toLocaleString()}`);
    }
    
    // Tweet arama limitleri
    const searchLimits = response.data.resources?.search?.['/search/tweets'];
    if (searchLimits) {
      console.log('Tweet Arama Limitleri:');
      console.log(`  Kalan: ${searchLimits.remaining}/${searchLimits.limit}`);
      console.log(`  Sıfırlanma: ${new Date(searchLimits.reset * 1000).toLocaleString()}`);
    }
    
    // Tweet gönderme limitleri
    const statusLimits = response.data.resources?.statuses?.['/statuses/update'];
    if (statusLimits) {
      console.log('Tweet Gönderme Limitleri:');
      console.log(`  Kalan: ${statusLimits.remaining}/${statusLimits.limit}`);
      console.log(`  Sıfırlanma: ${new Date(statusLimits.reset * 1000).toLocaleString()}`);
    }
    
    console.log('-----------------------------------------');
  } catch (error) {
    console.error('API limitleri kontrol edilirken hata:', error.response?.data || error.message);
  }
}

// Test fonksiyonu
async function testTwitter() {
  try {
    // Veritabanına bağlan
    await connectToDatabase();
    
    console.log('Twitter API entegrasyonu testi başlıyor...');
    
    // API limitlerini kontrol et
    await checkAPILimits();
    
    // Trend konuları al
    console.log('Trend konuları alınıyor...');
    const trends = await twitterService.getTrendingTopics();
    
    if (!trends || trends.length === 0) {
      console.error('Trend konular bulunamadı');
      process.exit(1);
    }
    
    console.log('Top 5 trend konular:');
    trends.slice(0, 5).forEach((trend, index) => {
      console.log(`${index + 1}. ${trend.name} (${trend.volume || 'N/A'} tweet)`);
    });
    
    // Tweet oluştur
    console.log('\nTweet oluşturuluyor...');
    const tweet = await twitterService.generateTweetResponse(trends);
    
    console.log('Oluşturulan tweet:');
    console.log('------------------');
    console.log(tweet.content);
    console.log('------------------');
    console.log(`Karakter sayısı: ${tweet.content.length}/280`);
    
    // Kullanıcıdan tweeti paylaşmak isteyip istemediğini sor
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\nBu tweeti Twitter\'da paylaşmak istiyor musunuz? (e/h): ', async (answer) => {
      if (answer.toLowerCase() === 'e') {
        console.log('Tweet paylaşılıyor...');
        
        try {
          const postedTweet = await twitterService.postTweet(tweet._id);
          console.log('Tweet başarıyla paylaşıldı!');
          console.log(`Tweet ID: ${postedTweet.tweetId}`);
          
          // API limitlerini tekrar kontrol et
          await checkAPILimits();
        } catch (error) {
          console.error('Tweet paylaşılırken hata:', error);
        }
      } else {
        console.log('Tweet paylaşılmadı.');
      }
      
      readline.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Test sırasında hata:', error);
    process.exit(1);
  }
}

// Komut satırı argümanlarını kontrol et
const args = process.argv.slice(2);
if (args.includes('--check-limits')) {
  // Sadece API limitlerini kontrol et
  checkAPILimits().then(() => process.exit(0));
} else {
  // Test fonksiyonunu çalıştır
  testTwitter();
} 