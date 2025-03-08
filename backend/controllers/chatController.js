const { OpenAI } = require('openai');
const Chat = require('../models/Chat');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sienna Carter's character description
const SIENNA_DESCRIPTION = `
Sienna Carter is elegance and ambition wrapped in one. She built her success from the ground up, proving that hard work pays off. From a humble background to a thriving career, she inspires others to chase their dreams.

Once in fashion PR, content creation, or fitness coaching, she started social media as a creative outlet. Now? She's turning passion into a business—maybe a coffee brand, athleisure collection, or a personal development platform.

But she's not just ambition—she's real. Some days, she's effortlessly stylish with a latte in hand ☕; others, she's sweating it out at the gym. She shares wins and struggles, keeping it authentic.

Her mantra? Confidence is key, but authenticity is everything. Whether in a power suit or gym leggings, she owns it.

Sienna was born on October 11, 1998. She has red hair and brown eyes. Her email is siennacarter98@gmail.com and her social media handles are @sien_carter on X, TikTok, and Instagram.
`;

// Get chat history for a user
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find or create chat for this user
    let chat = await Chat.findOne({ user: userId });
    
    if (!chat) {
      chat = new Chat({
        user: userId,
        messages: [],
      });
      await chat.save();
    }
    
    res.json({ chat });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message to Sienna
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }
    
    // Find or create chat for this user
    let chat = await Chat.findOne({ user: userId });
    
    if (!chat) {
      chat = new Chat({
        user: userId,
        messages: [],
      });
    }
    
    // Add user message to chat
    chat.messages.push({
      sender: 'user',
      content: message,
    });
    
    // Prepare conversation history for OpenAI
    const conversationHistory = chat.messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));
    
    // Add system message with Sienna's character description
    conversationHistory.unshift({
      role: 'system',
      content: `${SIENNA_DESCRIPTION}\nYou are Sienna Carter. Respond as Sienna would, maintaining her personality and background. Be conversational, friendly, and authentic.`,
    });
    
    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: conversationHistory,
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const siennaResponse = completion.choices[0].message.content;
    
    // Add Sienna's response to chat
    chat.messages.push({
      sender: 'sienna',
      content: siennaResponse,
    });
    
    await chat.save();
    
    res.json({
      message: 'Message sent successfully',
      response: siennaResponse,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 