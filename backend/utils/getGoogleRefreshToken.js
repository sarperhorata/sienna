/**
 * Google OAuth Refresh Token Helper
 * 
 * Bu script Google OAuth refresh token almanıza yardımcı olur.
 * 
 * Kullanım:
 * 1. Google Cloud Console'dan uygulamanızı oluşturun ve gerekli API'leri etkinleştirin
 * 2. .env dosyanıza GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET ekleyin
 * 3. Google Cloud Console'da tanımladığınız yönlendirme URI'sini kontrol edin ve bu dosyada REDIRECT_URI değerini eşleşecek şekilde güncelleyin
 * 4. npm run auth:google komutunu çalıştırın (veya "node utils/getGoogleRefreshToken.js")
 * 5. Tarayıcıda açılan sayfada Google hesabınızla giriş yapın ve izinleri onaylayın
 * 6. Alınan refresh token'ı .env dosyanıza ekleyin
 * 
 * Not: Port çakışması olursa, PORT=3334 npm run auth:google şeklinde alternatif port belirtebilirsiniz.
 * Önemli: Eğer portu değiştirirseniz, Google Cloud Console'da tanımlı olan redirect_uri ile eşleşmeyecektir!
 */

const express = require('express');
const openBrowser = require('open');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

// OAuth parametreleri
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = process.env.PORT || 3000; // Varsayılan port 3000
const USE_STATIC_URI = process.env.USE_STATIC_URI === 'true'; // Static URI kullanma seçeneği

// ÖNEMLİ: Bu URI'yi Google Cloud Console'da tanımladığınız "Yetkili yönlendirme URI'leri" ile tam olarak eşleşecek şekilde ayarlayın
// Eğer Google Cloud Console'da "http://localhost:3000/auth/google/callback" şeklinde tanımladıysanız, aşağıdaki gibi olmalı:
const REDIRECT_URI = USE_STATIC_URI 
  ? "http://localhost:3000/auth/google/callback" // Statik URI (Google Cloud Console'da tanımlı olan ile aynı olmalı)
  : `http://localhost:${PORT}/auth/google/callback`; // Dinamik URI

// Bilgi mesajı ekle
if (process.env.PORT && process.env.PORT !== '3000' && !USE_STATIC_URI) {
  console.log('\n\x1b[33mUyarı: Farklı bir port kullanıyorsunuz, ancak Google Cloud Console\'da tanımlı olan yönlendirme URI\'si muhtemelen 3000 portu için yapılandırılmıştır.\x1b[0m');
  console.log('\x1b[33mEğer "redirect_uri_mismatch" hatası alırsanız, aşağıdaki komutu deneyin:\x1b[0m');
  console.log('\x1b[36mUSE_STATIC_URI=true npm run auth:google\x1b[0m\n');
}

const SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary',
  'https://www.googleapis.com/auth/photoslibrary.appendonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata'
];

