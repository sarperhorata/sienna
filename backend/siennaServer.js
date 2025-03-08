const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Dizin kontrolü
const publicDir = path.join(__dirname, 'public');
const imgDir = path.join(publicDir, 'img');
const cssDir = path.join(publicDir, 'css');
const jsDir = path.join(publicDir, 'js');

// Gerekli dizinlerin varlığından emin ol
[publicDir, imgDir, cssDir, jsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Varsayılan default-avatar.jpg ve default-profile.jpg dosyalarını oluştur
if (!fs.existsSync(path.join(imgDir, 'default-avatar.jpg'))) {
  fs.writeFileSync(path.join(imgDir, 'default-avatar.jpg'), 'Placeholder');
  console.log('📷 Created placeholder default-avatar.jpg');
}

if (!fs.existsSync(path.join(imgDir, 'default-profile.jpg'))) {
  fs.writeFileSync(path.join(imgDir, 'default-profile.jpg'), 'Placeholder');
  console.log('📷 Created placeholder default-profile.jpg');
}

// CORS ayarları - tüm kaynaklara izin ver
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin']
}));

// Ek CORS başlıkları için middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// İstek gövdesi ayrıştırma
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev')); // Logging

// Statik dosya servisini yapılandır
app.use('/', express.static(path.join(__dirname, 'public'), {
  dotfiles: 'ignore',
  etag: true,
  index: 'index.html',
  maxAge: '1d',
  setHeaders: function (res, path, stat) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}));

// API rotalarını içe aktar
const siennaRoutes = require('./routes/siennaRoutes');

// API rotalarını kullan
app.use('/api/sienna', siennaRoutes);

// Ana sayfa ve SPA rotalandırması
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OPTIONS istekleri için destek
app.options('*', cors());

// Catch-all route (SPA için)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Hata yakalayıcı
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// Sunucuyu başlat
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ Sienna Carter GPT Server running on port ${PORT}`);
  console.log(`📝 API endpoints: http://localhost:${PORT}/api/sienna`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  console.log(`🌐 Alternative access: http://127.0.0.1:${PORT}`);
  
  // Kullanıcının ağ IP'sini göster
  console.log(`💻 Try also with your local IP: http://[your local IP]:${PORT}`);

  // Alternatif port bilgisi
  if (PORT !== 3000) {
    console.log(`🔄 If port ${PORT} is not working, try port 3000: http://localhost:3000`);
  } else {
    console.log(`🔄 If port 3000 is not working, try port 5000: http://localhost:5000`);
  }
});

// Hata yönetimi
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use. Try running on a different port by setting PORT in .env file`);
    console.log(`Try running with: PORT=5000 node siennaServer.js`);
  } else {
    console.error('Server error:', err);
  }
}); 