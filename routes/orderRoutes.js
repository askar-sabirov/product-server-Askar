import express from 'express';
import orderController from '../controllers/orderController.js';
import { authenticateToken, requireVerified, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// User routes
router.get('/my-orders', authenticateToken, orderController.getUserOrders);
router.get('/:id', authenticateToken, orderController.getOrderById);
router.post('/', authenticateToken, requireVerified, orderController.createOrder);

// Admin routes
router.get('/', authenticateToken, requireAdmin, orderController.getAllOrders);
router.put('/:id/status', authenticateToken, requireAdmin, orderController.updateOrderStatus);

export default router;