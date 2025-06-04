import dotenv from 'dotenv';

dotenv.config();

/**
 * Generates metadata for the NFT
 * @param {Object} params - Metadata parameters
 * @returns {Object} - NFT metadata object
 */
export const generateMetadata = ({ name, description, arweaveUrl, encryptionKey, originalName, originalSize }) => {
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
        uri: arweaveUrl,
        size: originalSize
      },
      encryption: encryptionKey // Store the full encryption key object
    }
  };
};