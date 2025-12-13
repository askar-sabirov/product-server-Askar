import express from 'express';
import userController from '../controllers/userController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 🔐 Все маршруты требуют аутентификации

// Получить информацию о ролях системы - админы и модераторы
router.get('/roles', 
    authenticateToken,
    requireRole(['admin', 'moderator']),
    userController.getRoles
);

// Получить всех пользователей - админы и модераторы
router.get('/', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    userController.getAllUsers
);

// Получить пользователя по ID
router.get('/:id', 
    authenticateToken,
    async (req, res, next) => {
        // Админы и модераторы могут видеть любого пользователя
        if (req.user.role === 'admin' || req.user.role === 'moderator') {
            return next();
        }
        
        // Обычные пользователи могут видеть только себя
        if (req.params.id === req.user.id.toString()) {
            return next();
        }
        
        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view your own profile.'
        });
    },
    userController.getUserById
);

// Активировать/деактивировать пользователя - только админы
router.patch('/:id/toggle-active', 
    authenticateToken, 
    requireRole(['admin']),
    userController.toggleUserActive
);

// Изменить роль пользователя - только админы
router.put('/:id/role', 
    authenticateToken, 
    requireRole(['admin']),
    userController.changeUserRole
);

// Статистика пользователей - админы и модераторы
router.get('/stats/overview', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    userController.getUserStats
);

// Поиск пользователей - админы и модераторы
router.get('/search/:query', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    async (req, res) => {
        try {
            // Реализация поиска пользователей
            res.json({
                success: true,
                message: 'Search endpoint - implement search logic'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
);

// Экспорт пользователей - только админы
router.get('/export', 
    authenticateToken, 
    requireRole(['admin']),
    async (req, res) => {
        try {
            // Реализация экспорта пользователей
            res.json({
                success: true,
                message: 'Export endpoint - implement export logic'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
);

// Массовые операции с пользователями - только админы
router.post('/batch', 
    authenticateToken, 
    requireRole(['admin']),
    async (req, res) => {
        try {
            // Реализация массовых операций
            res.json({
                success: true,
                message: 'Batch operations endpoint'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
);

export default router;