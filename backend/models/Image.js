const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  isNSFW: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  metadata: {
    background: String,
    action: String,
    emotion: String,
    cameraShot: String,
    cameraAngle: String,
    bodyShape: String,
    breastSize: String,
    clothing: String,
    clothingColor: String,
    nsfw: String,
    customPrompt: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Image = mongoose.model('Image', ImageSchema);

module.exports = Image; 