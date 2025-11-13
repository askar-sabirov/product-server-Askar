import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

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

export const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

export const requireVerified = (req, res, next) => {
    if (!req.user.is_verified && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Email verification required'
        });
    }
    next();
};

export const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};