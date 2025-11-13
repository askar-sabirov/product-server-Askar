import Database from '../db.js';

class Review {
    static async findByProductId(productId, { page = 1, limit = 10 } = {}) {
        try {
            const db = new Database();
            const offset = (page - 1) * limit;
            
            const reviews = await db.query(`
                SELECT 
                    r.*,
                    u.username,
                    u.first_name,
                    u.last_name,
                    u.avatar,
                    CASE 
                        WHEN u.avatar IS NOT NULL THEN '/uploads/users/' || u.avatar
                        ELSE NULL 
                    END as user_avatar_url
                FROM reviews r
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.product_id = ?
                ORDER BY r.created_at DESC
                LIMIT ? OFFSET ?
            `, [productId, limit, offset]);
            
            const countResult = await db.query(
                'SELECT COUNT(*) as total FROM reviews WHERE product_id = ?',
                [productId]
            );
            
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            await db.close();
            
            return {
                reviews,
                pagination: {
                    current_page: page,
                    total_pages: totalPages,
                    total_items: total,
                    items_per_page: limit,
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            };
        } catch (error) {
            throw error;
        }
    }

    static async create(reviewData) {
        try {
            const { product_id, user_id, text, rating } = reviewData;
            const db = new Database();
            
            const result = await db.run(
                'INSERT INTO reviews (product_id, user_id, text, rating) VALUES (?, ?, ?, ?)',
                [product_id, user_id, text, rating]
            );
            
            const newReview = await db.query(`
                SELECT 
                    r.*,
                    u.username,
                    u.first_name,
                    u.last_name
                FROM reviews r
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.id = ?
            `, [result.id]);
            
            await db.close();
            return newReview[0];
        } catch (error) {
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const db = new Database();
            const { text, rating } = updateData;
            
            const updateFields = [];
            const updateValues = [];
            
            if (text) {
                updateFields.push('text = ?');
                updateValues.push(text);
            }
            
            if (rating) {
                updateFields.push('rating = ?');
                updateValues.push(rating);
            }
            
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);
            
            await db.run(
                `UPDATE reviews SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            const updatedReview = await db.query(`
                SELECT 
                    r.*,
                    u.username,
                    u.first_name,
                    u.last_name
                FROM reviews r
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.id = ?
            `, [id]);
            
            await db.close();
            return updatedReview[0];
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const db = new Database();
            const review = await db.query('SELECT * FROM reviews WHERE id = ?', [id]);
            
            if (review.length === 0) {
                return null;
            }
            
            await db.run('DELETE FROM reviews WHERE id = ?', [id]);
            await db.close();
            
            return review[0];
        } catch (error) {
            throw error;
        }
    }

    static async getProductRating(productId) {
        try {
            const db = new Database();
            const ratingResult = await db.query(`
                SELECT 
                    AVG(rating) as average_rating,
                    COUNT(*) as total_reviews
                FROM reviews 
                WHERE product_id = ?
            `, [productId]);
            
            await db.close();
            return ratingResult[0];
        } catch (error) {
            throw error;
        }
    }
}

export default Review;