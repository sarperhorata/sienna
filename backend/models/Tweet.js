const mongoose = require('mongoose');

const TweetSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 280
  },
  prompt: {
    type: String,
    required: true
  },
  trends: [{
    name: String,
    volume: Number
  }],
  posted: {
    type: Boolean,
    default: false
  },
  postTime: {
    type: Date,
    default: null
  },
  tweetId: {
    type: String,
    default: null
  },
  engagement: {
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    replies: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tweet', TweetSchema); 