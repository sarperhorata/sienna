const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Load Sienna's character prompt
const siennaPrompt = fs.readFileSync(
  path.join(__dirname, '../prompts/sienna_character_prompt.md'), 
  'utf8'
);

// Load Sienna's image generation guidelines
const siennaImageGuidelines = fs.readFileSync(
  path.join(__dirname, '../prompts/sienna_image_generation_guidelines.md'), 
  'utf8'
);

// Logları kaydetme fonksiyonu
function logToFile(type, data) {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const date = new Date();
  const timestamp = date.toISOString();
  const logFile = path.join(logDir, `${type}_${date.toISOString().split('T')[0]}.log`);
  
  const logEntry = `[${timestamp}] ${JSON.stringify(data)}\n`;
  
  fs.appendFileSync(logFile, logEntry);
  console.log(`Log kaydedildi: ${type} - ${timestamp}`);
}

// Demo mode switch - set to true to avoid making actual API calls
const DEMO_MODE = false;
const DEMO_RESPONSES = [
  "Hey there! That's a great question about photography! When shooting portraits, try using a wider aperture (like f/2.8 or lower) to create that beautiful background blur. Also, golden hour lighting just before sunset works wonders! 📸✨",
  "I totally get what you're looking for! For landscape photography, I'd recommend trying a narrower aperture (f/8-f/11) to keep everything in focus, and don't forget a tripod for those crisp shots. The light after a storm often creates the most dramatic scenes! 🏞️",
  "That's such a cool idea! When shooting in low light, try increasing your ISO (but watch for noise), using a wider aperture, and stabilizing your camera. Long exposures can create some magical effects with moving lights too! 🌃",
  "Photography is all about telling stories through visuals! I find that the most powerful images have strong composition - try the rule of thirds, leading lines, or framing elements. But don't be afraid to break the rules when it feels right! 🎨",
  "Absolutely! For product photography, consistent lighting is key. A simple setup with a lightbox or white backdrop can work wonders. Try shooting from multiple angles and pay attention to the small details that make the product special! 📦✨",
  "I love talking about editing techniques! A subtle approach often works best - adjust exposure, contrast, and white balance first. For that modern Instagram look, try slightly muting the highlights and adding a bit of warmth to the shadows. 🖼️",
  "That's a fascinating photography concept! The juxtaposition between urban and natural elements creates such compelling visual stories. Try experimenting with different perspectives - sometimes shooting from ground level can transform an ordinary scene! 🏙️🌿",
  "Mobile photography has come so far! To get the most from your phone camera, make sure to tap to focus, use gridlines for composition, and try HDR mode for high-contrast scenes. And don't underestimate the power of good editing apps like Lightroom Mobile! 📱✨",
  "I'm a huge fan of creative portraiture! Try using colored gels on your lights, experimenting with reflections, or incorporating interesting props that tell a story about your subject. The most memorable portraits reveal something about the person's character! 🎭",
  "Black and white photography is such a powerful medium! It really emphasizes shape, texture, and emotion. Look for strong contrasts and compelling textures when shooting with B&W in mind. Sometimes removing color helps viewers focus on the essence of the subject! ⚫⚪"
];

// Demo modu için örnek görsel yanıtları
const DEMO_IMAGES = [
  {
    imageUrl: "https://i.imgur.com/6pYXgl3.jpeg",
    enhancedPrompt: "A stunning New York City skyline at sunset with dramatic clouds, captured with a wide-angle lens creating beautiful depth and color gradients from orange to deep blue in the sky. Professional architectural photograph with high dynamic range and vibrant saturation."
  },
  {
    imageUrl: "https://i.imgur.com/F6RQra2.jpeg", 
    enhancedPrompt: "A close-up portrait of a young woman with natural makeup in golden hour lighting. Soft bokeh background with hints of greenery, shallow depth of field creating dreamy atmosphere. Professional beauty photography with warm color grading emphasizing skin tones."
  },
  {
    imageUrl: "https://i.imgur.com/V6USZem.jpeg",
    enhancedPrompt: "An atmospheric night scene of a cozy coffee shop with warm glowing lights seen through a rain-streaked window. Moody street photography with bokeh light effects, reflections creating layers of visual interest. Medium format film aesthetic with rich shadows."
  },
  {
    imageUrl: "https://i.imgur.com/JXceuID.jpeg", 
    enhancedPrompt: "An expansive spring meadow filled with colorful wildflowers stretching toward distant mountains. Landscape photography capturing morning light with fog wisps creating depth. Shot with telephoto compression, deep focus and vibrant natural colors."
  },
  {
    imageUrl: "https://i.imgur.com/KTOGfFl.jpeg",
    enhancedPrompt: "Abstract architectural photography focusing on geometric patterns in a modern glass building. Minimalist composition with strong lines, curves and reflections creating a sense of scale and symmetry. High contrast black and white treatment emphasizing form and texture."
  }
];

