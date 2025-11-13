import express from 'express';
import reviewController from '../controllers/reviewController.js';
import { authenticateToken, requireVerified } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/product/:productId/rating', reviewController.getProductRating);

// Protected routes
router.post('/', authenticateToken, requireVerified, reviewController.createReview);
router.put('/:id', authenticateToken, reviewController.updateReview);
router.delete('/:id', authenticateToken, reviewController.deleteReview);

export default router;