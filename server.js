import express from 'express';
import productController, { upload as productUpload } from './controllers/productController.js';
import categoryController, { upload as categoryUpload } from './controllers/categoryController.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());

// 🔧 Раздача статических файлов
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/public', express.static(join(__dirname, 'public')));

// 📋 Маршруты для продуктов
app.get('/products', productController.getAllProducts);
app.get('/products/:id', productController.getProductById);
app.post('/products', productUpload.single('image'), productController.createProduct);
app.put('/products/:id', productUpload.single('image'), productController.updateProduct);
app.delete('/products/:id', productController.deleteProduct);
app.get('/categories/:categoryId/products', productController.getProductsByCategory);
app.get('/uploads/products/:filename', productController.getProductImage);

// 📁 Маршруты для категорий
app.get('/categories', categoryController.getAllCategories);
app.get('/categories/:id', categoryController.getCategoryById);
app.post('/categories', categoryUpload.single('image'), categoryController.createCategory);
app.put('/categories/:id', categoryUpload.single('image'), categoryController.updateCategory);
app.delete('/categories/:id', categoryController.deleteCategory);
app.get('/uploads/categories/:filename', categoryController.getCategoryImage);

// ℹ️ Информация об API
app.get('/', (req, res) => {
    res.json({
        message: 'Products API with Database and File Upload',
        endpoints: {
            // Продукты
            'GET /products': 'Get all products with categories',
            'GET /products/:id': 'Get product by ID with category info',
            'POST /products': 'Create new product (with image upload)',
            'PUT /products/:id': 'Update product (with image upload)',
            'DELETE /products/:id': 'Delete product',
            'GET /categories/:categoryId/products': 'Get products by category',
            'GET /uploads/products/:filename': 'Get product image',
            
            // Категории
            'GET /categories': 'Get all categories',
            'GET /categories/:id': 'Get category by ID',
            'POST /categories': 'Create new category (with image upload)',
            'PUT /categories/:id': 'Update category (with image upload)',
            'DELETE /categories/:id': 'Delete category',
            'GET /uploads/categories/:filename': 'Get category image',
            
            // Статические файлы
            'GET /uploads/*': 'Access uploaded files',
            'GET /public/*': 'Access public static files'
        }
    });
});

// Обработка ошибок multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
    }
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next();
});

// Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}`);
    console.log(`💾 Using SQLite database`);
    console.log(`📁 File upload enabled: /uploads/`);
    console.log(`🌐 Static files: /public/`);
});