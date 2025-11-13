import Database from '../db.js';

class Order {
    static async findByUserId(userId, { page = 1, limit = 10 } = {}) {
        try {
            const db = new Database();
            const offset = (page - 1) * limit;
            
            const orders = await db.query(`
                SELECT 
                    o.*,
                    u.username,
                    u.email
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC
                LIMIT ? OFFSET ?
            `, [userId, limit, offset]);
            
            // Получаем общее количество
            const countResult = await db.query(
                'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
                [userId]
            );
            
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            await db.close();
            
            return {
                orders,
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

    static async findById(id) {
        try {
            const db = new Database();
            const orders = await db.query(`
                SELECT 
                    o.*,
                    u.username,
                    u.email,
                    u.first_name,
                    u.last_name
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ?
            `, [id]);
            
            await db.close();
            return orders.length > 0 ? orders[0] : null;
        } catch (error) {
            throw error;
        }
    }

    static async create(orderData) {
        try {
            const { user_id, amount, status = 'pending' } = orderData;
            const db = new Database();
            
            const result = await db.run(
                'INSERT INTO orders (user_id, amount, status) VALUES (?, ?, ?)',
                [user_id, amount, status]
            );
            
            const newOrder = await this.findById(result.id);
            await db.close();
            
            return newOrder;
        } catch (error) {
            throw error;
        }
    }

    static async updateStatus(id, status) {
        try {
            const db = new Database();
            await db.run(
                'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, id]
            );
            
            const updatedOrder = await this.findById(id);
            await db.close();
            
            return updatedOrder;
        } catch (error) {
            throw error;
        }
    }

    static async getAll({ page = 1, limit = 10, status = null } = {}) {
        try {
            const db = new Database();
            const offset = (page - 1) * limit;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (status) {
                whereClause += ' AND o.status = ?';
                params.push(status);
            }
            
            const orders = await db.query(`
                SELECT 
                    o.*,
                    u.username,
                    u.email,
                    u.first_name,
                    u.last_name
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ${whereClause}
                ORDER BY o.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);
            
            const countResult = await db.query(
                `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
                params
            );
            
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            await db.close();
            
            return {
                orders,
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
}

export default Order;