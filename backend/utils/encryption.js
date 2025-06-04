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
    
    // Log original file buffer size
    console.log('Original file buffer size:', fileBuffer.length);
    
    // Generate random key and IV
    const key = CryptoJS.lib.WordArray.random(32); // 256-bit key
    const iv = CryptoJS.lib.WordArray.random(16);  // 128-bit IV
    
    // Convert buffer to WordArray properly
    const wordArray = CryptoJS.lib.WordArray.create(
      Array.from(new Uint8Array(fileBuffer))
    );
    
    // Log WordArray size
    console.log('WordArray size after creation:', wordArray.sigBytes);
    
    // Encrypt with explicit parameters
    const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      format: CryptoJS.format.OpenSSL // Ensures consistent output format
    });
    
    // Log encrypted data format and size
    console.log('Encrypted data format (CryptoJS):', encrypted.format);
    console.log('Encrypted data size (CryptoJS):', encrypted.ciphertext.sigBytes);
    
    // Write encrypted data (already base64 encoded by CryptoJS)
    await writeFileAsync(outputPath, encrypted.toString());
    
    // Log output file path and size
    const encryptedFileSize = fs.statSync(outputPath).size;
    console.log('Encrypted file written to:', outputPath);
    console.log('Encrypted file size on disk:', encryptedFileSize);
    
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
    console.log('Decrypting data of length:', encryptedData.length);
    const { key, iv } = encryptionDetails;
    console.log('Using key and IV for decryption');

    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(
      encryptedData, // Pass the Base64 encoded string directly
      CryptoJS.enc.Hex.parse(key),
      {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    console.log('Decrypted WordArray size:', decrypted.sigBytes);

    // Convert the decrypted WordArray to a Uint8Array and then to a Buffer
    const buffer = new Uint8Array(decrypted.sigBytes);
    for (let i = 0; i < decrypted.sigBytes; i++) {
      buffer[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }    

    console.log('Final buffer size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
};

// Helper function for actual decryption (removed as logic is now in decryptData)
/*
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
*/