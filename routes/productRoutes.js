import express from 'express';
import productController, { upload as productUpload } from '../controllers/productController.js';
import { authenticateToken, requireVerified, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 🔓 Публичные маршруты (не требуют аутентификации)

// Получить все продукты с пагинацией и фильтрами
router.get('/', productController.getAllProducts);

// Получить продукт по ID
router.get('/:id', productController.getProductById);

// Получить продукты по категории
router.get('/category/:categoryId', productController.getProductsByCategory);

// Поиск продуктов
router.get('/search/:query', productController.searchProducts);

// Получить популярные продукты
router.get('/popular', productController.getPopularProducts);

// Получить новые продукты
router.get('/new', productController.getNewProducts);

// 🔐 Защищенные маршруты

// Создать продукт - продавцы, модераторы и админы
router.post('/', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller']),
    productUpload.single('image'), 
    productController.createProduct
);

// Обновить продукт - разные права в зависимости от роли
router.put('/:id', 
    authenticateToken, 
    requireVerified,
    async (req, res, next) => {
        try {
            // Проверяем, является ли пользователь владельцем продукта
            const product = await productController.getProductForAuth(req.params.id);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Админы и модераторы могут обновлять любые продукты
            if (req.user.role === 'admin' || req.user.role === 'moderator') {
                return next();
            }

            // Продавцы могут обновлять только свои продукты
            if (req.user.role === 'seller' && product.created_by === req.user.id) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own products.'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },
    productUpload.single('image'), 
    productController.updateProduct
);

// Удалить продукт - только админы и модераторы
router.delete('/:id', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    productController.deleteProduct
);

// Обновить количество товара на складе - продавцы и выше
router.patch('/:id/stock', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller']),
    productController.updateStock
);

// Получить мои продукты (для продавцов)
router.get('/my-products', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller']),
    productController.getMyProducts
);

// Получить статистику продуктов (для админов и модераторов)
router.get('/stats/overview', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    productController.getProductStats
);

// Массовое обновление продуктов (только админы)
router.put('/batch/update', 
    authenticateToken, 
    requireRole(['admin']),
    productController.batchUpdateProducts
);

export default router;