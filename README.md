# Sienna Carter - Custom GPT Character

A custom GPT character implementation for Sienna Carter, a photographer and digital creator with a distinctive voice and style. This project provides a local implementation of Sienna's character for interacting with users and generating AI images.

## Features

- **Interactive Chat**: Talk with Sienna about photography, creative ideas, or get advice
- **AI Image Generation**: Have Sienna create custom images based on your prompts
- **Twitter Integration**: Generate witty, on-brand responses to trending topics
- **Character Consistency**: All interactions maintain Sienna's unique voice and personality

## Project Structure

```
sienna-carter/
├── backend/
│   ├── prompts/                # Character definitions and prompt templates
│   │   ├── sienna_character_prompt.md
│   │   ├── sienna_conversation_examples.md
│   │   ├── sienna_image_generation_guidelines.md
│   │   └── gpt_integration_guide.md
│   ├── public/                 # Web interface files
│   │   ├── css/
│   │   ├── js/
│   │   ├── img/
│   │   └── index.html
│   ├── routes/                 # API routes
│   │   └── siennaRoutes.js
│   ├── services/               # Business logic
│   │   └── siennaGPTService.js
│   ├── utils/                  # Utility scripts
│   ├── siennaServer.js         # Express server
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14+ recommended)
- An OpenAI API key
- Twitter API keys (optional, for Twitter integration)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/sienna-carter.git
   cd sienna-carter
   ```

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Create a `.env` file in the `backend` directory with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   PORT=5000
   ```

### Running the Application

1. Start the Sienna GPT server:
   ```bash
   cd backend
   npm run sienna
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

3. For development with auto-reload:
   ```bash
   npm run sienna:dev
   ```

## API Endpoints

- **POST /api/sienna/chat**: Get a response from Sienna
  ```json
  {
    "message": "Your message to Sienna",
    "conversationHistory": [] // Optional
  }
  ```

- **POST /api/sienna/generate-image**: Generate an image with Sienna
  ```json
  {
    "prompt": "Description of the image you want"
  }
  ```

- **POST /api/sienna/trend-response**: Generate Sienna's response to a trend
  ```json
  {
    "trend": "Trending topic name",
    "tweet": "Content of a tweet about this trend"
  }
  ```

## Character Background

Sienna Carter is a 28-year-old photographer and digital creator based in Los Angeles. She has a playful, witty personality with a touch of sarcasm. She studied photography at UCLA and has 6 years of professional experience.

Her communication style is casual and conversational, using relaxed language with occasional slang and playful remarks. She's confident about her artistic vision and skills, sometimes using light sarcasm but always staying encouraging and supportive of other creators.

## Creating Images with Sienna

Sienna has a distinctive visual style characterized by:
- Rich, warm color palettes with golden hour tones
- High contrast with deep shadows and bright highlights
- Cinematic composition with attention to the rule of thirds
- Shallow depth of field and slight film grain texture

When generating images, she prefers working with:
- Urban landscape photography
- Stylized portraits
- Nature/landscapes with dramatic lighting
- Abstract compositions playing with light and shadow
- Surreal or conceptual imagery

## Contributing

Contributions to improve Sienna's character, add new features, or fix bugs are welcome. Please feel free to submit pull requests or open issues.

## License

[MIT License](LICENSE)

## Acknowledgments

- OpenAI for the GPT and DALL-E APIs
- All contributors to this project 