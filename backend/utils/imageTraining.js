const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');
const pythonBridge = require('./pythonBridge');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Paths to training data and fine-tuned model
const TRAINING_DATASET_PATH = process.env.TRAINING_DATASET_PATH || '/Users/sarperhorata/Sienna Pics/sienna-photo-generator/training/reference-photos';
const FINE_TUNED_MODEL_PATH = process.env.FINE_TUNED_MODEL_PATH || '/Users/sarperhorata/Sienna Pics/sienna-photo-generator/training/fine_tuned_model';
const GENERATED_IMAGES_PATH = process.env.GENERATED_IMAGES_PATH || '/Users/sarperhorata/Sienna Pics/sienna-photo-generator/training/generated_images';

/**
 * Trains a custom model for Sienna Carter images using Python scripts
 * This integrates with the existing Python training infrastructure
 */
exports.trainModel = async () => {
  try {
    console.log('Starting model training process...');
    
    // Check if Python environment is ready
    const isPythonReady = await pythonBridge.checkPythonEnvironment();
    if (!isPythonReady) {
      console.warn('Python environment is not properly set up. Using default training.');
      return await this.fallbackTraining();
    }
    
    // 1. First analyze facial landmarks to create character profile
    await pythonBridge.executePythonScript('facial_landmark_analysis.py');
    console.log('Facial landmark analysis completed');
    
    // 2. Generate advanced prompts based on the character profile
    await pythonBridge.executePythonScript('generate_advanced_prompt.py');
    console.log('Advanced prompt generation completed');
    
    // 3. Run the quick training script
    await pythonBridge.executePythonScript('quick_train.py');
    console.log('Quick training completed');
    
    // 4. Check if the prompt templates file exists
    const promptTemplateFile = path.join(FINE_TUNED_MODEL_PATH, 'sienna_prompt_templates.json');
    
    let promptTemplates;
    if (fs.existsSync(promptTemplateFile)) {
      promptTemplates = JSON.parse(fs.readFileSync(promptTemplateFile, 'utf8'));
    } else {
      // Create default prompt templates if file doesn't exist
      promptTemplates = [
        "A photorealistic image of Sienna Carter, a beautiful woman with long red hair and brown eyes, 25 years old",
        "A detailed photograph of Sienna Carter, featuring her distinctive red hair and striking brown eyes, looking directly at the camera",
        "A professional portrait of Sienna Carter, showcasing her natural red hair, brown eyes, and light skin"
      ];
      
      // Save the prompt templates
      fs.writeFileSync(
        promptTemplateFile,
        JSON.stringify(promptTemplates, null, 2)
      );
    }
    
    console.log('Model training process completed');
    return {
      success: true,
      message: 'Model training process completed',
      promptTemplates,
    };
  } catch (error) {
    console.error('Error in model training:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Fallback training method when Python environment is not available
 */
exports.fallbackTraining = async () => {
  try {
    console.log('Using fallback training method...');
    
    // Create a simple set of prompt templates
    const promptTemplates = [
      "A photorealistic image of Sienna Carter, a beautiful woman with long red hair and brown eyes, 25 years old",
      "A detailed photograph of Sienna Carter, featuring her distinctive red hair and striking brown eyes, looking directly at the camera",
      "A professional portrait of Sienna Carter, showcasing her natural red hair, brown eyes, and light skin"
    ];
    
    // Save the prompt templates
    const promptTemplateFile = path.join(FINE_TUNED_MODEL_PATH, 'sienna_prompt_templates.json');
    
    // Ensure directory exists
    if (!fs.existsSync(FINE_TUNED_MODEL_PATH)) {
      fs.mkdirSync(FINE_TUNED_MODEL_PATH, { recursive: true });
    }
    
    fs.writeFileSync(
      promptTemplateFile,
      JSON.stringify(promptTemplates, null, 2)
    );
    
    console.log('Fallback training completed');
    return {
      success: true,
      message: 'Fallback training completed',
      promptTemplates,
    };
  } catch (error) {
    console.error('Error in fallback training:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Generate an enhanced image of Sienna Carter
 * This uses a combination of the base DALL-E model and our custom prompt engineering
 * It can also use Python scripts for advanced image generation when needed
 */
exports.generateEnhancedImage = async (options) => {
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
      isAdvanced,
      usePythonGeneration = false
    } = options;
    
    // If Python generation is requested, use the Python script
    if (usePythonGeneration) {
      return await this.generateWithPython(options);
    }
    
    // Check if we have fine-tuned prompt templates
    let promptTemplateFile;
    try {
      promptTemplateFile = path.join(FINE_TUNED_MODEL_PATH, 'sienna_prompt_templates.json');
      if (!fs.existsSync(promptTemplateFile)) {
        await this.trainModel();
      }
    } catch (error) {
      console.warn('Fine-tuned model not available, using base templates', error);
    }
    
    // Get base prompt from fine-tuned templates if available
    let basePrompt;
    try {
      const promptTemplates = JSON.parse(fs.readFileSync(promptTemplateFile, 'utf8'));
      basePrompt = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];
    } catch (error) {
      // Fallback to default prompt if no templates are available
      basePrompt = "A photorealistic image of Sienna Carter, a beautiful woman with long red hair and brown eyes";
    }
    
    // Build the complete prompt
    let prompt = '';
    
    if (isAdvanced && customPrompt) {
      // Use custom prompt for advanced mode
      prompt = `${basePrompt}. ${customPrompt}`;
    } else {
      // Build prompt from selected options
      prompt = basePrompt;
      
      if (background) prompt += `, ${background} background`;
      if (action) prompt += `, ${action}`;
      if (emotion) prompt += `, ${emotion} expression`;
      if (bodyShape) prompt += `, ${bodyShape} body type`;
      if (clothing) prompt += `, wearing ${clothing}`;
      if (clothingColor) prompt += ` in ${clothingColor} color`;
      if (cameraShot) prompt += `, ${cameraShot}`;
      if (cameraAngle) prompt += `, ${cameraAngle}`;
      if (nsfw && nsfw !== 'none') prompt += `, ${nsfw}`;
    }
    
    // Add negative prompt to avoid distortions and improve quality
    prompt += `. Ultra high quality, detailed, 8k, professional photography, studio lighting, sharp focus, flawless, highly detailed.`;
    // Add negative prompt
    const negativePrompt = "deformed, distorted, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, amputation";
    
    // Call OpenAI to generate image with enhanced prompt
    const response = await openai.images.generate({
      model: "dall-e-3", // Using the latest available model
      prompt: prompt,
      n: 1,
      size: "1024x1024", // Highest resolution available
      quality: "hd", // Highest quality
      style: "natural", // More photorealistic
    });
    
    const imageUrl = response.data[0].url;
    
    // Download the image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResponse.data, 'binary');
    
    // Create a unique filename
    const filename = `sienna_enhanced_${Date.now()}.png`;
    const filepath = path.join(GENERATED_IMAGES_PATH, filename);
    
    // Ensure directory exists
    if (!fs.existsSync(GENERATED_IMAGES_PATH)) {
      fs.mkdirSync(GENERATED_IMAGES_PATH, { recursive: true });
    }
    
    // Save the image to disk
    fs.writeFileSync(filepath, buffer);
    
    // Also save a copy to the public directory
    const publicDir = path.join(__dirname, '../../public/images');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicFilepath = path.join(publicDir, filename);
    fs.writeFileSync(publicFilepath, buffer);
    
    return {
      success: true,
      imageUrl: `/images/${filename}`,
      prompt,
      filepath,
    };
  } catch (error) {
    console.error('Error generating enhanced image:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Generate an image using the Python script
 * This is a more advanced method that uses the Python infrastructure
 */
exports.generateWithPython = async (options) => {
  try {
    // Check if Python environment is ready
    const isPythonReady = await pythonBridge.checkPythonEnvironment();
    if (!isPythonReady) {
      console.warn('Python environment is not properly set up. Falling back to OpenAI generation.');
      return await this.generateEnhancedImage({...options, usePythonGeneration: false});
    }
    
    const {
      background = '',
      action = '',
      emotion = '',
      cameraShot = '',
      cameraAngle = '',
      bodyShape = '',
      clothing = '',
      clothingColor = '',
      nsfw = 'none',
      customPrompt = '',
    } = options;
    
    // Use the Python Bridge to generate the image
    const result = await pythonBridge.generateImageWithPython('generate_image.py', {
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
    });
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to generate image with Python');
    }
    
    // Copy the image to the public directory
    const filename = `sienna_python_${Date.now()}.png`;
    const publicDir = path.join(__dirname, '../../public/images');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicFilepath = path.join(publicDir, filename);
    
    fs.copyFileSync(result.imagePath, publicFilepath);
    
    return {
      success: true,
      imageUrl: `/images/${filename}`,
      prompt: customPrompt || `Generated image with ${action} ${emotion} ${background}`,
      filepath: publicFilepath,
    };
  } catch (error) {
    console.error('Error generating image with Python:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}; 