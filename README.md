# Decentralized PDF NFT Application

This application allows users to:
1. Upload a PDF file
2. Encrypt it using AES-256-CBC
3. Store the encrypted file on Arweave via Bundlr
4. Mint an NFT on the Polygon blockchain with metadata pointing to the Arweave-hosted file

## Features

- **Encryption**: AES-256-CBC with random IV per file
- **Decentralized Storage**: Bundlr SDK for Arweave uploads
- **Blockchain & NFT**: ERC721 contract on Polygon (Mumbai testnet or Mainnet)
- **Backend**: Node.js + Express.js
- **Frontend**: React with Tailwind CSS

## Setup Instructions

### Prerequisites

1. Node.js and npm installed
2. A wallet with MATIC (for Mumbai testnet or Mainnet)
3. RPC URL for Polygon network

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```
   # Blockchain
   PRIVATE_KEY=your_wallet_private_key_here
   POLYGON_MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

   # Bundlr
   BUNDLR_NODE=https://node1.bundlr.network
   BUNDLR_CURRENCY=matic

   # Server
   PORT=3001
   ```

### Deployment

1. Compile the smart contract:
   ```
   npm run compile
   ```

2. Deploy the smart contract:
   ```
   npm run deploy:contract
   ```

3. Start the backend server:
   ```
   npm run start:backend
   ```

4. In a separate terminal, start the frontend:
   ```
   npm run dev
   ```

## Usage

1. Open the application in your browser
2. Upload a PDF file
3. The file will be encrypted and uploaded to Arweave
4. Enter a recipient address and optional metadata
5. Mint the NFT
6. The NFT will contain metadata with the Arweave link and encryption key

## Security Considerations

- The encryption key is stored in the NFT metadata
- Only the NFT owner should have access to this key
- The backend wallet private key should be kept secure

## License

MIT