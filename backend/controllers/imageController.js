const { OpenAI } = require('openai');
const Image = require('../models/Image');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const imageTraining = require('../utils/imageTraining');
const pythonBridge = require('../utils/pythonBridge');
const User = require('../models/User');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get all public images
exports.getPublicImages = async (req, res) => {
  try {
    const images = await Image.find({ public: true, nsfw: false }).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get premium images (requires premium subscription)
exports.getPremiumImages = async (req, res) => {
  try {
    const images = await Image.find({ premium: true, nsfw: false }).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get NSFW images (requires premium subscription)
exports.getNsfwImages = async (req, res) => {
  try {
    const images = await Image.find({ nsfw: true }).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single image by ID
exports.getImageById = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Check if image is public or user has purchased it
    const isPurchased = req.user.purchasedImages.includes(image._id);
    const isPremium = req.user.subscriptionStatus === 'premium';
    
    if (!image.public && !isPurchased && !isPremium) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ image });
  } catch (error) {
    console.error('Get image by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate image with AI
exports.generateImage = async (req, res) => {
  try {
    const { 
      prompt, 
      title, 
      description, 
      price, 
      premium = false, 
      public = true, 
      nsfw = false, 
      useEnhanced = false,
      usePythonGeneration = false
    } = req.body;

    // Check if user is premium for nsfw content
    if (nsfw) {
      const user = await User.findById(req.user.id);
      if (!user || user.subscriptionStatus !== 'premium') {
        return res.status(403).json({ message: 'Premium subscription required for NSFW content' });
      }
    }
    
    let result;
    
    if (useEnhanced) {
      // Use the enhanced image generation
      result = await imageTraining.generateEnhancedImage({
        customPrompt: prompt,
        isAdvanced: true,
        nsfw: nsfw ? 'suggestive' : 'none',
        usePythonGeneration
      });
    } else if (usePythonGeneration) {
      // Use direct Python generation
      result = await pythonBridge.generateImageWithPython('generate_image.py', {
        customPrompt: prompt,
        nsfw: nsfw ? 'suggestive' : 'none'
      });
    } else {
      // Use standard DALL-E generation
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      });

      const imageUrl = response.data[0].url;
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imageResponse.data, 'binary');
      
      // Create directory if it doesn't exist
      const imageDir = path.join(__dirname, '../../public/images');
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }
      
      // Save image to disk
      const filename = `image_${Date.now()}.png`;
      const filepath = path.join(imageDir, filename);
      fs.writeFileSync(filepath, buffer);
      
      result = {
        success: true,
        imageUrl: `/images/${filename}`,
        prompt
      };
    }
    
    if (!result.success) {
      return res.status(500).json({ message: result.message || 'Failed to generate image' });
    }

    // Save image metadata to database
    const newImage = new Image({
      url: result.imageUrl,
      prompt: result.prompt,
      title: title || 'Untitled',
      description: description || prompt,
      price: price || 4.99,
      premium,
      public,
      nsfw,
      generationMethod: usePythonGeneration ? 'python' : (useEnhanced ? 'enhanced' : 'standard'),
      creator: req.user.id
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ message: error.message });
  }
};

// Generate enhanced image with specific options
exports.generateEnhancedImage = async (req, res) => {
  try {
    const {
      background,
      action,
      emotion,
      cameraShot,
      cameraAngle,
      bodyShape,
      breastSize,
      clothing,
      clothingColor,
      nsfw,
      customPrompt,
      isAdvanced,
      title,
      description,
      price,
      premium = true,
      public = true,
      usePythonGeneration = false
    } = req.body;

    // Check if user is premium for nsfw content
    if (nsfw && nsfw !== 'none') {
      const user = await User.findById(req.user.id);
      if (!user || user.subscriptionStatus !== 'premium') {
        return res.status(403).json({ message: 'Premium subscription required for NSFW content' });
      }
    }

    const result = await imageTraining.generateEnhancedImage({
      background,
      action,
      emotion,
      cameraShot,
      cameraAngle,
      bodyShape,
      breastSize,
      clothing,
      clothingColor,
      nsfw,
      customPrompt,
      isAdvanced,
      usePythonGeneration
    });

    if (!result.success) {
      return res.status(500).json({ message: result.message || 'Failed to generate enhanced image' });
    }

    // Save image metadata to database
    const newImage = new Image({
      url: result.imageUrl,
      prompt: result.prompt,
      title: title || 'Sienna Carter Enhanced Image',
      description: description || `Enhanced image of Sienna Carter with ${action || ''} ${emotion || ''} ${background || ''}`,
      price: price || 9.99,
      premium,
      public,
      nsfw: nsfw && nsfw !== 'none',
      generationMethod: usePythonGeneration ? 'python-enhanced' : 'enhanced',
      creator: req.user.id
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error('Error generating enhanced image:', error);
    res.status(500).json({ message: error.message });
  }
};

// Generate image using Python directly
exports.generatePythonImage = async (req, res) => {
  try {
    const {
      background,
      action,
      emotion,
      cameraShot,
      cameraAngle,
      bodyShape,
      clothing,
      clothingColor,
      nsfw,
      customPrompt,
      title,
      description,
      price,
      premium = true,
      public = true
    } = req.body;

    // Check if user is premium for nsfw content
    if (nsfw && nsfw !== 'none') {
      const user = await User.findById(req.user.id);
      if (!user || user.subscriptionStatus !== 'premium') {
        return res.status(403).json({ message: 'Premium subscription required for NSFW content' });
      }
    }

    // Check if Python environment is ready
    const isPythonReady = await pythonBridge.checkPythonEnvironment();
    if (!isPythonReady) {
      return res.status(500).json({ 
        message: 'Python environment is not properly set up. Please try the standard generation.',
        statusCode: 'PYTHON_NOT_AVAILABLE'
      });
    }

    // Generate the image
    const result = await pythonBridge.generateImageWithPython('generate_image.py', {
      background,
      action,
      emotion,
      cameraShot,
      cameraAngle,
      bodyShape,
      clothing,
      clothingColor,
      nsfw: nsfw || 'none',
      customPrompt
    });

    if (!result.success) {
      return res.status(500).json({ message: result.message || 'Failed to generate image with Python' });
    }

    // Save image metadata to database
    const newImage = new Image({
      url: result.imageUrl,
      prompt: customPrompt || `Generated image with ${action || ''} ${emotion || ''} ${background || ''}`,
      title: title || 'Sienna Carter Python Image',
      description: description || `Python-generated image of Sienna Carter with ${action || ''} ${emotion || ''} ${background || ''}`,
      price: price || 9.99,
      premium,
      public,
      nsfw: nsfw && nsfw !== 'none',
      generationMethod: 'python',
      creator: req.user.id
    });

    await newImage.save();
    res.status(201).json(newImage);
  } catch (error) {
    console.error('Error generating Python image:', error);
    res.status(500).json({ message: error.message });
  }
};

// Train a new model (admin only)
exports.trainModel = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required for model training' });
    }

    const result = await imageTraining.trainModel();
    
    if (!result.success) {
      return res.status(500).json({ message: result.message || 'Failed to train model' });
    }
    
    res.json({ 
      message: 'Model training completed successfully',
      promptTemplates: result.promptTemplates
    });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({ message: error.message });
  }
}; 