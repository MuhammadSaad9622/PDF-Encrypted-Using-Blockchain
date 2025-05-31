import Bundlr from '@bundlr-network/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generates metadata for the NFT
 * @param {Object} params - Metadata parameters
 * @returns {Object} - NFT metadata object
 */
export const generateMetadata = ({ name, description, arweaveUrl, encryptionKey, originalName }) => {
  return {
    name,
    description,
    image: "https://images.pexels.com/photos/6956183/pexels-photo-6956183.jpeg", // Default secure document image
    external_url: arweaveUrl,
    attributes: [
      {
        trait_type: "Document Type",
        value: "Encrypted PDF"
      },
      {
        trait_type: "Original Filename",
        value: originalName
      },
      {
        display_type: "date",
        trait_type: "Created",
        value: Math.floor(Date.now() / 1000)
      }
    ],
    properties: {
      file: {
        name: originalName,
        type: "application/pdf",
        uri: arweaveUrl
      },
      encryption: encryptionKey // Store the full encryption key object
    }
  };
};

/**
 * Uploads metadata to Arweave via Bundlr
 * @param {Object} metadata - NFT metadata object
 * @returns {Promise<{id: string, url: string}>} - Arweave transaction ID and URL
 */
export const uploadMetadata = async (metadata) => {
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
    
    // Convert metadata to JSON string
    const metadataString = JSON.stringify(metadata);
    
    // Check for sufficient funds
    const price = await bundlr.getPrice(Buffer.byteLength(metadataString));
    const balance = await bundlr.getLoadedBalance();
    
    if (balance.isLessThan(price)) {
      const fundAmount = price.minus(balance).multipliedBy(1.1).integerValue(); // Add 10% buffer
      await bundlr.fund(fundAmount);
    }
    
    // Upload the metadata
    const tags = [{ name: 'Content-Type', value: 'application/json' }];
    const response = await bundlr.upload(metadataString, { tags });
    
    return {
      id: response.id,
      url: `https://arweave.net/${response.id}`
    };
  } catch (error) {
    console.error('Error uploading metadata:', error);
    throw error;
  }
};