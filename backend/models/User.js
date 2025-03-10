const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  profileImage: {
    type: String,
    default: 'default-profile.png'
  },
  preferredLanguage: {
    type: String,
    enum: ['tr', 'en', 'de', 'fr', 'es'],
    default: 'tr'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  subscriptionStatus: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free',
  },
  userScore: {
    type: Number,
    default: 70, // Default score for new users
    min: 0,
    max: 100
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['none', 'telegram', 'whatsapp', 'email'],
    default: 'none'
  },
  telegramId: {
    type: String
  },
  whatsappNumber: {
    type: String
  },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  contentPreferences: {
    categories: [String],  // Tercih edilen içerik kategorileri
    tags: [String]        // İlgi alanları
  },
  socialMediaAccounts: {
    twitter: String,
    instagram: String,
    facebook: String,
    tiktok: String,
    linkedin: String,
    youtube: String,
    other: String
  },
  stripeCustomerId: {
    type: String,
  },
  purchasedImages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
  }],
  chatHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  }],
  deviceInfo: [{
    deviceId: String,
    deviceType: String,  // mobile, tablet, desktop
    browser: String,
    os: String,
    lastLogin: Date
  }],
  referrals: [{
    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dateReferred: {
      type: Date,
      default: Date.now
    },
    bonusApplied: {
      type: Boolean,
      default: false
    }
  }],
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: {
    type: Date
  },
  lastActivity: {
    type: Date
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to calculate user's current price tier
UserSchema.methods.getPriceTier = function() {
  if (this.userScore >= 80) return 'LOW';     // 80-100 arası düşük fiyat
  if (this.userScore >= 40) return 'MEDIUM';  // 40-79 arası orta fiyat
  return 'HIGH';                              // 0-39 arası yüksek fiyat
};

// Method to check if user is active
UserSchema.methods.isActive = function() {
  if (!this.lastActivity) return false;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.lastActivity > thirtyDaysAgo;
};

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to find active users
UserSchema.statics.findActiveUsers = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({ lastActivity: { $gte: thirtyDaysAgo } });
};

const User = mongoose.model('User', UserSchema);

module.exports = User; 