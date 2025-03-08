/**
 * Manuel Google OAuth Token Alma Yardımcısı
 * 
 * Bu basit script, Google OAuth token'ı elle almanıza yardımcı olur.
 * Bu yaklaşım, redirect URL ile ilgili sorunlardan etkilenmez.
 * 
 * Kullanım:
 * 1. node utils/getManualToken.js komutunu çalıştırın
 * 2. Verilen URL'yi tarayıcınızda açın ve Google hesabınızla giriş yapın
 * 3. İzinleri onaylayın
 * 4. Yönlendirildiğiniz sayfadaki kodu (URL'deki "code" parametresi) kopyalayın
 * 5. Terminalde, kopyaladığınız kodu yapıştırın ve Enter tuşuna basın
 * 6. Refresh token konsola yazdırılacak ve .env-google-sample dosyasına kaydedilecek
 */

const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

dotenv.config();

// OAuth parametreleri
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/auth/google/callback"; // Google Cloud Console'da yapılandırılan URI
const SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary',
  'https://www.googleapis.com/auth/photoslibrary.appendonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata'
];

// Kimlik bilgilerini kontrol et
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n\x1b[31mHata: GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET değerlerini .env dosyanıza eklemelisiniz.\x1b[0m');
  console.log('Google Cloud Console\'dan bunları oluşturun ve .env dosyanıza ekleyin:');
  console.log('\x1b[33mGOOGLE_CLIENT_ID=your-client-id\x1b[0m');
  console.log('\x1b[33mGOOGLE_CLIENT_SECRET=your-client-secret\x1b[0m');
  process.exit(1);
}

// Yetkilendirme URL'sini oluştur
const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join('%20')}&response_type=code&access_type=offline&prompt=consent`;

// Kullanıcı arayüzü oluştur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n\x1b[32m=== MANUEL GOOGLE OAUTH TOKEN ALMA ===\x1b[0m\n');
console.log('\x1b[33m1. Aşağıdaki URL\'yi tarayıcınızda açın:\x1b[0m');
console.log('\x1b[36m%s\x1b[0m\n', authUrl);
console.log('\x1b[33m2. Google hesabınızla giriş yapın ve izinleri onaylayın\x1b[0m');
console.log('\x1b[33m3. Yönlendirildiğiniz URL\'den "code" parametresini kopyalayın\x1b[0m');
console.log('\x1b[33m   (URL şuna benzeyecek: http://localhost:3000/auth/google/callback?code=4/XXXX...)\x1b[0m');
console.log('\x1b[33m   Chrome\'da hatayı görebilirsiniz, ancak URL\'deki kodu kopyaladığınız sürece sorun yok\x1b[0m\n');

// Kullanıcıdan kodu iste
rl.question('\x1b[32mKopyaladığınız kodu buraya yapıştırın:\x1b[0m ', async (code) => {
  // Kodu temizle (URL'den direkt kopyalanmış olabilir)
  code = code.trim();
  
  // URL'den kopyalandıysa, "code=" kısmını çıkar
  if (code.includes('code=')) {
    const match = code.match(/code=([^&]+)/);
    if (match && match[1]) {
      code = match[1];
    }
  }
  
  if (!code) {
    console.error('\n\x1b[31mHata: Geçerli bir kod girmelisiniz.\x1b[0m');
    rl.close();
    process.exit(1);
  }
  
  console.log('\n\x1b[33mKod alındı, token talep ediliyor...\x1b[0m');
  
  try {
    // Token almak için istek gönder
    console.log('\n\x1b[33mGönderilen istek parametreleri:\x1b[0m');
    console.log(`- client_id: ${CLIENT_ID.substring(0, 10)}...`);
    console.log(`- client_secret: ${CLIENT_SECRET.substring(0, 5)}...`);
    console.log(`- code: ${code.substring(0, 10)}...`);
    console.log(`- redirect_uri: ${REDIRECT_URI}`);
    console.log(`- grant_type: authorization_code`);
    
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', 
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
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    if (!refresh_token) {
      console.error('\n\x1b[31mHata: refresh_token alınamadı!\x1b[0m');
      console.log('Lütfen tekrar deneyin ve "prompt=consent" parametresinin URL\'de olduğundan emin olun.');
      rl.close();
      process.exit(1);
    }
    
    // .env-google-sample dosyası oluştur
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
    
    console.log('\n\x1b[32m✓ Token başarıyla alındı!\x1b[0m');
    console.log('\n\x1b[33mRefresh Token:\x1b[0m');
    console.log('\x1b[36m%s\x1b[0m', refresh_token);
    console.log('\n\x1b[33m.env dosyanıza şunu ekleyin:\x1b[0m');
    console.log('\x1b[36mGOOGLE_REFRESH_TOKEN=%s\x1b[0m', refresh_token);
    console.log('\n\x1b[32m✓ Bu bilgiler .env-google-sample dosyasına da kaydedildi: %s\x1b[0m', envSamplePath);
    
  } catch (error) {
    console.error('\n\x1b[31mToken alınırken hata oluştu:\x1b[0m');
    if (error.response) {
      console.error('\x1b[31mSunucu yanıtı:\x1b[0m', JSON.stringify(error.response.data, null, 2));
      console.error('\x1b[31mDurum kodu:\x1b[0m', error.response.status);
      
      // Yaygın hataları açıkla
      if (error.response.data.error === 'invalid_grant') {
        console.log('\n\x1b[33mBu hata genellikle şu nedenlerden kaynaklanır:\x1b[0m');
        console.log('1. Kod zaten kullanıldı (her kod sadece bir kez kullanılabilir)');
        console.log('2. Kodun süresi doldu (kodlar yaklaşık 5 dakika geçerlidir)');
        console.log('3. Kod geçersiz veya yanlış girildi');
        console.log('\n\x1b[33mLütfen tekrar deneyin ve yeni bir kod alın.\x1b[0m');
      } else if (error.response.data.error === 'redirect_uri_mismatch') {
        console.log('\n\x1b[33mYönlendirme URI\'sı uyuşmazlığı:\x1b[0m');
        console.log(`- Kodda kullanılan: ${REDIRECT_URI}`);
        console.log('- Google Cloud Console\'da yapılandırdığınız URI\'yi kontrol edin');
        console.log('\n\x1b[33mBu ikisinin tam olarak aynı olması gerekir (sonundaki / dahil).\x1b[0m');
      }
    } else if (error.request) {
      console.error('\x1b[31mSunucudan yanıt alınamadı\x1b[0m');
    } else {
      console.error('\x1b[31mHata mesajı:\x1b[0m', error.message);
    }
    
    console.log('\n\x1b[33mTam URL\'den gelen kodu kullanmayı deneyin:\x1b[0m');
    console.log('1. Tarayıcıdaki yönlendirme URL\'sinin tamamını kopyalayın');
    console.log('2. Scripti yeniden çalıştırın');
    console.log('3. URL\'yi olduğu gibi yapıştırın (script "code=" parametresini otomatik olarak çıkaracaktır)');
  }
  
  rl.close();
}); 