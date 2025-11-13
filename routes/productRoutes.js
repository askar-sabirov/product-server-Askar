import express from 'express';
import productController, { upload as productUpload } from '../controllers/productController.js';
import { authenticateToken, requireVerified } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/category/:categoryId', productController.getProductsByCategory);

// Protected routes (require authentication and verification)
router.post('/', authenticateToken, requireVerified, productUpload.single('image'), productController.createProduct);
router.put('/:id', authenticateToken, requireVerified, productUpload.single('image'), productController.updateProduct);
router.delete('/:id', authenticateToken, requireVerified, productController.deleteProduct);

export default router;