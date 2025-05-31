import CryptoJS from 'crypto-js';
import fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Encrypts a file using AES-256-CBC with a random IV
 * @param {string} inputPath - Path to the file to encrypt
 * @param {string} outputPath - Path to save the encrypted file
 * @returns {Promise<string>} - The encryption key (key + IV)
 */
export const encryptFile = async (inputPath, outputPath) => {
  try {
    // Read the file
    const fileData = await readFileAsync(inputPath);
    console.log('File size:', fileData.length);
    
    // Generate a random key and IV
    const key = CryptoJS.lib.WordArray.random(32); // 256 bits
    const iv = CryptoJS.lib.WordArray.random(16); // 128 bits
    
    // Convert file data to WordArray
    const wordArray = CryptoJS.lib.WordArray.create(fileData);
    console.log('WordArray size:', wordArray.sigBytes);
    
    // Encrypt the file
    const encrypted = CryptoJS.AES.encrypt(
      wordArray,
      key,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    
    // Save the encrypted file
    const encryptedString = encrypted.toString();
    await writeFileAsync(outputPath, encryptedString);
    console.log('Encrypted file size:', encryptedString.length);
    
    // Return the encryption key and IV (base64 encoded)
    const keyData = JSON.stringify({
      key: key.toString(CryptoJS.enc.Base64),
      iv: iv.toString(CryptoJS.enc.Base64)
    });
    console.log('Key data size:', keyData.length);
    
    return keyData;
  } catch (error) {
    console.error('Error encrypting file:', error);
    throw error;
  }
};

/**
 * Decrypts a file using AES-256-CBC
 * @param {string} encryptedData - The encrypted data (base64 string)
 * @param {object} encryptionDetails - Object containing key and IV (base64 encoded)
 * @returns {Buffer} - The decrypted file data
 */
export const decryptData = (encryptedData, encryptionDetails) => {
  try {
    console.log('Decrypting data of length:', encryptedData.length);
    // encryptionDetails is now an object directly
    const { key, iv } = encryptionDetails;
    console.log('Using key and IV for decryption');
    
    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(
      encryptedData,
      CryptoJS.enc.Base64.parse(key),
      { 
        iv: CryptoJS.enc.Base64.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    console.log('Decrypted WordArray size:', decrypted.sigBytes);
    
    // Convert the decrypted WordArray to a Buffer
    const wordArray = decrypted;
    const buffer = Buffer.from(wordArray.toString(CryptoJS.enc.Latin1), 'latin1');
    
    console.log('Final buffer size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
};