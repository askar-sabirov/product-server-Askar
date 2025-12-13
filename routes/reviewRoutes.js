import express from 'express';
import reviewController from '../controllers/reviewController.js';
import { authenticateToken, requireVerified, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 🔓 Публичные маршруты

// Получить отзывы для продукта
router.get('/product/:productId', reviewController.getProductReviews);

// Получить рейтинг продукта
router.get('/product/:productId/rating', reviewController.getProductRating);

// Получить последние отзывы
router.get('/latest', reviewController.getLatestReviews);

// 🔐 Защищенные маршруты

// Создать отзыв - покупатели и выше (только верифицированные)
router.post('/', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller', 'customer']),
    reviewController.createReview
);

// Обновить отзыв - проверка владения
router.put('/:id', 
    authenticateToken, 
    async (req, res, next) => {
        try {
            const review = await reviewController.getReviewForAuth(req.params.id);
            
            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            // Админы и модераторы могут обновлять любые отзывы
            if (req.user.role === 'admin' || req.user.role === 'moderator') {
                return next();
            }

            // Пользователи могут обновлять только свои отзывы
            if (review.user_id === req.user.id) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own reviews.'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },
    reviewController.updateReview
);

// Удалить отзыв - проверка владения
router.delete('/:id', 
    authenticateToken, 
    async (req, res, next) => {
        try {
            const review = await reviewController.getReviewForAuth(req.params.id);
            
            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            // Админы и модераторы могут удалять любые отзывы
            if (req.user.role === 'admin' || req.user.role === 'moderator') {
                return next();
            }

            // Пользователи могут удалять только свои отзывы
            if (review.user_id === req.user.id) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own reviews.'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },
    reviewController.deleteReview
);

// Получить мои отзывы
router.get('/my-reviews', 
    authenticateToken, 
    requireRole(['admin', 'moderator', 'seller', 'customer']),
    reviewController.getMyReviews
);

// Модерировать отзыв (скрыть/показать) - только модераторы и админы
router.patch('/:id/moderate', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    reviewController.moderateReview
);

// Ответить на отзыв (для продавцов)
router.post('/:id/reply', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller']),
    reviewController.replyToReview
);

// Получить отзывы требующие модерации
router.get('/moderation/pending', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    reviewController.getPendingModeration
);

// Статистика отзывов
router.get('/stats/overview', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    reviewController.getReviewStats
);

export default router;