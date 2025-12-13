import express from 'express';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Импорт роутеров
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Rate limiting для разных типов запросов
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // 100 запросов
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Меньше для аутентификации
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later'
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Применение rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// Статические файлы
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/public', express.static(join(__dirname, 'public')));

// API Routes с ролевым доступом
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionRoutes);

// Статические маршруты для файлов
app.get('/uploads/products/:filename', (req, res) => {
    res.sendFile(join(__dirname, 'uploads/products', req.params.filename));
});

app.get('/uploads/categories/:filename', (req, res) => {
    res.sendFile(join(__dirname, 'uploads/categories', req.params.filename));
});

app.get('/uploads/users/:filename', (req, res) => {
    res.sendFile(join(__dirname, 'uploads/users', req.params.filename));
});

// Документация API
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🛍️ E-commerce API with Role-Based Access Control',
        version: '1.0.0',
        documentation: 'Visit /api-docs for detailed documentation',
        
        roles: {
            admin: {
                level: 1,
                description: 'Full system administrator',
                endpoints: 'All endpoints'
            },
            moderator: {
                level: 2,
                description: 'Content moderator',
                endpoints: 'Most content management endpoints'
            },
            seller: {
                level: 3,
                description: 'Product seller',
                endpoints: 'Product and order management'
            },
            customer: {
                level: 4,
                description: 'Regular customer',
                endpoints: 'Shopping and profile management'
            }
        },
        
        main_endpoints: {
            authentication: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'GET /api/auth/me': 'Get current user (Auth required)'
            },
            
            products: {
                'GET /api/products': 'Get all products (Public)',
                'GET /api/products/:id': 'Get product by ID (Public)',
                'POST /api/products': 'Create product (Seller+)',
                'PUT /api/products/:id': 'Update product (Owner/Moderator+)'
            },
            
            orders: {
                'GET /api/orders/my-orders': 'Get my orders (Customer+)',
                'POST /api/orders': 'Create order (Customer+)',
                'PUT /api/orders/:id/status': 'Update status (Seller+)'
            },
            
            users: {
                'GET /api/users': 'Get all users (Moderator+)',
                'PUT /api/users/:id/role': 'Change role (Admin only)'
            },
            
            permissions: {
                'GET /api/permissions/my-permissions': 'Get my permissions',
                'GET /api/permissions/check?permission=:perm': 'Check permission'
            }
        },
        
        test_credentials: {
            admin: { username: 'admin', password: 'password123', role: 'admin' },
            moderator: { username: 'moderator', password: 'password123', role: 'moderator' },
            seller: { username: 'seller1', password: 'password123', role: 'seller' },
            customer: { username: 'customer1', password: 'password123', role: 'customer' }
        },
        
        rate_limits: {
            authentication: '20 requests per 15 minutes',
            general: '100 requests per 15 minutes'
        },
        
        support: {
            email: 'support@ecommerce-api.com',
            documentation: 'https://github.com/your-repo/docs'
        }
    });
});

// Детальная документация
app.get('/api-docs', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requested_url: req.originalUrl,
        available_endpoints: ['/api/auth', '/api/products', '/api/orders', '/api/users', '/api/permissions']
    });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
    🚀 ${'='.repeat(50)}
    🛍️  E-commerce API Server Started!
    📍 Port: ${PORT}
    🌐 URL: http://localhost:${PORT}
    ${'='.repeat(50)}
    
    🔐 Authentication Endpoints:
       POST /api/auth/register    - Register new user
       POST /api/auth/login       - Login user
       GET  /api/auth/me          - Get current user
    
    🛒 Product Endpoints:
       GET  /api/products         - Get all products
       POST /api/products         - Create product (Seller+)
    
    📦 Order Endpoints:
       GET  /api/orders/my-orders - Get my orders
       POST /api/orders           - Create order
    
    👥 User Management:
       GET  /api/users            - Get all users (Moderator+)
    
    🔐 Role-Based Access:
       GET  /api/permissions/my-permissions - Check your permissions
    
    ${'='.repeat(50)}
    👑 Test Users (password: password123):
       Admin:     admin / admin@example.com
       Moderator: moderator / moderator@example.com
       Seller:    seller1 / seller1@example.com
       Customer:  customer1 / customer1@example.com
    
    📚 Full Documentation: http://localhost:${PORT}
    ${'='.repeat(50)}
    `);
});