import express from 'express';
import productController, { upload as productUpload } from './controllers/productController.js';
import categoryController, { upload as categoryUpload } from './controllers/categoryController.js';
import authController, { upload as userUpload } from './controllers/authController.js';
import userController from './controllers/userController.js';
import { authenticateToken, requireAdmin, requireVerified } from './middleware/auth.js';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(express.json());

// 🔧 Раздача статических файлов
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/public', express.static(join(__dirname, 'public')));

// 🔐 МАРШРУТЫ АУТЕНТИФИКАЦИИ (публичные)
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.get('/auth/verify-email', authController.verifyEmail);
app.post('/auth/resend-verification', authController.resendVerification);
app.post('/auth/forgot-password', authController.forgotPassword);
app.post('/auth/reset-password', authController.resetPassword);

// 👤 ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (требуют аутентификации)
app.get('/auth/me', authenticateToken, authController.getMe);
app.put('/auth/profile', authenticateToken, userUpload.single('avatar'), authController.updateProfile);
app.put('/auth/change-password', authenticateToken, authController.changePassword);

// 👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только для админов)
app.get('/users', authenticateToken, requireAdmin, userController.getAllUsers);
app.get('/users/:id', authenticateToken, requireAdmin, userController.getUserById);
app.patch('/users/:id/toggle-active', authenticateToken, requireAdmin, userController.toggleUserActive);

// 📋 МАРШРУТЫ ДЛЯ ПРОДУКТОВ (обновленные с аутентификацией)
app.get('/products', productController.getAllProducts);
app.get('/products/:id', productController.getProductById);
app.post('/products', authenticateToken, requireVerified, productUpload.single('image'), productController.createProduct);
app.put('/products/:id', authenticateToken, requireVerified, productUpload.single('image'), productController.updateProduct);
app.delete('/products/:id', authenticateToken, requireVerified, productController.deleteProduct);
app.get('/categories/:categoryId/products', productController.getProductsByCategory);
app.get('/uploads/products/:filename', productController.getProductImage);

// 📁 МАРШРУТЫ ДЛЯ КАТЕГОРИЙ (обновленные с аутентификацией)
app.get('/categories', categoryController.getAllCategories);
app.get('/categories/:id', categoryController.getCategoryById);
app.post('/categories', authenticateToken, requireVerified, categoryUpload.single('image'), categoryController.createCategory);
app.put('/categories/:id', authenticateToken, requireVerified, categoryUpload.single('image'), categoryController.updateCategory);
app.delete('/categories/:id', authenticateToken, requireVerified, categoryController.deleteCategory);
app.get('/uploads/categories/:filename', categoryController.getCategoryImage);

// ℹ️ Информация об API
app.get('/', (req, res) => {
    res.json({
        message: 'Products API with Authentication & File Upload',
        endpoints: {
            // 🔐 Аутентификация
            'POST /auth/register': 'Register new user (email verification required)',
            'POST /auth/login': 'Login user (requires email verification)',
            'GET /auth/verify-email': 'Verify email with token',
            'POST /auth/resend-verification': 'Resend verification email',
            'POST /auth/forgot-password': 'Request password reset',
            'POST /auth/reset-password': 'Reset password with token',
            
            // 👤 Профиль
            'GET /auth/me': 'Get current user (Auth required)',
            'PUT /auth/profile': 'Update profile (Auth, with avatar upload)',
            'PUT /auth/change-password': 'Change password (Auth required)',
            
            // 👥 Пользователи (Admin only)
            'GET /users': 'Get all users (Admin)',
            'GET /users/:id': 'Get user by ID (Admin)',
            'PATCH /users/:id/toggle-active': 'Toggle user active status (Admin)',
            
            // 📋 Продукты
            'GET /products': 'Get all products with categories',
            'GET /products/:id': 'Get product by ID with category info',
            'POST /products': 'Create new product (Auth + Verified, with image upload)',
            'PUT /products/:id': 'Update product (Auth + Verified, with image upload)',
            'DELETE /products/:id': 'Delete product (Auth + Verified)',
            'GET /categories/:categoryId/products': 'Get products by category',
            'GET /uploads/products/:filename': 'Get product image',
            
            // 📁 Категории
            'GET /categories': 'Get all categories',
            'GET /categories/:id': 'Get category by ID',
            'POST /categories': 'Create new category (Auth + Verified, with image upload)',
            'PUT /categories/:id': 'Update category (Auth + Verified, with image upload)',
            'DELETE /categories/:id': 'Delete category (Auth + Verified)',
            'GET /uploads/categories/:filename': 'Get category image',
            
            // Статические файлы
            'GET /uploads/*': 'Access uploaded files',
            'GET /public/*': 'Access public static files'
        },
        security: {
            'Auth required': 'Requires JWT token in Authorization header',
            'Verified required': 'Requires email verification',
            'Admin required': 'Requires admin role',
            'Rate limiting': '100 requests per 15 minutes per IP'
        },
        default_admin: {
            username: 'admin',
            password: 'admin123',
            email: 'admin@example.com'
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

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}`);
    console.log(`🔐 Authentication: JWT tokens with email verification`);
    console.log(`💾 Database: SQLite`);
    console.log(`📁 File upload enabled`);
    console.log(`⚡ Rate limiting: 100 requests/15min`);
});