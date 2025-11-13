import Review from '../models/Review.js';

class ReviewController {
    // Получить отзывы для продукта
    async getProductReviews(req, res) {
        try {
            const { productId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const result = await Review.findByProductId(productId, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            // Получаем рейтинг продукта
            const ratingInfo = await Review.getProductRating(productId);

            res.json({
                success: true,
                data: result.reviews,
                rating: ratingInfo,
                pagination: result.pagination
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Создать отзыв
    async createReview(req, res) {
        try {
            const { product_id, text, rating } = req.body;
            const user_id = req.user.id;

            if (!product_id || !text || !rating) {
                return res.status(400).json({
                    success: false,
                    message: 'Product ID, text and rating are required'
                });
            }

            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1 and 5'
                });
            }

            const review = await Review.create({
                product_id: parseInt(product_id),
                user_id,
                text,
                rating: parseInt(rating)
            });

            res.status(201).json({
                success: true,
                message: 'Review created successfully',
                data: review
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Обновить отзыв
    async updateReview(req, res) {
        try {
            const { id } = req.params;
            const { text, rating } = req.body;

            const review = await Review.findById(id);
            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            // Проверяем права доступа
            if (review.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const updateData = {};
            if (text) updateData.text = text;
            if (rating) updateData.rating = parseInt(rating);

            const updatedReview = await Review.update(id, updateData);

            res.json({
                success: true,
                message: 'Review updated successfully',
                data: updatedReview
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Удалить отзыв
    async deleteReview(req, res) {
        try {
            const { id } = req.params;

            const review = await Review.findById(id);
            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            // Проверяем права доступа
            if (review.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            await Review.delete(id);

            res.json({
                success: true,
                message: 'Review deleted successfully'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить рейтинг продукта
    async getProductRating(req, res) {
        try {
            const { productId } = req.params;

            const ratingInfo = await Review.getProductRating(productId);

            res.json({
                success: true,
                data: ratingInfo
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
}

export default new ReviewController();