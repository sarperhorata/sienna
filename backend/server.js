const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const imageRoutes = require('./routes/image');
const paymentRoutes = require('./routes/payment');
const twitterRoutes = require('./routes/twitter');
const telegramRoutes = require('./routes/telegram');
const hashtagRoutes = require('./routes/hashtag');
const analyticsRoutes = require('./routes/analytics');

// Import services for scheduled tasks
const hashtagService = require('./services/hashtagService');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/hashtag', hashtagRoutes);
app.use('/api/analytics', analyticsRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Sienna Carter API is running');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sienna-carter', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  
  // Zamanlanmış görevleri başlat
  startScheduledTasks();
})
.catch(err => console.error('MongoDB connection error:', err));

// Zamanlanmış görevleri başlatan fonksiyon
function startScheduledTasks() {
  // Hashtag ve trend güncelleme görevlerini başlat
  hashtagService.scheduleUpdates();
  
  // İlk veritabanı doldurmak için manuel güncelleme yap
  // Dikkat: Bu, API çağrıları yapacak, limitiniz varsa yorum satırına alın
  // hashtagService.manualUpdate();
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 