import express from 'express';
import { getUserStats } from '../controllers/statsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/user-stats', authenticate, getUserStats);

export default router;

