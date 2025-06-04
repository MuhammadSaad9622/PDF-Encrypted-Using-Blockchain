import Bundlr from '@bundlr-network/client';
import fs from 'fs';
import dotenv from 'dotenv';
import { ethers } from 'ethers'; // Import ethers

dotenv.config();

const bundlrNode = process.env.BUNDLR_NODE || 'https://node1.bundlr.network';
const bundlrCurrency = process.env.BUNDLR_CURRENCY || 'matic';
const polygonRpcUrl = process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com';

// Initialize Bundlr client (This will now be done on the frontend using the connected wallet)
// The backend will no longer initialize Bundlr with a private key.
// The functions below will be modified or used by the frontend.

// Removed Bundlr client initialization with private key
// const bundlr = new Bundlr(
//   bundlrNode,
//   bundlrCurrency,
//   process.env.PRIVATE_KEY, // Use private key from env
//   {
//     providerUrl: polygonRpcUrl
//   }
// );

// Re-initialize bundlr as a placeholder or if certain methods are still needed without a signer
// This might need adjustment based on how getUploadPrice and getBundlrAddress are used
// If getUploadPrice requires a connected wallet, it might also need to move to frontend
export const bundlr = new Bundlr(
  bundlrNode,
  bundlrCurrency,
    undefined, // Initialize without a private key or signer in the backend
    { providerUrl: polygonRpcUrl } // Pass options as the fourth argument
);

console.log('Bundlr client placeholder initialized.'); // Log after placeholder init

/**
 * Calculates the price for uploading a file to Arweave via Bundlr
 * This can still be calculated on the backend.
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<string>} - Price in atomic units (as a string)
 */
export const getUploadPrice = async (filePath) => {
  try {
    const price = await bundlr.getPrice(fs.statSync(filePath).size);
    console.log(`Calculated upload cost: ${bundlr.utils.unitConverter(price).toString()} ${bundlrCurrency}`);
    return price.toString(); // Return price as string
  } catch (error) {
    console.error('Error calculating upload price:', error);
    throw error;
  }
};

/**
 * Uploads a pre-funded file to Arweave via Bundlr
 * This function is no longer used on the backend as upload will happen on the frontend.
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<{id: string, url: string}>} - Arweave transaction ID and URL
 */
// Removed the uploadPreFundedFile function
// export const uploadPreFundedFile = async (filePath) => {
//   try {
//     // Check for sufficient funds (optional here, but good practice)
//     const price = await bundlr.getPrice(fs.statSync(filePath).size);
//     const balance = await bundlr.getLoadedBalance();

//     if (balance.isLessThan(price)) {
//       console.error('Error: Insufficient Bundlr balance for upload after funding.');
//       throw new Error('Insufficient Bundlr balance. Please ensure Bundlr was funded correctly.');
//     }

//     // Upload the file
//     const fileData = fs.readFileSync(filePath);
//     const tags = [{ name: 'Content-Type', value: 'application/pdf' }];
//     const response = await bundlr.upload(fileData, { tags });

//     return {
//       id: response.id,
//       url: `https://arweave.net/${response.id}`
//     };
//   } catch (error) {
//     console.error('Error uploading to Arweave:', error);
//     throw error;
//   }
// };

// Add function to get Bundlr address to send funds to
export const getBundlrAddress = () => {
    console.log('Getting Bundlr address:', bundlr.address); // Log address when function is called
    return bundlr.address;
};