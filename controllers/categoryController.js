import Database from '../db.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = join(__dirname, '../uploads/categories');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'category-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

class CategoryController {
    // Получить все категории
    async getAllCategories(req, res) {
        try {
            const db = new Database();
            const categories = await db.query(`
                SELECT 
                    *,
                    CASE 
                        WHEN image IS NOT NULL THEN '/uploads/categories/' || image
                        ELSE NULL 
                    END as image_url
                FROM categories 
                ORDER BY name
            `);
            
            res.json({
                success: true,
                count: categories.length,
                data: categories
            });
            
            await db.close();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить категорию по ID
    async getCategoryById(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
            const categories = await db.query(`
                SELECT 
                    *,
                    CASE 
                        WHEN image IS NOT NULL THEN '/uploads/categories/' || image
                        ELSE NULL 
                    END as image_url
                FROM categories 
                WHERE id = ?
            `, [id]);
            
            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            
            res.json({
                success: true,
                data: categories[0]
            });
            
            await db.close();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Создать новую категорию с возможностью загрузки изображения
    async createCategory(req, res) {
        try {
            const { name, description } = req.body;
            const image = req.file ? req.file.filename : null;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name is required'
                });
            }
            
            const db = new Database();
            const result = await db.run(
                'INSERT INTO categories (name, description, image) VALUES (?, ?, ?)',
                [name, description || '', image]
            );
            
            const newCategory = await db.query(`
                SELECT 
                    *,
                    CASE 
                        WHEN image IS NOT NULL THEN '/uploads/categories/' || image
                        ELSE NULL 
                    END as image_url
                FROM categories 
                WHERE id = ?
            `, [result.id]);
            
            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: newCategory[0]
            });
            
            await db.close();
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({
                    success: false,
                    message: 'Category with this name already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Обновить категорию с возможностью загрузки изображения
    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            const image = req.file ? req.file.filename : undefined;
            
            const db = new Database();
            
            // Проверяем существование категории
            const existingCategory = await db.query(
                'SELECT * FROM categories WHERE id = ?',
                [id]
            );
            
            if (existingCategory.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            
            // Если загружено новое изображение, удаляем старое
            if (image && existingCategory[0].image) {
                const fs = await import('fs');
                const oldImagePath = join(__dirname, '../uploads/categories', existingCategory[0].image);
                try {
                    await fs.promises.unlink(oldImagePath);
                } catch (err) {
                    console.log('Could not delete old image:', err.message);
                }
            }
            
            // Обновляем категорию
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
            
            const updatedCategory = await db.query(`
                SELECT 
                    *,
                    CASE 
                        WHEN image IS NOT NULL THEN '/uploads/categories/' || image
                        ELSE NULL 
                    END as image_url
                FROM categories 
                WHERE id = ?
            `, [id]);
            
            res.json({
                success: true,
                message: 'Category updated successfully',
                data: updatedCategory[0]
            });
            
            await db.close();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Удалить категорию
    async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
            // Проверяем существование категории
            const existingCategory = await db.query(
                'SELECT * FROM categories WHERE id = ?',
                [id]
            );
            
            if (existingCategory.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            
            // Проверяем, есть ли продукты в этой категории
            const productsInCategory = await db.query(
                'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
                [id]
            );
            
            if (productsInCategory[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete category with existing products'
                });
            }
            
            // Удаляем изображение категории если оно есть
            if (existingCategory[0].image) {
                const fs = await import('fs');
                const imagePath = join(__dirname, '../uploads/categories', existingCategory[0].image);
                try {
                    await fs.promises.unlink(imagePath);
                } catch (err) {
                    console.log('Could not delete category image:', err.message);
                }
            }
            
            // Удаляем категорию
            await db.run('DELETE FROM categories WHERE id = ?', [id]);
            
            res.json({
                success: true,
                message: 'Category deleted successfully',
                data: existingCategory[0]
            });
            
            await db.close();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить изображение категории
    async getCategoryImage(req, res) {
        try {
            const { filename } = req.params;
            const imagePath = join(__dirname, '../uploads/categories', filename);
            
            const fs = await import('fs');
            try {
                await fs.promises.access(imagePath);
                res.sendFile(imagePath);
            } catch (err) {
                res.status(404).json({
                    success: false,
                    message: 'Image not found'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
}

export default new CategoryController();