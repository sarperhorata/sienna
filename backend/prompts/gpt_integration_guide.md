# Integrating Sienna's GPT

This guide explains how to create a custom GPT for Sienna on OpenAI's platform and how to integrate it with your website for user interactions.

## Creating Sienna's GPT on OpenAI

### Option 1: Using GPT Builder (Recommended for Custom GPT)

1. **Log in to your OpenAI account** at [https://chat.openai.com/](https://chat.openai.com/)
2. **Click on "Explore"** in the left sidebar
3. **Click on "Create a GPT"** 
4. **In the GPT Builder interface:**
   - Name your GPT "Sienna Carter"
   - Upload a profile picture that matches Sienna's brand
   - In the configuration panel, click on "Configure"
   - Under "Instructions", paste the contents of `sienna_character_prompt.md`
   - Under "Conversation starters", add a few examples like:
     - "Can you help me improve my photography skills?"
     - "Could you generate an image for my social media?"
     - "What's your approach to portrait photography?"
     - "I need help with my photography portfolio"
   - Optionally, upload sample images that represent Sienna's style
5. **Test your GPT** by having a conversation with it
6. **Click "Save"** and choose whether to make it public or private

### Option 2: Using API for Website Integration

For website integration, you'll use OpenAI's API with your custom system prompt.

## Integrating with Your Website

### 1. Basic API Integration

Create a new file at `backend/services/gptService.js`:

```javascript
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const path = require('path');

// Load Sienna's character prompt
const siennaPrompt = fs.readFileSync(
  path.join(__dirname, '../prompts/sienna_character_prompt.md'), 
  'utf8'
);

class GPTService {
  constructor() {
    // Initialize OpenAI configuration
    this.configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(this.configuration);
  }

  // Method to get Sienna's response
  async getSiennaResponse(userMessage, conversationHistory = []) {
    try {
      // Prepare messages with the system prompt and conversation history
      const messages = [
        { role: 'system', content: siennaPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      // Call OpenAI API
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4', // or gpt-3.5-turbo depending on your requirements
        messages: messages,
        temperature: 0.7, // Adjust for creativity vs consistency
        max_tokens: 300
      });

      return {
        message: response.data.choices[0].message.content,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: userMessage },
          { 
            role: 'assistant', 
            content: response.data.choices[0].message.content 
          }
        ]
      };
    } catch (error) {
      console.error('Error getting response from OpenAI:', error);
      throw error;
    }
  }

  // Method to generate an image based on user request
  async generateImage(userPrompt) {
    try {
      // Get image prompt enhancement from GPT
      const enhancementResponse = await this.openai.createChatCompletion({
        model: 'gpt-4', // or gpt-3.5-turbo
        messages: [
          { 
            role: 'system', 
            content: `${siennaPrompt}\n\nYou are helping to enhance a user's image prompt. Read the image guidelines in the next message and then enhance the user's prompt that follows.` 
          },
          {
            role: 'system',
            content: fs.readFileSync(
              path.join(__dirname, '../prompts/sienna_image_generation_guidelines.md'), 
              'utf8'
            )
          },
          { 
            role: 'user', 
            content: `Enhance this image prompt while keeping the original intent: "${userPrompt}"` 
          }
        ],
        temperature: 0.7
      });

      const enhancedPrompt = enhancementResponse.data.choices[0].message.content;
      
      // Generate the image using the enhanced prompt
      const imageResponse = await this.openai.createImage({
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
      });

      return {
        imageUrl: imageResponse.data.data[0].url,
        enhancedPrompt
      };
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }
}

module.exports = new GPTService();
```

### 2. Create API Endpoints

Add these endpoints to your backend API:

```javascript
// routes/gptRoutes.js
const express = require('express');
const router = express.Router();
const gptService = require('../services/gptService');

// Endpoint for chat with Sienna
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    const response = await gptService.getSiennaResponse(message, conversationHistory);
    res.json(response);
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

// Endpoint for image generation
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await gptService.generateImage(prompt);
    res.json(result);
  } catch (error) {
    console.error('Error in image generation endpoint:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

module.exports = router;
```

Add the routes to your main app:

```javascript
// app.js or server.js
app.use('/api/sienna', require('./routes/gptRoutes'));
```

### 3. Frontend Integration

Here's a simple React component for the chat interface:

```jsx
// ChatWithSienna.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatWithSienna.css';

const ChatWithSienna = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey there! I'm Sienna Carter. Photography's my jam, and I'd love to help with your visual ideas! What can I create for you today? 📸✨" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message to Sienna
  const sendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === '') return;

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsLoading(true);

    try {
      // Filter messages to only include content and role
      const conversationHistory = messages.map(({ role, content }) => ({ role, content }));
      
      // Call your backend API
      const response = await axios.post('/api/sienna/chat', {
        message: input,
        conversationHistory
      });

      // Add Sienna's response to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I'm having trouble connecting right now. Can you try again in a moment?" 
      }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  // Generate image
  const generateImage = async (e) => {
    e.preventDefault();
    if (imagePrompt.trim() === '') return;

    setIsLoading(true);
    setMessages(prev => [...prev, 
      { role: 'user', content: `Can you create an image of: ${imagePrompt}` }
    ]);

    try {
      const response = await axios.post('/api/sienna/generate-image', {
        prompt: imagePrompt
      });

      setGeneratedImage(response.data.imageUrl);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Here's what I created for you! I enhanced your prompt to: "${response.data.enhancedPrompt}"\n\n![Generated Image](${response.data.imageUrl})` 
      }]);
    } catch (error) {
      console.error('Error generating image:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I couldn't create that image right now. Let's try something different!" 
      }]);
    } finally {
      setIsLoading(false);
      setImagePrompt('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chat with Sienna..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>

      <div className="image-generation-section">
        <h3>Generate an Image</h3>
        <form onSubmit={generateImage}>
          <input
            type="text"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Describe the image you want..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>Create Image</button>
        </form>
      </div>
    </div>
  );
};

