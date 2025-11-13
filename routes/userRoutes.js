import express from 'express';
import userController from '../controllers/userController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin only routes
router.get('/', authenticateToken, requireAdmin, userController.getAllUsers);
router.get('/:id', authenticateToken, requireAdmin, userController.getUserById);
router.patch('/:id/toggle-active', authenticateToken, requireAdmin, userController.toggleUserActive);

export default router;