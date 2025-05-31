import Bundlr from '@bundlr-network/client';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Uploads a file to Arweave via Bundlr
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<{id: string, url: string}>} - Arweave transaction ID and URL
 */
export const uploadToArweave = async (filePath) => {
  try {
    // Initialize Bundlr client
    const bundlr = new Bundlr(
      'https://node1.bundlr.network',
      'matic',
      'f',
      {
        providerUrl: 'https://polygon-rpc.com'
      }
    );
    
    // Check for sufficient funds
    const price = await bundlr.getPrice(fs.statSync(filePath).size);
    const balance = await bundlr.getLoadedBalance();
    
    console.log(`Upload cost: ${bundlr.utils.unitConverter(price).toString()} ${process.env.BUNDLR_CURRENCY}`);
    console.log(`Current balance: ${bundlr.utils.unitConverter(balance).toString()} ${process.env.BUNDLR_CURRENCY}`);
    
    if (balance.isLessThan(price)) {
      const fundAmount = price.minus(balance).multipliedBy(1.1).integerValue(); // Add 10% buffer
      console.log(`Funding Bundlr with ${bundlr.utils.unitConverter(fundAmount).toString()} ${process.env.BUNDLR_CURRENCY}`);
      await bundlr.fund(fundAmount);
    }
    
    // Upload the file
    const fileData = fs.readFileSync(filePath);
    const tags = [{ name: 'Content-Type', value: 'application/pdf' }];
    const response = await bundlr.upload(fileData, { tags });
    
    return {
      id: response.id,
      url: `https://arweave.net/${response.id}`
    };
  } catch (error) {
    console.error('Error uploading to Arweave:', error);
    throw error;
  }
};