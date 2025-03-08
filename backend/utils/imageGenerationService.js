/**
 * Image Generation Service
 * 
 * This service handles generating images using OpenAI's DALL-E 
 * and uploading them to Google Photos.
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const googlePhotosService = require('./googlePhotosService');
const dotenv = require('dotenv');

dotenv.config();

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Base directory for saving images
const IMAGES_DIR = path.join(__dirname, '../generated-images');

// Create images directory if it doesn't exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Generate an image using DALL-E and save it locally
 * @param {string} prompt - The text prompt for image generation
 * @param {string} size - Image size (e.g., '1024x1024')
 * @returns {Promise<string>} - Path to the saved image
 */
const generateImage = async (prompt, size = '1024x1024') => {
  try {
    console.log(`Generating image with prompt: "${prompt}"`);
    
    // Generate image with DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
    });
    
    const imageUrl = response.data[0].url;
    
    // Download the image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResponse.data);
    
    // Create a unique filename
    const timestamp = Date.now();
    const imageName = `sienna_image_${timestamp}.png`;
    const imagePath = path.join(IMAGES_DIR, imageName);
    
    // Save the image
    fs.writeFileSync(imagePath, buffer);
    console.log(`Image saved to: ${imagePath}`);
    
    return imagePath;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
};

/**
 * Generate image based on trending topic and tweet
 * @param {Object} trend - Trending topic object
 * @param {Object} tweet - Tweet object
 * @returns {Promise<string>} - Path to generated image
 */
const generateImageForTrend = async (trend, tweet) => {
  // Create a prompt based on the trending topic and tweet
  const prompt = `Create an aesthetically beautiful, shareable image for social media that visualizes the following tweet:
  
Tweet: "${tweet.text}"
Topic: ${trend.name}

The image should:
- Have a modern, clean design with a lifestyle/fashion appeal
- Include subtle branding for "Sienna Carter"
- Be visually engaging and fit for Instagram/Twitter
- Evoke emotion related to the tweet's content
- Use colors and imagery that complement the topic
- NOT include the actual tweet text in the image
- Be suitable for a fashion/lifestyle influencer's feed`;

  return await generateImage(prompt);
};

/**
 * Generate an image and upload it to Google Photos
 * @param {string} prompt - The text prompt for image generation
 * @param {string} albumTitle - Google Photos album title (created if doesn't exist)
 * @param {string} description - Image description
 * @returns {Promise<Object>} - Uploaded image data
 */
const generateAndUploadImage = async (prompt, albumTitle = "Sienna's AI Images", description = null) => {
  try {
    // Generate the image
    const imagePath = await generateImage(prompt);
    
    // Get or create the album
    const album = await googlePhotosService.getOrCreateAlbumByTitle(albumTitle);
    
    // Upload to Google Photos
    const uploadedImage = await googlePhotosService.uploadImageToGooglePhotos(
      imagePath,
      album.id,
      description || `Generated image for: ${prompt}`
    );
    
    // Return results
    return {
      localPath: imagePath,
      googlePhotosUrl: uploadedImage.productUrl,
      albumTitle: album.title,
      albumId: album.id,
    };
  } catch (error) {
    console.error('Error generating and uploading image:', error);
    throw error;
  }
};

/**
 * Generate and upload an image for a trending topic and tweet
 * @param {Object} trend - Trending topic object
 * @param {Object} tweet - Tweet object
 * @returns {Promise<Object>} - Results including image paths and URLs
 */
const generateAndUploadImageForTrend = async (trend, tweet) => {
  try {
    // Create an album name based on the trend
    const albumTitle = `Sienna's ${trend.name.replace('#', '')} Images`;
    
    // Create description
    const description = `Generated image for ${trend.name} in response to tweet by @${tweet.author.username}`;
    
    // Create a prompt based on the trending topic and tweet
    const prompt = `Create an aesthetically beautiful, shareable image for social media that visualizes the following tweet:
    
Tweet: "${tweet.text}"
Topic: ${trend.name}

The image should:
- Have a modern, clean design with a lifestyle/fashion appeal
- Include subtle branding for "Sienna Carter"
- Be visually engaging and fit for Instagram/Twitter
- Evoke emotion related to the tweet's content
- Use colors and imagery that complement the topic
- NOT include the actual tweet text in the image
- Be suitable for a fashion/lifestyle influencer's feed`;
    
    // Generate and upload
    return await generateAndUploadImage(prompt, albumTitle, description);
  } catch (error) {
    console.error('Error generating image for trend:', error);
    throw error;
  }
};

module.exports = {
  generateImage,
  generateImageForTrend,
  generateAndUploadImage,
  generateAndUploadImageForTrend
}; 