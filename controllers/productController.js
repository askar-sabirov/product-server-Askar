import Database from '../db.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настройка multer для загрузки файлов продуктов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = join(__dirname, '../uploads/products');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
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

class ProductController {
    // Получить все продукты с информацией о категориях
    async getAllProducts(req, res) {
        try {
            const db = new Database();
            const products = await db.query(`
                SELECT 
                    p.*,
                    c.name as category_name,
                    c.description as category_description,
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
                ORDER BY p.created_at DESC
            `);
            
            res.json({
                success: true,
                count: products.length,
                data: products
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

    // Получить продукт по ID с информацией о категории
    async getProductById(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
            const products = await db.query(`
                SELECT 
                    p.*,
                    c.name as category_name,
                    c.description as category_description,
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
                WHERE p.id = ?
            `, [id]);
            
            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            res.json({
                success: true,
                data: products[0]
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

    // Создать новый продукт с возможностью загрузки изображения
    async createProduct(req, res) {
        try {
            const { name, category_id, price, description, in_stock } = req.body;
            const image = req.file ? req.file.filename : null;
            
            // Валидация
            if (!name || !category_id || !price) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, category_id and price are required fields'
                });
            }
            
            if (isNaN(price) || price < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Price must be a positive number'
                });
            }
            
            const db = new Database();
            
            // Проверяем существование категории
            const category = await db.query(
                'SELECT * FROM categories WHERE id = ?',
                [category_id]
            );
            
            if (category.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            
            // Создаем продукт
            const result = await db.run(
                'INSERT INTO products (name, category_id, price, description, in_stock, image) VALUES (?, ?, ?, ?, ?, ?)',
                [name, category_id, price, description || '', in_stock !== undefined ? in_stock : 1, image]
            );
            
            // Получаем созданный продукт с информацией о категории
            const newProduct = await db.query(`
                SELECT 
                    p.*,
                    c.name as category_name,
                    c.description as category_description,
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
                WHERE p.id = ?
            `, [result.id]);
            
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: newProduct[0]
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

    // Обновить продукт с возможностью загрузки изображения
    async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const { name, category_id, price, description, in_stock } = req.body;
            const image = req.file ? req.file.filename : undefined;
            
            const db = new Database();
            
            // Проверяем существование продукта
            const existingProduct = await db.query(
                'SELECT * FROM products WHERE id = ?',
                [id]
            );
            
            if (existingProduct.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            // Если меняется категория, проверяем ее существование
            if (category_id) {
                const category = await db.query(
                    'SELECT * FROM categories WHERE id = ?',
                    [category_id]
                );
                
                if (category.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Category not found'
                    });
                }
            }
            
            // Валидация цены
            if (price !== undefined && (isNaN(price) || price < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Price must be a positive number'
                });
            }
            
            // Если загружено новое изображение, удаляем старое
            if (image && existingProduct[0].image) {
                const fs = await import('fs');
                const oldImagePath = join(__dirname, '../uploads/products', existingProduct[0].image);
                try {
                    await fs.promises.unlink(oldImagePath);
                } catch (err) {
                    console.log('Could not delete old image:', err.message);
                }
            }
            
            // Обновляем продукт
            const updateFields = [];
            const updateValues = [];
            
            if (name) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }
            
            if (category_id) {
                updateFields.push('category_id = ?');
                updateValues.push(category_id);
            }
            
            if (price) {
                updateFields.push('price = ?');
                updateValues.push(price);
            }
            
            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description);
            }
            
            if (in_stock !== undefined) {
                updateFields.push('in_stock = ?');
                updateValues.push(in_stock);
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
            
            // Получаем обновленный продукт
            const updatedProduct = await db.query(`
                SELECT 
                    p.*,
                    c.name as category_name,
                    c.description as category_description,
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
                WHERE p.id = ?
            `, [id]);
            
            res.json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct[0]
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

    // Удалить продукт
    async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
            // Проверяем существование продукта
            const existingProduct = await db.query(
                'SELECT * FROM products WHERE id = ?',
                [id]
            );
            
            if (existingProduct.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            
            // Удаляем изображение продукта если оно есть
            if (existingProduct[0].image) {
                const fs = await import('fs');
                const imagePath = join(__dirname, '../uploads/products', existingProduct[0].image);
                try {
                    await fs.promises.unlink(imagePath);
                } catch (err) {
                    console.log('Could not delete product image:', err.message);
                }
            }
            
            // Удаляем продукт
            await db.run('DELETE FROM products WHERE id = ?', [id]);
            
            res.json({
                success: true,
                message: 'Product deleted successfully',
                data: existingProduct[0]
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

    // Получить продукты по категории
    async getProductsByCategory(req, res) {
        try {
            const { categoryId } = req.params;
            const db = new Database();
            
            const products = await db.query(`
                SELECT 
                    p.*,
                    c.name as category_name,
                    c.description as category_description,
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
                WHERE p.category_id = ?
                ORDER BY p.created_at DESC
            `, [categoryId]);
            
            res.json({
                success: true,
                count: products.length,
                data: products
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

    // Получить изображение продукта
    async getProductImage(req, res) {
        try {
            const { filename } = req.params;
            const imagePath = join(__dirname, '../uploads/products', filename);
            
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

export default new ProductController();