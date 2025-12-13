import express from 'express';
import categoryController, { upload as categoryUpload } from '../controllers/categoryController.js';
import { authenticateToken, requireVerified, requireRole } from '../middleware/auth.js';

const router = express.Router();

// 🔓 Публичные маршруты

// Получить все категории
router.get('/', categoryController.getAllCategories);

// Получить категорию по ID
router.get('/:id', categoryController.getCategoryById);

// Получить категории с продуктами
router.get('/:id/with-products', categoryController.getCategoryWithProducts);

// 🔐 Защищенные маршруты

// Создать категорию - модераторы и админы
router.post('/', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator']),
    categoryUpload.single('image'), 
    categoryController.createCategory
);

// Обновить категорию - модераторы и админы
router.put('/:id', 
    authenticateToken, 
    requireVerified,
    requireRole(['admin', 'moderator']),
    categoryUpload.single('image'), 
    categoryController.updateCategory
);

// Удалить категорию - только админы
router.delete('/:id', 
    authenticateToken, 
    requireRole(['admin']),
    categoryController.deleteCategory
);

// Массовое обновление категорий
router.put('/batch/update', 
    authenticateToken, 
    requireRole(['admin']),
    categoryController.batchUpdateCategories
);

// Статистика категорий
router.get('/stats/overview', 
    authenticateToken, 
    requireRole(['admin', 'moderator']),
    categoryController.getCategoryStats
);

// Экспорт категорий
router.get('/export', 
    authenticateToken, 
    requireRole(['admin']),
    categoryController.exportCategories
);

export default router