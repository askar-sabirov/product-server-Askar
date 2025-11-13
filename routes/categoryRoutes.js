import express from 'express';
import categoryController, { upload as categoryUpload } from '../controllers/categoryController.js';
import { authenticateToken, requireVerified } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Protected routes
router.post('/', authenticateToken, requireVerified, categoryUpload.single('image'), categoryController.createCategory);
router.put('/:id', authenticateToken, requireVerified, categoryUpload.single('image'), categoryController.updateCategory);
router.delete('/:id', authenticateToken, requireVerified, categoryController.deleteCategory);

export default router;