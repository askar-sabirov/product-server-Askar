import express from 'express';
import { authenticateToken, requireAdmin } from './middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routers
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import userRoutes from './routes/userRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// Middleware
app.use(limiter);
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/public', express.static(join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// Static file routes (оставляем как есть)
app.get('/uploads/products/:filename', (req, res) => {
    res.sendFile(join(__dirname, 'uploads/products', req.params.filename));
});

app.get('/uploads/categories/:filename', (req, res) => {
    res.sendFile(join(__dirname, 'uploads/categories', req.params.filename));
});

// API Documentation
app.get('/', (req, res) => {
    res.json({
        message: 'E-commerce API with Router Architecture',
        endpoints: {
            'GET /api/auth/me': 'Get current user',
            'POST /api/auth/login': 'Login user',
            'POST /api/auth/register': 'Register user',
            
            'GET /api/products': 'Get all products with pagination',
            'GET /api/products/:id': 'Get product by ID',
            'POST /api/products': 'Create product (Auth)',
            
            'GET /api/orders/my-orders': 'Get user orders',
            'POST /api/orders': 'Create order (Auth)',
            
            'GET /api/reviews/product/:productId': 'Get product reviews',
            'POST /api/reviews': 'Create review (Auth)',
            
            'GET /api/categories': 'Get all categories',
            'GET /api/users': 'Get all users (Admin)'
        }
    });
});

// Error handling and server start...
app.listen(PORT, () => {
    console.log(`🛒 E-commerce API with Routers running on port ${PORT}`);
    console.log(`📚 Documentation: http://localhost:${PORT}`);
});