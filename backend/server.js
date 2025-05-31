import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Debug: Check if environment variables are loaded
console.log('Environment variables loaded:');
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? 'Set' : 'Not set');
console.log('POLYGON_MAINNET_RPC_URL:', process.env.POLYGON_MAINNET_RPC_URL || 'Using default');
console.log('BUNDLR_NODE:', process.env.BUNDLR_NODE || 'Using default');
console.log('BUNDLR_CURRENCY:', process.env.BUNDLR_CURRENCY || 'Using default');

// Import routes
import pdfRoutes from './routes/pdfRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: tempDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
}));

// Log incoming requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', pdfRoutes);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});