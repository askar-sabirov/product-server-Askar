import Database from '../db.js';

class OrderItem {
    static async findByOrderId(orderId) {
        try {
            const db = new Database();
            const items = await db.query(`
                SELECT 
                    oi.*,
                    p.name as product_name,
                    p.description as product_description,
                    p.image as product_image,
                    CASE 
                        WHEN p.image IS NOT NULL THEN '/uploads/products/' || p.image
                        ELSE NULL 
                    END as product_image_url
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
                ORDER BY oi.created_at
            `, [orderId]);
            
            await db.close();
            return items;
        } catch (error) {
            throw error;
        }
    }

    static async create(itemData) {
        try {
            const { order_id, product_id, price_at_time, quantity } = itemData;
            const db = new Database();
            
            const result = await db.run(
                'INSERT INTO order_items (order_id, product_id, price_at_time, quantity) VALUES (?, ?, ?, ?)',
                [order_id, product_id, price_at_time, quantity]
            );
            
            const newItem = await db.query(`
                SELECT 
                    oi.*,
                    p.name as product_name,
                    p.description as product_description
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.id = ?
            `, [result.id]);
            
            await db.close();
            return newItem[0];
        } catch (error) {
            throw error;
        }
    }

    static async createMultiple(items) {
        try {
            const db = new Database();
            
            for (const item of items) {
                await db.run(
                    'INSERT INTO order_items (order_id, product_id, price_at_time, quantity) VALUES (?, ?, ?, ?)',
                    [item.order_id, item.product_id, item.price_at_time, item.quantity]
                );
            }
            
            await db.close();
            return true;
        } catch (error) {
            throw error;
        }
    }
}

export default OrderItem;