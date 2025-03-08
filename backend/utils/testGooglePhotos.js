/**
 * Test script for Google Photos integration
 * 
 * This script tests:
 * 1. Generating an image with DALL-E
 * 2. Uploading the image to Google Photos
 * 3. Testing album creation and management
 */

const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');
const googlePhotosService = require('./googlePhotosService');
const imageGenerationService = require('./imageGenerationService');

// Load environment variables
dotenv.config();

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Test image generation only
 */
const testImageGeneration = async (prompt) => {
  try {
    console.log("Testing image generation...");
    console.log(`Using prompt: "${prompt}"`);
    
    const imagePath = await imageGenerationService.generateImage(prompt);
    console.log(`Success! Image generated at: ${imagePath}`);
    
    return imagePath;
  } catch (error) {
    console.error("Failed to generate image:", error);
    throw error;
  }
};

/**
 * Test Google Photos album listing
 */
const testListAlbums = async () => {
  try {
    console.log("Listing Google Photos albums...");
    
    const albums = await googlePhotosService.listAlbums(10);
    
    console.log(`Found ${albums.length} albums:`);
    albums.forEach((album, index) => {
      console.log(`${index + 1}. ${album.title} (ID: ${album.id})`);
    });
    
    return albums;
  } catch (error) {
    console.error("Failed to list albums:", error);
    throw error;
  }
};

/**
 * Test get or create album
 */
const testGetOrCreateAlbum = async (albumTitle) => {
  try {
    console.log(`Testing get or create album: "${albumTitle}"`);
    
    const album = await googlePhotosService.getOrCreateAlbumByTitle(albumTitle);
    
    console.log(`Success! Album details:`);
    console.log(`- Title: ${album.title}`);
    console.log(`- ID: ${album.id}`);
    console.log(`- URL: ${album.productUrl || 'N/A'}`);
    
    return album;
  } catch (error) {
    console.error("Failed to get or create album:", error);
    throw error;
  }
};

/**
 * Test uploading an existing image to Google Photos
 */
const testUploadImage = async (imagePath, albumId = null) => {
  try {
    console.log(`Testing image upload to Google Photos...`);
    console.log(`Image path: ${imagePath}`);
    
    const description = "Test upload from Sienna Twitter Bot";
    
    const uploadedImage = await googlePhotosService.uploadImageToGooglePhotos(
      imagePath,
      albumId,
      description
    );
    
    console.log(`Success! Image uploaded to Google Photos:`);
    console.log(`- URL: ${uploadedImage.productUrl}`);
    console.log(`- Media ID: ${uploadedImage.id}`);
    
    return uploadedImage;
  } catch (error) {
    console.error("Failed to upload image:", error);
    throw error;
  }
};

/**
 * Test complete flow: generate image and upload to Google Photos
 */
const testGenerateAndUpload = async (prompt, albumTitle) => {
  try {
    console.log(`Testing complete flow: Generate image and upload to Google Photos`);
    console.log(`Prompt: "${prompt}"`);
    console.log(`Album: "${albumTitle}"`);
    
    const result = await imageGenerationService.generateAndUploadImage(
      prompt,
      albumTitle,
      `Generated for testing: ${prompt}`
    );
    
    console.log(`Success! Complete flow results:`);
    console.log(`- Local image path: ${result.localPath}`);
    console.log(`- Google Photos URL: ${result.googlePhotosUrl}`);
    console.log(`- Album title: ${result.albumTitle}`);
    console.log(`- Album ID: ${result.albumId}`);
    
    return result;
  } catch (error) {
    console.error("Failed complete flow:", error);
    throw error;
  }
};

/**
 * Main test function
 */
const runTests = async () => {
  try {
    console.log("===================================");
    console.log("Google Photos Integration Test Tool");
    console.log("===================================\n");
    
    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.error("Error: Missing required Google API credentials in .env file");
      process.exit(1);
    }
    
    // Main menu
    const showMenu = () => {
      console.log("\nSelect a test to run:");
      console.log("1. Test image generation (DALL-E)");
      console.log("2. List Google Photos albums");
      console.log("3. Get or create album");
      console.log("4. Upload existing image to Google Photos");
      console.log("5. Complete flow: Generate and upload to Google Photos");
      console.log("6. Exit");
      rl.question("\nEnter your choice (1-6): ", handleMenuChoice);
    };
    
    // Handle menu choice
    const handleMenuChoice = async (choice) => {
      try {
        switch (choice) {
          case "1": {
            rl.question("Enter prompt for image generation: ", async (prompt) => {
              await testImageGeneration(prompt || "A beautiful sunset over a beach with palm trees");
              showMenu();
            });
            break;
          }
          
          case "2": {
            await testListAlbums();
            showMenu();
            break;
          }
          
          case "3": {
            rl.question("Enter album title (or press enter for default): ", async (albumTitle) => {
              await testGetOrCreateAlbum(albumTitle || process.env.GOOGLE_PHOTOS_ALBUM_NAME || "Sienna's AI Generated Images");
              showMenu();
            });
            break;
          }
          
          case "4": {
            rl.question("Enter image path: ", async (imagePath) => {
              const albums = await testListAlbums();
              
              if (albums.length > 0) {
                rl.question(`Enter album index (1-${albums.length}) or press enter for none: `, async (albumIndex) => {
                  const index = parseInt(albumIndex) - 1;
                  const albumId = (index >= 0 && index < albums.length) ? albums[index].id : null;
                  await testUploadImage(imagePath, albumId);
                  showMenu();
                });
              } else {
                await testUploadImage(imagePath);
                showMenu();
              }
            });
            break;
          }
          
          case "5": {
            rl.question("Enter prompt for image generation: ", async (prompt) => {
              rl.question("Enter album title (or press enter for default): ", async (albumTitle) => {
                await testGenerateAndUpload(
                  prompt || "A stylish fashion photo for social media with subtle Sienna Carter branding", 
                  albumTitle || process.env.GOOGLE_PHOTOS_ALBUM_NAME || "Sienna's AI Generated Images"
                );
                showMenu();
              });
            });
            break;
          }
          
          case "6": {
            console.log("Exiting test tool...");
            rl.close();
            process.exit(0);
            break;
          }
          
          default: {
            console.log("Invalid choice, please try again.");
            showMenu();
            break;
          }
        }
      } catch (error) {
        console.error("Error executing test:", error);
        showMenu();
      }
    };
    
    // Start menu
    showMenu();
    
  } catch (error) {
    console.error("Test script failed:", error);
    rl.close();
    process.exit(1);
  }
};

// Run all tests
runTests(); 