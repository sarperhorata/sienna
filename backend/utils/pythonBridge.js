/**
 * Python Bridge - Utility to call Python scripts from Node.js
 * This module provides an interface for executing Python scripts and handling their output
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Configuration paths
const PYTHON_SCRIPTS_PATH = process.env.PYTHON_SCRIPTS_PATH || '/Users/sarperhorata/Sienna Pics/sienna-photo-generator/scripts';
const PYTHON_VENV_PATH = process.env.PYTHON_VENV_PATH || '/Users/sarperhorata/Sienna Pics/sienna-photo-generator/venv/bin/python';
const OUTPUT_PATH = process.env.OUTPUT_PATH || '/Users/sarperhorata/Sienna Pics/sienna-photo-generator/output';

/**
 * Execute a Python script with the given arguments
 * @param {string} scriptName - Name of the Python script to execute
 * @param {Array} args - Arguments to pass to the script
 * @returns {Promise} - Promise that resolves with the script output
 */
exports.executePythonScript = async (scriptName, args = []) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PYTHON_SCRIPTS_PATH, scriptName);
    console.log(`Executing Python script: ${scriptPath} with args:`, args);
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Script not found: ${scriptPath}`);
      return reject(new Error(`Script not found: ${scriptPath}`));
    }
    
    const pythonProcess = spawn(PYTHON_VENV_PATH, [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`Python stdout: ${data.toString()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`Python stderr: ${data.toString()}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
    
    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      reject(err);
    });
  });
};

/**
 * Create a JSON file with options to pass to a Python script
 * @param {Object} options - Options to include in the file
 * @returns {string} - Path to the created options file
 */
exports.createOptionsFile = (options) => {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  }
  
  const optionsFile = path.join(OUTPUT_PATH, `options_${Date.now()}.json`);
  fs.writeFileSync(optionsFile, JSON.stringify(options, null, 2));
  return optionsFile;
};

/**
 * Check if the Python environment is properly set up
 * @returns {Promise<boolean>} - Whether the Python environment is ready
 */
exports.checkPythonEnvironment = async () => {
  try {
    // Check if Python executable exists
    if (!fs.existsSync(PYTHON_VENV_PATH)) {
      console.error(`Python executable not found: ${PYTHON_VENV_PATH}`);
      return false;
    }
    
    // Check if scripts directory exists
    if (!fs.existsSync(PYTHON_SCRIPTS_PATH)) {
      console.error(`Python scripts directory not found: ${PYTHON_SCRIPTS_PATH}`);
      return false;
    }
    
    // Try running a simple Python command
    const { stdout, stderr } = await exec(`${PYTHON_VENV_PATH} -c "print('Python environment check')"`, { timeout: 5000 });
    if (stderr) {
      console.error(`Python environment check error: ${stderr}`);
      return false;
    }
    
    console.log('Python environment check successful:', stdout.trim());
    return true;
  } catch (error) {
    console.error('Python environment check failed:', error);
    return false;
  }
};

/**
 * Get a list of available Python scripts
 * @returns {Array<string>} - List of Python script names
 */
exports.getAvailableScripts = () => {
  try {
    if (!fs.existsSync(PYTHON_SCRIPTS_PATH)) {
      console.error(`Python scripts directory not found: ${PYTHON_SCRIPTS_PATH}`);
      return [];
    }
    
    return fs.readdirSync(PYTHON_SCRIPTS_PATH)
      .filter(file => file.endsWith('.py'))
      .map(file => path.basename(file));
  } catch (error) {
    console.error('Error getting available scripts:', error);
    return [];
  }
};

/**
 * Generate an image using a Python script
 * @param {string} scriptName - Name of the Python script to execute
 * @param {Object} options - Options for image generation
 * @returns {Promise<Object>} - Result containing image path and metadata
 */
exports.generateImageWithPython = async (scriptName, options) => {
  try {
    // Create options file
    const optionsFile = this.createOptionsFile(options);
    
    // Execute the Python script with the options file
    const output = await this.executePythonScript(scriptName, [optionsFile]);
    
    // Parse the output to get the generated image path
    const outputLines = output.trim().split('\n');
    const lastLine = outputLines[outputLines.length - 1];
    
    // Extract the image path from the output
    let imagePath;
    try {
      // The Python script should output the image path as the last line
      // in a format like: {"image_path": "/path/to/image.png"}
      const outputJson = JSON.parse(lastLine);
      imagePath = outputJson.image_path || outputJson[0];
    } catch (error) {
      console.error('Failed to parse Python output:', error);
      throw new Error('Failed to parse Python output');
    }
    
    if (!imagePath || !fs.existsSync(imagePath)) {
      throw new Error('Generated image not found');
    }
    
    return {
      success: true,
      imagePath,
      output: outputLines.slice(0, -1).join('\n') // All output except the last line
    };
  } catch (error) {
    console.error('Error generating image with Python:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}; 