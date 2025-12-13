import express from 'express';
import authController, { upload as userUpload } from '../controllers/authController.js';
import { authenticateToken, requireRole, requireVerified } from '../middleware/auth.js';

const router = express.Router();

// 🔓 Публичные маршруты (не требуют аутентификации)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// 🔐 Защищенные маршруты (требуют аутентификации)

// Информация о текущем пользователе - все авторизованные
router.get('/me', authenticateToken, authController.getMe);

// Обновление профиля - все авторизованные и верифицированные
router.put('/profile', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator', 'seller', 'customer']),
    userUpload.single('avatar'), 
    authController.updateProfile
);

// Смена пароля - все авторизованные
router.put('/change-password', 
    authenticateToken, 
    requireRole(['admin', 'moderator', 'seller', 'customer']),
    authController.changePassword
);

// Получить информацию о пользователе по ID - админы и модераторы
router.get('/user/:id', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    authController.getUserProfile
);

// Поиск пользователей - только админы
router.get('/search', 
    authenticateToken, 
    requireRole(['admin']),
    authController.searchUsers
);

// Статистика регистраций - админы и модераторы
router.get('/stats/registrations', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    authController.getRegistrationStats
);

// Экспорт пользователей (только админы)
router.get('/export', 
    authenticateToken, 
    requireRole(['admin']),
    authController.exportUsers
);

export default router;