import express from 'express';
import orderController from '../controllers/orderController.js';
import { authenticateToken, requireVerified, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 🔐 Все маршруты заказов требуют аутентификации

// Получить мои заказы - покупатели, продавцы, модераторы и админы
router.get('/my-orders', 
    authenticateToken, 
    requireRole(['admin', 'moderator', 'seller', 'customer']),
    orderController.getUserOrders
);

// Получить заказ по ID с проверкой прав доступа
router.get('/:id', 
    authenticateToken, 
    async (req, res, next) => {
        try {
            const order = await orderController.getOrderForAuth(req.params.id);
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Админы и модераторы видят все заказы
            if (req.user.role === 'admin' || req.user.role === 'moderator') {
                return next();
            }

            // Продавцы видят заказы на свои товары
            if (req.user.role === 'seller') {
                const isSellerOrder = await orderController.isSellerOrder(req.params.id, req.user.id);
                if (isSellerOrder) {
                    return next();
                }
            }

            // Покупатели видят только свои заказы
            if (req.user.role === 'customer' && order.user_id === req.user.id) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },
    orderController.getOrderById
);

// Создать новый заказ - покупатели и выше
router.post('/', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller', 'customer']),
    orderController.createOrder
);

// Обновить статус заказа - продавцы, модераторы и админы
router.put('/:id/status', 
    authenticateToken, 
    requireRole(['admin', 'moderator', 'seller']),
    orderController.updateOrderStatus
);

// Отменить заказ - покупатели (только свои) и админы/модераторы
router.put('/:id/cancel', 
    authenticateToken, 
    async (req, res, next) => {
        try {
            const order = await orderController.getOrderForAuth(req.params.id);
            
            // Админы и модераторы могут отменять любые заказы
            if (req.user.role === 'admin' || req.user.role === 'moderator') {
                return next();
            }

            // Покупатели могут отменять только свои заказы
            if (req.user.role === 'customer' && order.user_id === req.user.id) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only cancel your own orders.'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },
    orderController.cancelOrder
);

// Получить все заказы (только для админов)
router.get('/', 
    authenticateToken, 
    requireRole(['admin']),
    orderController.getAllOrders
);

// Получить заказы продавца
router.get('/seller/orders', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller']),
    orderController.getSellerOrders
);

// Получить статистику заказов
router.get('/stats/overview', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    orderController.getOrderStats
);

// Получить заказы по статусу
router.get('/status/:status', 
    authenticateToken, 
    requireRole(['admin', 'moderator', 'seller']),
    orderController.getOrdersByStatus
);

// Экспорт заказов (только админы)
router.get('/export', 
    authenticateToken, 
    requireRole(['admin']),
    orderController.exportOrders
);

// Создать возврат заказа
router.post('/:id/return', 
    authenticateToken, 
    requireRole(['admin', 'moderator', 'customer']),
    orderController.createReturn
);

export default router;