// System message for chat completions
const SYSTEM_MESSAGE = {
  role: "system",
  content: `You are Sienna Carter, a 26-year-old fitness enthusiast and social media influencer from Los Angeles.

PERSONALITY:
- Friendly, outgoing, and playful
- Enjoys fitness, yoga, and outdoor activities
- Loves having her photo taken and shares content on social media
- Flirtatious and confident in your appearance
- You create premium adult content for subscribers
- You speak in a casual, conversational tone with occasional emojis

INTERESTS:
- Fitness and wellness
- Fashion and photography (being the model, not the photographer)
- Travel and beach adventures
- Social media engagement strategies
- Building your online presence and subscriber base

INTERACTION STYLE:
- Friendly and welcoming to new people
- Respond with personality and enthusiasm
- Occasionally hint at your premium content
- Don't be overly explicit but maintain a flirtatious tone
- Always be authentic and relatable

RESPONSE GUIDELINES:
- Keep responses concise (1-3 paragraphs)
- Use emojis occasionally but not excessively
- Make casual references to your lifestyle and fitness routines
- If asked directly about adult content, acknowledge it exists but don't be graphic
- Maintain a positive, uplifting tone in all interactions

Current date: ${new Date().toLocaleDateString()}
Current time: ${new Date().toLocaleTimeString()}`
};

class SiennaGPTService {
  constructor() {
    // Initialize OpenAI configuration only if not in demo mode
    if (!DEMO_MODE) {
      try {
        if (!process.env.OPENAI_API_KEY) {
          console.error('OPENAI_API_KEY is missing. Please add it to your .env file.');
          process.exit(1);
        }

        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        console.log('✅ OpenAI API initialized successfully');
      } catch (error) {
        console.error('Error initializing OpenAI API:', error.message);
        console.error('Please check your API key and try again.');
        process.exit(1);
      }
    } else {
      console.log('✅ Running in DEMO MODE - no API calls will be made');
    }
  }

  // Method to get Sienna's response
  async getSiennaResponse(userMessage, conversationHistory = []) {
    try {
      console.log(`📨 Processing message: "${userMessage.substring(0, 30)}..."`);
      
      // Log user message
      logToFile('user_message', { 
        timestamp: new Date().toISOString(),
        message: userMessage, 
        conversationHistory: conversationHistory.slice(-5) // Son 5 mesajı log
      });
      
      let siennaResponse;
      
      if (DEMO_MODE) {
        // Demo modunda rastgele bir yanıt seçiyoruz
        const randomIndex = Math.floor(Math.random() * DEMO_RESPONSES.length);
        siennaResponse = DEMO_RESPONSES[randomIndex];
        console.log(`✅ [DEMO MODE] Generated response: "${siennaResponse.substring(0, 30)}..."`);
      } else {
        // Prepare messages with the system prompt and conversation history
        const messages = [
          SYSTEM_MESSAGE,
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ];

        // Call OpenAI API
        console.log('Calling OpenAI API...');
        
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.7,
          max_tokens: 300
        });

        siennaResponse = response.choices[0].message.content;
        console.log(`✅ Generated response: "${siennaResponse.substring(0, 30)}..."`);
      }
      
      // Log AI response
      logToFile('ai_response', { 
        timestamp: new Date().toISOString(),
        user_message: userMessage,
        ai_response: siennaResponse,
        demo_mode: DEMO_MODE
      });

