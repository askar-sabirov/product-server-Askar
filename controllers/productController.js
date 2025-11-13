import Product from '../models/Product.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

class ProductController {
    // Получить все продукты с пагинацией и фильтрацией
    async getAllProducts(req, res) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                category_id, 
                search,
                min_price,
                max_price 
            } = req.query;

            const result = await Product.findAll({
                page: parseInt(page),
                limit: parseInt(limit),
                category_id: category_id ? parseInt(category_id) : null,
                search: search || '',
                min_price: min_price ? parseFloat(min_price) : null,
                max_price: max_price ? parseFloat(max_price) : null
            });

            res.json({
                success: true,
                data: result.products,
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

    // Получить продукт по ID
    async getProductById(req, res) {
        try {
            const { id } = req.params;
            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                data: product
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Создать новый продукт
    async createProduct(req, res) {
        try {
            const { name, description, price, category_id, stock_quantity } = req.body;
            const image = req.file ? req.file.filename : null;

            if (!name || !price || !category_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, price and category_id are required'
                });
            }

            const product = await Product.create({
                name,
                description,
                price: parseFloat(price),
                category_id: parseInt(category_id),
                stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
                image,
                created_by: req.user.id
            });

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: product
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Обновить продукт
    async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const { name, description, price, category_id, stock_quantity } = req.body;
            const image = req.file ? req.file.filename : undefined;

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const updateData = {};
            if (name) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (price) updateData.price = parseFloat(price);
            if (category_id) updateData.category_id = parseInt(category_id);
            if (stock_quantity !== undefined) updateData.stock_quantity = parseInt(stock_quantity);
            if (image !== undefined) updateData.image = image;

            const updatedProduct = await Product.update(id, updateData);

            res.json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct
            });

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
            const product = await Product.delete(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                message: 'Product deleted successfully',
                data: product
            });

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
            const { page = 1, limit = 10 } = req.query;

            const result = await Product.findAll({
                page: parseInt(page),
                limit: parseInt(limit),
                category_id: parseInt(categoryId)
            });

            res.json({
                success: true,
                data: result.products,
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
}

export default new ProductController();