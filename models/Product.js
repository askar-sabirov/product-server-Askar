import Database from '../db.js';

class Product {
    static async findAll({ page = 1, limit = 10, category_id = null, search = '' } = {}) {
        try {
            const db = new Database();
            const offset = (page - 1) * limit;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (category_id) {
                whereClause += ' AND p.category_id = ?';
                params.push(category_id);
            }
            
            if (search) {
                whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            
            // Получаем продукты
            const products = await db.query(`
                SELECT 
                    p.*,
                    c.name as category_name,
                    c.description as category_description,
                    u.username as created_by_username,
                    CASE 
                        WHEN p.image IS NOT NULL THEN '/uploads/products/' || p.image
                        ELSE NULL 
                    END as image_url,
                    CASE 
                        WHEN c.image IS NOT NULL THEN '/uploads/categories/' || c.image
                        ELSE NULL 
                    END as category_image_url
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.created_by = u.id
                ${whereClause}
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);
            
            // Получаем общее количество для пагинации
            const countResult = await db.query(`
                SELECT COUNT(*) as total 
                FROM products p 
                ${whereClause}
            `, params);
            
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            await db.close();
            
            return {
                products,
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
            const products = await db.query(`
                SELECT 
                    p.*,
                    c.name as category_name,
                    c.description as category_description,
                    u.username as created_by_username,
                    CASE 
                        WHEN p.image IS NOT NULL THEN '/uploads/products/' || p.image
                        ELSE NULL 
                    END as image_url,
                    CASE 
                        WHEN c.image IS NOT NULL THEN '/uploads/categories/' || c.image
                        ELSE NULL 
                    END as category_image_url
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.created_by = u.id
                WHERE p.id = ?
            `, [id]);
            
            await db.close();
            return products.length > 0 ? products[0] : null;
        } catch (error) {
            throw error;
        }
    }

    static async create(productData) {
        try {
            const { name, description, price, category_id, stock_quantity, image, created_by } = productData;
            const db = new Database();
            
            const result = await db.run(
                'INSERT INTO products (name, description, price, category_id, stock_quantity, image, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [name, description, price, category_id, stock_quantity || 0, image, created_by]
            );
            
            const newProduct = await this.findById(result.id);
            await db.close();
            
            return newProduct;
        } catch (error) {
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const db = new Database();
            const { name, description, price, category_id, stock_quantity, image } = updateData;
            
            const updateFields = [];
            const updateValues = [];
            
            if (name) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }
            
            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description);
            }
            
            if (price) {
                updateFields.push('price = ?');
                updateValues.push(price);
            }
            
            if (category_id) {
                updateFields.push('category_id = ?');
                updateValues.push(category_id);
            }
            
            if (stock_quantity !== undefined) {
                updateFields.push('stock_quantity = ?');
                updateValues.push(stock_quantity);
            }
            
            if (image !== undefined) {
                updateFields.push('image = ?');
                updateValues.push(image);
            }
            
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);
            
            await db.run(
                `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            const updatedProduct = await this.findById(id);
            await db.close();
            
            return updatedProduct;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const db = new Database();
            
            // Получаем продукт перед удалением
            const product = await this.findById(id);
            if (!product) {
                return null;
            }
            
            await db.run('DELETE FROM products WHERE id = ?', [id]);
            await db.close();
            
            return product;
        } catch (error) {
            throw error;
        }
    }

    static async updateStock(id, quantity) {
        try {
            const db = new Database();
            await db.run(
                'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [quantity, id]
            );
            await db.close();
            return true;
        } catch (error) {
            throw error;
        }
    }
}

export default Product;