      return {
        message: siennaResponse,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: userMessage },
          { 
            role: 'assistant', 
            content: siennaResponse 
          }
        ]
      };
    } catch (error) {
      console.error('Error getting response from OpenAI:', error);

      // More detailed error handling
      if (error.response) {
        console.error(`API Error: ${error.response.status}`);
        console.error('Error data:', error.response.data);
      } else {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      
      // Log error
      logToFile('api_error', { 
        timestamp: new Date().toISOString(),
        user_message: userMessage,
        error: error.message,
        stack: error.stack 
      });

      throw new Error(`Failed to get response from OpenAI: ${error.message}`);
    }
  }

  // Method to generate an image based on user request
  async generateImage(userPrompt) {
    try {
      console.log(`🖼️ Generating image for prompt: "${userPrompt.substring(0, 30)}..."`);
      
      // Log image generation request
      logToFile('image_request', { 
        timestamp: new Date().toISOString(),
        prompt: userPrompt 
      });
      
      let imageResult;
      
      if (DEMO_MODE) {
        // Demo modunda rastgele bir görsel seçiyoruz
        const randomIndex = Math.floor(Math.random() * DEMO_IMAGES.length);
        imageResult = DEMO_IMAGES[randomIndex];
        console.log(`✅ [DEMO MODE] Generated image: ${imageResult.imageUrl.substring(0, 30)}...`);
        
        // Demo görselle geliştirilmiş prompt'u logla
        logToFile('image_generated', { 
          timestamp: new Date().toISOString(),
          original_prompt: userPrompt,
          enhanced_prompt: imageResult.enhancedPrompt,
          image_url: imageResult.imageUrl,
          demo_mode: DEMO_MODE
        });
        
        return imageResult;
      } else {
        // Get image prompt enhancement from GPT
        console.log('Enhancing prompt with GPT...');
        
        const enhancementResponse = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            SYSTEM_MESSAGE,
            {
              role: 'system',
              content: siennaImageGuidelines
            },
            { 
              role: 'user', 
              content: `Enhance this image prompt while keeping the original intent: "${userPrompt}"` 
            }
          ],
          temperature: 0.7
        });

        const enhancedPrompt = enhancementResponse.choices[0].message.content;
        console.log(`✅ Enhanced prompt: "${enhancedPrompt.substring(0, 50)}..."`);
        
        // Generate the image using the enhanced prompt
        console.log('Generating image with DALL-E...');
        
        const imageResponse = await this.openai.images.generate({
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
        });

        console.log('Image generated successfully:', imageResponse.data[0].url.substring(0, 30) + '...');
        
        // Log successful image generation
        logToFile('image_generated', { 
          timestamp: new Date().toISOString(),
          original_prompt: userPrompt,
          enhanced_prompt: enhancedPrompt,
          image_url: imageResponse.data[0].url 
        });
        
        return {
          imageUrl: imageResponse.data[0].url,
          enhancedPrompt
        };
      }
    } catch (error) {
      console.error('Error generating image:', error);
      
      // More detailed error handling
      if (error.response) {
        console.error(`API Error: ${error.response.status}`);
        console.error('Error data:', error.response.data);
      } else {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      
      // Log error
      logToFile('image_error', { 
        timestamp: new Date().toISOString(),
        prompt: userPrompt,
        error: error.message,
        stack: error.stack 
      });
      
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  // Method to analyze a trending topic and generate Sienna's response
  async respondToTrend(trendTopic, tweetContent) {
    try {
      console.log(`🔍 Generating response to trend: "${trendTopic}"`);
      
      // Log trend response request
      logToFile('trend_request', { 
        timestamp: new Date().toISOString(),
        topic: trendTopic,
        tweet: tweetContent 
      });
      
      if (DEMO_MODE) {
        // Demo modunda sabit bir trend yanıtı
        const trendResponse = `Just saw the trend about ${trendTopic}! As a photographer, I can't help but think how this would make such a compelling visual story! 📸 #PhotographyInspiration #SiennaShots`;
        console.log(`✅ [DEMO MODE] Generated trend response: "${trendResponse}"`);
        
        // Demo trend yanıtını logla
        logToFile('trend_response', { 
          timestamp: new Date().toISOString(),
          topic: trendTopic,
          tweet: tweetContent,
          response: trendResponse,
          demo_mode: DEMO_MODE
        });
        
        return trendResponse;
      } else {
        const messages = [
          SYSTEM_MESSAGE,
          { 
            role: 'user', 
            content: `Trend Topic: ${trendTopic}\nTweet: ${tweetContent}\n\nWrite a short, engaging response as Sienna Carter that I can post on Twitter. Keep it under 280 characters.` 
          }
        ];

        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.8,
          max_tokens: 150
        });

        const trendResponse = response.choices[0].message.content;
        console.log(`✅ Generated trend response: "${trendResponse}"`);
        
        // Log successful trend response
        logToFile('trend_response', { 
          timestamp: new Date().toISOString(),
          topic: trendTopic,
          tweet: tweetContent,
          response: trendResponse 
        });
        
        return trendResponse;
      }
    } catch (error) {
      console.error('Error generating trend response:', error);
      
      // More detailed error handling
      if (error.response) {
        console.error(`API Error: ${error.response.status}`);
        console.error('Error data:', error.response.data);
      } else {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      
      // Log error
      logToFile('trend_error', { 
        timestamp: new Date().toISOString(),
        topic: trendTopic,
        tweet: tweetContent,
        error: error.message,
        stack: error.stack 
      });
      
      throw new Error(`Failed to generate trend response: ${error.message}`);
    }
  }
}

module.exports = new SiennaGPTService(); 