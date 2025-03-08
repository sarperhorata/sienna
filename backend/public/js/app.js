document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const imageForm = document.getElementById('image-form');
  const imagePrompt = document.getElementById('image-prompt');
  const imageResult = document.getElementById('image-result');
  const loadingIndicator = document.getElementById('loading');
  
  // Navigation Elements
  const chatTab = document.querySelector('nav ul li a');
  const imageTab = document.getElementById('image-tab');
  const aboutTab = document.getElementById('about-tab');
  
  // Content Sections
  const chatSection = document.getElementById('chat-section');
  const imageGenerationSection = document.getElementById('image-generation-section');
  const aboutSection = document.getElementById('about-section');
  
  // Conversation History
  let conversationHistory = [];
  
  // User Avatar
  const userAvatar = 'img/user-avatar.jpg';
  const siennaAvatar = 'img/sienna-avatar.jpg';
  
  // Event Listeners for Navigation
  chatTab.addEventListener('click', (e) => {
    e.preventDefault();
    activateTab(chatTab);
    activateSection(chatSection);
  });
  
  imageTab.addEventListener('click', (e) => {
    e.preventDefault();
    activateTab(imageTab);
    activateSection(imageGenerationSection);
  });
  
  aboutTab.addEventListener('click', (e) => {
    e.preventDefault();
    activateTab(aboutTab);
    activateSection(aboutSection);
  });
  
  // Chat Form Submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    chatInput.value = '';
    
    // Show loading indicator
    loadingIndicator.classList.add('active');
    
    try {
      // Add message to conversation history
      conversationHistory.push({ role: 'user', content: message });
      
      // Get response from API
      const response = await fetchSiennaResponse(message, conversationHistory);
      
      // Add Sienna's response to chat
      addMessageToChat('assistant', response.message);
      
      // Update conversation history
      conversationHistory = response.conversationHistory;
      
    } catch (error) {
      console.error('Error fetching response:', error);
      addMessageToChat('assistant', "Sorry, I'm having some technical difficulties right now. Could you try again in a moment?");
    } finally {
      // Hide loading indicator
      loadingIndicator.classList.remove('active');
      
      // Scroll to bottom of chat
      scrollToBottom();
    }
  });
  
  // Image Form Submission
  imageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const prompt = imagePrompt.value.trim();
    if (!prompt) return;
    
    // Show loading indicator
    loadingIndicator.classList.add('active');
    
    try {
      // Get generated image from API
      const result = await generateImage(prompt);
      
      // Display the result
      displayGeneratedImage(result.imageUrl, result.enhancedPrompt);
      
      // Clear input
      imagePrompt.value = '';
      
    } catch (error) {
      console.error('Error generating image:', error);
      imageResult.innerHTML = `
        <div class="error-message">
          <p>Sorry, I couldn't generate that image. Please try a different description.</p>
        </div>
      `;
    } finally {
      // Hide loading indicator
      loadingIndicator.classList.remove('active');
    }
  });
  
  // Functions
  function activateTab(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('nav ul li a').forEach(link => {
      link.classList.remove('active');
    });
    
    // Add active class to clicked tab
    tab.classList.add('active');
  }
  
  function activateSection(section) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Show selected section
    section.classList.add('active');
  }
  
  function addMessageToChat(role, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    
    const avatar = role === 'user' ? userAvatar : siennaAvatar;
    
    messageElement.innerHTML = `
      <div class="message-avatar">
        <img src="${avatar}" alt="${role}" onerror="this.src='img/default-avatar.jpg'">
      </div>
      <div class="message-content">
        <p>${formatMessageContent(content)}</p>
      </div>
    `;
    
    chatMessages.appendChild(messageElement);
    scrollToBottom();
  }
  
  function formatMessageContent(content) {
    // Convert URLs to links
    content = content.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }
  
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  function displayGeneratedImage(imageUrl, enhancedPrompt) {
    imageResult.innerHTML = `
      <div class="generated-image-container">
        <img src="${imageUrl}" alt="Generated image">
      </div>
      <div class="prompt-description">
        <p><strong>Enhanced prompt:</strong> ${enhancedPrompt}</p>
      </div>
    `;
  }
  
  // API Calls
  async function fetchSiennaResponse(message, history) {
    const response = await fetch('/api/sienna/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, conversationHistory: history })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async function generateImage(prompt) {
    const response = await fetch('/api/sienna/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  // Create placeholder avatar directory and files
  function createPlaceholderImage() {
    // This would typically be done server-side or with actual images
    // For this demo, we'll rely on the onerror fallback to default images
  }
  
  // Initialize
  createPlaceholderImage();
}); 