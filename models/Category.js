import Database from '../db.js';

class Category {
    static async findAll({ page = 1, limit = 10 } = {}) {
        try {
            const db = new Database();
            const offset = (page - 1) * limit;
            
            const categories = await db.query(`
                SELECT 
                    c.*,
                    u.username as created_by_username,
                    CASE 
                        WHEN c.image IS NOT NULL THEN '/uploads/categories/' || c.image
                        ELSE NULL 
                    END as image_url
                FROM categories c
                LEFT JOIN users u ON c.created_by = u.id
                ORDER BY c.name
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            
            const countResult = await db.query('SELECT COUNT(*) as total FROM categories');
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            await db.close();
            
            return {
                categories,
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
            const categories = await db.query(`
                SELECT 
                    c.*,
                    u.username as created_by_username,
                    CASE 
                        WHEN c.image IS NOT NULL THEN '/uploads/categories/' || c.image
                        ELSE NULL 
                    END as image_url
                FROM categories c
                LEFT JOIN users u ON c.created_by = u.id
                WHERE c.id = ?
            `, [id]);
            
            await db.close();
            return categories.length > 0 ? categories[0] : null;
        } catch (error) {
            throw error;
        }
    }

    static async create(categoryData) {
        try {
            const { name, description, image, created_by } = categoryData;
            const db = new Database();
            
            const result = await db.run(
                'INSERT INTO categories (name, description, image, created_by) VALUES (?, ?, ?, ?)',
                [name, description, image, created_by]
            );
            
            const newCategory = await this.findById(result.id);
            await db.close();
            
            return newCategory;
        } catch (error) {
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const db = new Database();
            const { name, description, image } = updateData;
            
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
            
            if (image !== undefined) {
                updateFields.push('image = ?');
                updateValues.push(image);
            }
            
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);
            
            await db.run(
                `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            const updatedCategory = await this.findById(id);
            await db.close();
            
            return updatedCategory;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const db = new Database();
            
            // Проверяем есть ли продукты в категории
            const productsCount = await db.query(
                'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
                [id]
            );
            
            if (productsCount[0].count > 0) {
                throw new Error('Cannot delete category with existing products');
            }
            
            const category = await this.findById(id);
            if (!category) {
                return null;
            }
            
            await db.run('DELETE FROM categories WHERE id = ?', [id]);
            await db.close();
            
            return category;
        } catch (error) {
            throw error;
        }
    }
}

export default Category;