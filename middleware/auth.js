import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware для проверки JWT токена
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Проверяем верификацию email (кроме админа)
        if (user.role !== 'admin' && !user.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'Email not verified. Please check your email.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Middleware для проверки конкретной роли
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};

// Специальные middleware для конкретных ролей
export const requireAdmin = requireRole(['admin']);
export const requireModerator = requireRole(['admin', 'moderator']);
export const requireSeller = requireRole(['admin', 'moderator', 'seller']);
export const requireCustomer = requireRole(['admin', 'moderator', 'seller', 'customer']);

// Middleware для проверки верификации email
export const requireVerified = (req, res, next) => {
    if (!req.user.is_verified && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Email verification required'
        });
    }
    next();
};

// Middleware для проверки владения ресурсом
export const requireOwnershipOrRole = (resourceUserId, allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Если пользователь имеет нужную роль - пропускаем
        if (allowedRoles.includes(req.user.role)) {
            return next();
        }

        // Если это владелец ресурса - пропускаем
        const resourceId = typeof resourceUserId === 'function' 
            ? resourceUserId(req) 
            : resourceUserId;
            
        if (resourceId && resourceId.toString() === req.user.id.toString()) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own resources'
        });
    };
};

// Генерация JWT токена
export const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};