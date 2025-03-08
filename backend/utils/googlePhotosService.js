/**
 * Google Photos Service
 * 
 * This service handles uploading images to Sienna's Google Photos account
 * using the Google Photos API.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const dotenv = require('dotenv');

dotenv.config();

// Cache for auth token
let authCache = {
  token: null,
  expiry: null
};

/**
 * Create OAuth2 client for Google Photos API
 */
const createOAuth2Client = () => {
  const credentials = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  };

  return new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri
  );
};

/**
 * Get authenticated OAuth2 client
 * If a refresh token is available, it uses that to get a new access token
 */
const getAuthenticatedClient = async () => {
  // Check if we have a valid cached token
  if (authCache.token && authCache.expiry && authCache.expiry > Date.now()) {
    return authCache.token;
  }

  const oauth2Client = createOAuth2Client();
  
  // Set credentials using refresh token
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  
  try {
    // Get a new access token
    const { token } = await oauth2Client.getAccessToken();
    
    // Update cache
    authCache.token = oauth2Client;
    authCache.expiry = Date.now() + 3500 * 1000; // Set expiry 5 min before actual expiry
    
    return oauth2Client;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

/**
 * Upload image to Google Photos
 * @param {string} imagePath - Local path to the image file
 * @param {string} albumId - Optional Google Photos album ID to add the photo to
 * @param {string} description - Optional description for the image
 * @returns {Promise<Object>} - Uploaded image data
 */
const uploadImageToGooglePhotos = async (imagePath, albumId = null, description = null) => {
  try {
    // Get authenticated client
    const auth = await getAuthenticatedClient();
    
    // Create Photos API client
    const photosClient = google.photoslibrary({
      version: 'v1',
      auth
    });
    
    // Read file content
    const fileContent = fs.readFileSync(imagePath);
    
    // Step 1: Create upload token
    const uploadToken = await createUploadToken(auth, fileContent);
    if (!uploadToken) {
      throw new Error('Failed to create upload token');
    }
    
    // Step 2: Create media item with upload token
    const createRequest = {
      newMediaItems: [
        {
          description: description || `Sienna's image from ${new Date().toISOString()}`,
          simpleMediaItem: {
            uploadToken
          }
        }
      ]
    };
    
    // If album ID is provided, add it to the request
    if (albumId) {
      createRequest.albumId = albumId;
    }
    
    // Create the media item
    const response = await photosClient.mediaItems.batchCreate(createRequest);
    
    if (!response.data.newMediaItemResults || response.data.newMediaItemResults.length === 0) {
      throw new Error('Failed to create media item');
    }
    
    const mediaItem = response.data.newMediaItemResults[0].mediaItem;
    console.log(`Successfully uploaded image: ${mediaItem.productUrl}`);
    
    return mediaItem;
  } catch (error) {
    console.error('Error uploading image to Google Photos:', error);
    throw error;
  }
};

/**
 * Create upload token for Google Photos
 * @param {Object} auth - Authenticated OAuth2 client
 * @param {Buffer} fileContent - Image file content
 * @returns {Promise<string>} - Upload token
 */
const createUploadToken = async (auth, fileContent) => {
  try {
    const uploadUrl = 'https://photoslibrary.googleapis.com/v1/uploads';
    
    const accessToken = (await auth.getAccessToken()).token;
    
    // Use fetch to upload the image and get token
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'X-Goog-Upload-Protocol': 'raw',
        'X-Goog-Upload-Content-Type': 'image/jpeg', // Adjust based on actual image type
      },
      body: fileContent
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    // Return upload token
    return await response.text();
  } catch (error) {
    console.error('Error creating upload token:', error);
    throw error;
  }
};

/**
 * Create a new album in Google Photos
 * @param {string} albumName - Name of the album to create
 * @returns {Promise<Object>} - Created album data
 */
const createAlbum = async (albumName) => {
  try {
    // Get authenticated client
    const auth = await getAuthenticatedClient();
    
    // Create Photos API client
    const photosClient = google.photoslibrary({
      version: 'v1',
      auth
    });
    
    // Create album
    const response = await photosClient.albums.create({
      requestBody: {
        album: {
          title: albumName
        }
      }
    });
    
    console.log(`Created album: ${albumName} with ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error('Error creating album:', error);
    throw error;
  }
};

/**
 * List albums in Google Photos
 * @param {number} pageSize - Number of albums to fetch (default: 20)
 * @returns {Promise<Array>} - List of albums
 */
const listAlbums = async (pageSize = 20) => {
  try {
    // Get authenticated client
    const auth = await getAuthenticatedClient();
    
    // Create Photos API client
    const photosClient = google.photoslibrary({
      version: 'v1',
      auth
    });
    
    // List albums
    const response = await photosClient.albums.list({
      pageSize
    });
    
    return response.data.albums || [];
  } catch (error) {
    console.error('Error listing albums:', error);
    throw error;
  }
};

/**
 * Get album by title
 * If album doesn't exist, creates it
 * @param {string} albumTitle - Title of the album to find/create
 * @returns {Promise<Object>} - Album data
 */
const getOrCreateAlbumByTitle = async (albumTitle) => {
  try {
    const albums = await listAlbums(50);
    
    // Find album by title
    const existingAlbum = albums.find(album => album.title === albumTitle);
    
    if (existingAlbum) {
      return existingAlbum;
    }
    
    // Create new album if not found
    return await createAlbum(albumTitle);
  } catch (error) {
    console.error('Error getting or creating album:', error);
    throw error;
  }
};

module.exports = {
  uploadImageToGooglePhotos,
  createAlbum,
  listAlbums,
  getOrCreateAlbumByTitle
}; 