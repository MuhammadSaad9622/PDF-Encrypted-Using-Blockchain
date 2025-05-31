import CryptoJS from 'crypto-js';
import fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Improved file encryption with better error handling and data conversion
 */
export const encryptFile = async (inputPath, outputPath) => {
  try {
    // Read file as buffer
    const fileBuffer = await readFileAsync(inputPath);
    
    // Generate random key and IV
    const key = CryptoJS.lib.WordArray.random(32); // 256-bit key
    const iv = CryptoJS.lib.WordArray.random(16);  // 128-bit IV
    
    // Convert buffer to WordArray properly
    const wordArray = CryptoJS.lib.WordArray.create(
      Array.from(new Uint8Array(fileBuffer))
    );
    
    // Encrypt with explicit parameters
    const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      format: CryptoJS.format.OpenSSL // Ensures consistent output format
    });
    
    // Write encrypted data (already base64 encoded by CryptoJS)
    await writeFileAsync(outputPath, encrypted.toString());
    
    // Return key details as JSON string
    return JSON.stringify({
      key: key.toString(CryptoJS.enc.Hex),
      iv: iv.toString(CryptoJS.enc.Hex)
    });
    
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`File encryption failed: ${error.message}`);
  }
};

/**
 * Robust decryption function with proper data handling
 */
export const decryptData = (encryptedData, encryptionDetails) => {
  try {
    console.log('Received encryptionDetails:', encryptionDetails);
    
    // Handle case where encryptionDetails is already an object
    if (typeof encryptionDetails === 'object' && encryptionDetails !== null) {
      if (!encryptionDetails.key || !encryptionDetails.iv) {
        throw new Error('Encryption details object missing key or iv');
      }
      return decryptWithDetails(encryptedData, encryptionDetails);
    }

    // Handle case where it's a JSON string
    if (typeof encryptionDetails === 'string') {
      try {
        const parsedDetails = JSON.parse(encryptionDetails);
        if (parsedDetails && parsedDetails.key && parsedDetails.iv) {
          return decryptWithDetails(encryptedData, parsedDetails);
        }
      } catch (e) {
        console.warn('Failed to parse encryptionDetails as JSON:', e);
      }
    }

    // Handle case where it's a raw key string (your specific case)
    if (typeof encryptionDetails === 'string') {
      console.warn('Assuming raw key string format - please verify this is correct');
      // Try to split the string into key and IV
      // This is a guess - you'll need to adjust based on your actual format
      const key = encryptionDetails.slice(0, 64); // First 64 chars as key (32 bytes hex)
      const iv = encryptionDetails.slice(64);     // Remainder as IV (32 chars = 16 bytes hex)
      
      if (key.length === 64 && iv.length === 32) {
        return decryptWithDetails(encryptedData, { key, iv });
      }
    }

    throw new Error('Could not determine encryption details format');
    
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

// Helper function for actual decryption
function decryptWithDetails(encryptedData, { key, iv }) {
  // Validate key and IV formats
  if (typeof key !== 'string' || typeof iv !== 'string') {
    throw new Error('Key and IV must be strings');
  }

  // Decrypt the data
  const decrypted = CryptoJS.AES.decrypt(
    encryptedData,
    CryptoJS.enc.Hex.parse(key),
    { 
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  // Convert to buffer
  try {
    return Buffer.from(decrypted.toString(CryptoJS.enc.Latin1), 'latin1');
  } catch (e) {
    console.warn('Latin1 conversion failed, trying Utf8');
    return Buffer.from(decrypted.toString(CryptoJS.enc.Utf8), 'utf8');
  }
}