export default ChatWithSienna;
```

### 4. Adding CSS Styling

Create a CSS file for the chat component:

```css
/* ChatWithSienna.css */
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

.chat-messages {
  height: 400px;
  overflow-y: auto;
  padding: 10px;
  margin-bottom: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.message {
  padding: 10px 15px;
  border-radius: 18px;
  margin-bottom: 10px;
  max-width: 70%;
  word-wrap: break-word;
}

.message.user {
  background-color: #e3f2fd;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.message.assistant {
  background-color: #fff;
  border: 1px solid #eee;
  margin-right: auto;
  border-bottom-left-radius: 4px;
}

.chat-input-form {
  display: flex;
  margin-bottom: 20px;
}

.chat-input-form input {
  flex-grow: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 30px;
  font-size: 16px;
  outline: none;
}

button {
  background-color: #ff7043;
  color: white;
  border: none;
  border-radius: 30px;
  padding: 12px 20px;
  margin-left: 10px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #f4511e;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.image-generation-section {
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.image-generation-section h3 {
  margin-top: 0;
  color: #333;
}

.typing-indicator {
  display: flex;
  padding: 15px;
}

.typing-indicator span {
  height: 10px;
  width: 10px;
  margin: 0 2px;
  background-color: #bbb;
  border-radius: 50%;
  display: inline-block;
  animation: bounce 1.5s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

.message img {
  max-width: 100%;
  border-radius: 8px;
  margin-top: 10px;
}
```

## Payment Integration for Premium Images

If you want to offer both free and paid image generation:

### 1. Create a middleware for checking subscription

```javascript
// middleware/subscriptionCheck.js
const User = require('../models/User');

const checkImageGenerationAccess = async (req, res, next) => {
  try {
    // Get user from authenticated request
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    // Check if user has free generations left or is a premium subscriber
    if (user.freeGenerationsLeft > 0 || user.subscriptionStatus === 'premium') {
      // If user is using a free generation, decrement the count
      if (user.subscriptionStatus !== 'premium' && user.freeGenerationsLeft > 0) {
        user.freeGenerationsLeft -= 1;
        await user.save();
      }
      next();
    } else {
      res.status(402).json({ 
        error: 'Payment required', 
        message: 'You have used all your free generations. Please upgrade to a premium plan.'
      });
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { checkImageGenerationAccess };
```

### 2. Apply the middleware to the image generation route

```javascript
// routes/gptRoutes.js
const { checkImageGenerationAccess } = require('../middleware/subscriptionCheck');

// Use auth middleware first, then subscription check
router.post('/generate-image', auth, checkImageGenerationAccess, async (req, res) => {
  // Existing code...
});
```

### 3. Add subscription purchase endpoint with Stripe

```javascript
// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { priceId } = req.body;
    
    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      client_reference_id: req.user.id
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Add this route to app.js
module.exports = router;
```

## Environment Variables

Ensure you have these environment variables set:

```
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
FRONTEND_URL=http://localhost:3000
```

## Conclusion

This setup gives you:

1. A custom GPT with Sienna's personality and voice
2. API endpoints for chat and image generation
3. A React component for your website
4. Optional payment integration for premium features

You can expand this by adding:

- User authentication and session management
- Image storage to a database or cloud storage
- More sophisticated payment plans
- Analytics to track usage patterns

For the OpenAI custom GPT, remember that if you make it public, others can find and interact with it. If you want it to be exclusive to your website, keep it private and use the API integration outlined above. 