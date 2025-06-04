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
    
    // Convert buffer to WordArray
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
    
    // Encrypt with explicit parameters
    const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      format: CryptoJS.format.Hex // Use Hex format for raw ciphertext
    });
    
    // Write only the raw ciphertext (Hex format)
    await writeFileAsync(outputPath, encrypted.ciphertext.toString());
    
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

export const decryptData = (encryptedData, encryptionDetails) => {
  try {
    const { key, iv } = encryptionDetails;

    // Parse key and IV as HEX
    const parsedKey = CryptoJS.enc.Hex.parse(key);
    const parsedIv = CryptoJS.enc.Hex.parse(iv);

    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Hex.parse(encryptedData) },
      parsedKey,
      {
        iv: parsedIv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    // Convert directly to Buffer
    return Buffer.from(decrypted.toString(CryptoJS.enc.Latin1), 'latin1');
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
};

/**
 * Robust decryption function with proper data handling
 */
// export const decryptData = (encryptedData, encryptionDetails) => {
//   try {
//     console.log('Decrypting data of length:', encryptedData.length);
//     const { key, iv } = encryptionDetails;
//     console.log('Using key and IV for decryption');

//     // Parse key and IV as HEX
//     const parsedKey = CryptoJS.enc.Hex.parse(key);
//     const parsedIv = CryptoJS.enc.Hex.parse(iv);

//     // Create CipherParams object for better handling
//     const cipherParams = CryptoJS.lib.CipherParams.create({
//       ciphertext: CryptoJS.enc.Base64.parse(encryptedData)
//     });

//     // Decrypt with explicit parameters
//     const decrypted = CryptoJS.AES.decrypt(
//       cipherParams,
//       parsedKey,
//       {
//         iv: parsedIv,
//         mode: CryptoJS.mode.CBC,
//         padding: CryptoJS.pad.Pkcs7
//       }
//     );

//     console.log('Decrypted WordArray size:', decrypted.sigBytes);

//     // Convert directly to Uint8Array
//     const uint8Array = new Uint8Array(decrypted.sigBytes);
//     for (let i = 0; i < decrypted.sigBytes; i++) {
//       const byte = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
//       uint8Array[i] = byte;
//     }

//     console.log('Final Uint8Array size:', uint8Array.length);
//     return Buffer.from(uint8Array);
//   } catch (error) {
//     console.error('Error decrypting data:', error);
//     throw error;
//   }
// };
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