// Giriş bilgilerini kontrol et
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\x1b[31mHata: GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET değerlerini .env dosyanıza eklemelisiniz.\x1b[0m');
  console.log('Google Cloud Console\'dan bunları oluşturun ve .env dosyanıza ekleyin:');
  console.log('\x1b[33mGOOGLE_CLIENT_ID=your-client-id\x1b[0m');
  console.log('\x1b[33mGOOGLE_CLIENT_SECRET=your-client-secret\x1b[0m');
  process.exit(1);
}

// Express uygulaması oluştur
const app = express();

// Ana sayfa
app.get('/', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join('%20')}&response_type=code&access_type=offline&prompt=consent`;
  
  res.send(`
    <html>
      <head>
        <title>Google Photos API Yetkilendirme</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #4285F4; }
          .button {
            display: inline-block;
            background: #4285F4;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: bold;
          }
          pre { background: #f6f8fa; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Google Photos API Yetkilendirme</h1>
        <p>Bu araç, Google Photos API için refresh token almanıza yardımcı olur.</p>
        <p>Aşağıdaki düğmeye tıklayarak Google hesabınızla giriş yapın ve gerekli izinleri verin.</p>
        <a href="${authUrl}" class="button">Google ile Yetkilendir</a>
      </body>
    </html>
  `);
});

// Callback endpoint
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    return res.status(400).send('Yetkilendirme kodu eksik');
  }
  
  try {
    // Token almak için istek gönder
    console.log('Authorization kodu alındı, token talep ediliyor...');
    
    let tokenResponse;
    try {
      tokenResponse = await axios.post('https://oauth2.googleapis.com/token', 
        // Form verileri (application/x-www-form-urlencoded formatında)
        new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
    } catch (tokenError) {
      console.error('\n\x1b[31mToken alınırken hata oluştu:\x1b[0m');
      if (tokenError.response) {
        console.error('\x1b[31mSunucu yanıtı:\x1b[0m', tokenError.response.data);
        console.error('\x1b[31mDurum kodu:\x1b[0m', tokenError.response.status);
      } else if (tokenError.request) {
        console.error('\x1b[31mSunucudan yanıt alınamadı\x1b[0m');
      } else {
        console.error('\x1b[31mHata mesajı:\x1b[0m', tokenError.message);
      }
      
      throw new Error('Token alınamadı. Lütfen tekrar deneyin.');
    }
    
    if (!tokenResponse || !tokenResponse.data || !tokenResponse.data.refresh_token) {
      console.error('\n\x1b[31mHata: refresh_token alınamadı\x1b[0m');
      throw new Error('Refresh token alınamadı. Lütfen tekrar deneyin.');
    }
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    console.log('\n\x1b[32m✓ Token başarıyla alındı!\x1b[0m');
    
    // Bir .env-sample dosyası oluştur
    const envSamplePath = path.join(__dirname, '../.env-google-sample');
    const envSampleContent = `
# Google Photos API Credentials
GOOGLE_CLIENT_ID=${CLIENT_ID}
GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}
GOOGLE_REFRESH_TOKEN=${refresh_token}
GOOGLE_REDIRECT_URI=${REDIRECT_URI}

# Google Photos Config
GOOGLE_PHOTOS_ALBUM_NAME=Sienna's AI Generated Images
`;

    // Dosyayı kaydet
    fs.writeFileSync(envSamplePath, envSampleContent);
    console.log(`\n\x1b[32m✓ .env-google-sample dosyası oluşturuldu: ${envSamplePath}\x1b[0m`);
    
    // Başarı sayfası
    res.send(`
      <html>
        <head>
          <title>Yetkilendirme Başarılı</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #0F9D58; }
            .success { color: #0F9D58; font-weight: bold; }
            .token-box { 
              background: #f6f8fa; 
              padding: 15px; 
              border-radius: 5px; 
              overflow-wrap: break-word;
              word-break: break-all;
              margin: 20px 0;
            }
            .instructions { background: #fff8e1; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Yetkilendirme Başarılı!</h1>
          <p class="success">✅ Google Photos API için refresh token başarıyla alındı.</p>
          
          <h2>Refresh Token</h2>
          <div class="token-box">${refresh_token}</div>
          
          <h2>Sonraki Adımlar</h2>
          <div class="instructions">
            <p>1. Bu refresh token'ı <code>.env</code> dosyanıza ekleyin:</p>
            <pre>GOOGLE_REFRESH_TOKEN=${refresh_token}</pre>
            
            <p>2. Token'ınız güvende olsun! Bu token Google Photos hesabınıza erişim sağlar.</p>
            
            <p>3. Bu tarayıcı penceresini kapatabilir ve terminal'e dönebilirsiniz.</p>
          </div>
        </body>
      </html>
    `);
    
    // Konsola bilgi yazdır
    console.log('\n\x1b[32m✓ Google OAuth yetkilendirmesi başarılı!\x1b[0m');
    console.log('\n\x1b[33mRefresh Token:\x1b[0m');
    console.log('\x1b[36m%s\x1b[0m', refresh_token);
    console.log('\n\x1b[33m.env dosyanıza şunu ekleyin:\x1b[0m');
    console.log('\x1b[36mGOOGLE_REFRESH_TOKEN=%s\x1b[0m', refresh_token);
    console.log('\n\x1b[32m✓ Bu bilgiler .env-google-sample dosyasına da kaydedildi.\x1b[0m')

    // Kullanıcıya sunucuyu kapatabileceğini bildir
    console.log('\n\x1b[33m5 saniye sonra sunucu otomatik olarak kapanacak...\x1b[0m');
    
    // 5 saniye sonra sunucuyu kapat
    setTimeout(() => {
      console.log('\n\x1b[32m✓ İşlem tamamlandı. Sunucu kapatılıyor...\x1b[0m');
      server.close(() => {
        process.exit(0);
      });
    }, 5000);
    
  } catch (error) {
    console.error('Token alınırken hata oluştu:', error.response?.data || error.message);
    res.status(500).send(`
      <html>
        <head>
          <title>Yetkilendirme Hatası</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #EA4335; }
            .error { color: #EA4335; }
            pre { background: #f6f8fa; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Yetkilendirme Hatası</h1>
          <p class="error">Token alınırken bir hata oluştu:</p>
          <pre>${JSON.stringify(error.response?.data || error.message, null, 2)}</pre>
        </body>
      </html>
    `);
  }
});

// Sunucuyu başlat
const server = app.listen(PORT, () => {
  console.log(`\n\x1b[32m✓ OAuth sunucusu başlatıldı: http://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[33mKullanılan yönlendirme URI'si: ${REDIRECT_URI}\x1b[0m`);
  console.log('\x1b[33mTarayıcınız otomatik olarak açılacak. Açılmazsa yukarıdaki URL\'yi ziyaret edin.\x1b[0m');
  
  // Port ve URI uyumsuzluğu kontrolü
  if (PORT !== 3000 && !USE_STATIC_URI) {
    console.log('\n\x1b[33mÖnemli Not: Farklı bir port kullanıyorsunuz. Eğer Google Cloud Console\'da yönlendirme URI\'niz "http://localhost:3000/auth/google/callback" olarak tanımlıysa, redirect_uri_mismatch hatası alabilirsiniz.\x1b[0m');
    console.log('\x1b[33mBu durumda statik URI kullanın:\x1b[0m');
    console.log('\x1b[36mUSE_STATIC_URI=true npm run auth:google\x1b[0m\n');
  }
  
  // Tarayıcıyı otomatik aç
  try {
    openBrowser(`http://localhost:${PORT}`);
  } catch (err) {
    console.log('\x1b[33mTarayıcı otomatik olarak açılamadı. Lütfen manuel olarak şu URL\'yi ziyaret edin:\x1b[0m');
    console.log(`\x1b[36mhttp://localhost:${PORT}\x1b[0m\n`);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n\x1b[31mHata: ${PORT} portu zaten kullanımda.\x1b[0m`);
    console.log('\x1b[33mFarklı bir port ile tekrar deneyin:\x1b[0m');
    console.log(`\x1b[36mPORT=3334 USE_STATIC_URI=true npm run auth:google\x1b[0m\n`);
    process.exit(1);
  } else {
    console.error(`\n\x1b[31mSunucu başlatılırken hata:\x1b[0m`, err);
    process.exit(1);
  }
}); 