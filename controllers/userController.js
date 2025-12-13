import User, { ROLES } from '../models/User.js';
import Database from '../db.js';

class UserController {
    // Получить всех пользователей (только для админов и модераторов)
    async getAllUsers(req, res) {
        try {
            const { role, is_active, page = 1, limit = 20 } = req.query;
            const db = new Database();
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (role) {
                whereClause += ' AND role = ?';
                params.push(role);
            }
            
            if (is_active !== undefined) {
                whereClause += ' AND is_active = ?';
                params.push(is_active === 'true' ? 1 : 0);
            }
            
            const offset = (page - 1) * limit;
            
            const users = await db.query(
                `SELECT id, username, email, first_name, last_name, avatar, role, is_active, is_verified, created_at 
                 FROM users 
                 ${whereClause}
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
            
            const countResult = await db.query(
                `SELECT COUNT(*) as total FROM users ${whereClause}`,
                params
            );
            
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            res.json({
                success: true,
                count: users.length,
                total,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    items_per_page: parseInt(limit),
                    has_next: parseInt(page) < totalPages,
                    has_prev: parseInt(page) > 1
                },
                data: users
            });

            await db.close();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить пользователя по ID
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            
            // Проверяем права доступа
            // Админ и модератор могут видеть любого пользователя
            // Обычные пользователи могут видеть только себя
            if (req.user.role !== 'admin' && req.user.role !== 'moderator' && req.user.id.toString() !== id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view your own profile.'
                });
            }

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Активировать/деактивировать пользователя (только админ)
    async toggleUserActive(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
            // Получаем текущий статус пользователя
            const user = await db.query('SELECT id, is_active, role FROM users WHERE id = ?', [id]);
            
            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Нельзя деактивировать администратора
            if (user[0].role === 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot deactivate admin user'
                });
            }

            const newStatus = !user[0].is_active;
            
            await db.run(
                'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStatus ? 1 : 0, id]
            );

            await db.close();

            res.json({
                success: true,
                message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    user_id: id,
                    is_active: newStatus
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Изменить роль пользователя (только админ)
    async changeUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Role is required'
                });
            }

            const validRoles = Object.values(ROLES);
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid role. Valid roles: ${validRoles.join(', ')}`
                });
            }

            // Получаем информацию о пользователе
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Нельзя изменить роль администратора (кроме самого себя)
            if (user.role === 'admin' && req.user.id !== user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot change admin role'
                });
            }

            // Админ не может сделать другого пользователя администратором
            if (role === 'admin' && req.user.id !== user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Only self-promotion to admin is allowed'
                });
            }

            await User.changeRole(id, role);

            res.json({
                success: true,
                message: `User role changed from ${user.role} to ${role}`,
                data: {
                    user_id: id,
                    old_role: user.role,
                    new_role: role
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить информацию о ролях системы
    async getRoles(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    roles: ROLES,
                    descriptions: {
                        admin: {
                            name: 'Administrator',
                            description: 'Full system access. Can manage users, products, orders, and system settings.',
                            permissions: ['all']
                        },
                        moderator: {
                            name: 'Moderator', 
                            description: 'Content management. Can manage products, categories, reviews, and moderate users.',
                            permissions: ['view_users', 'edit_products', 'manage_categories', 'moderate_reviews', 'update_order_status']
                        },
                        seller: {
                            name: 'Seller',
                            description: 'Product management. Can create and manage own products, view own orders.',
                            permissions: ['create_products', 'edit_own_products', 'view_own_orders', 'update_own_orders', 'manage_own_products']
                        },
                        customer: {
                            name: 'Customer',
                            description: 'Basic shopping features. Can browse products, place orders, write reviews.',
                            permissions: ['view_products', 'create_orders', 'write_reviews', 'view_own_orders', 'cancel_own_orders']
                        }
                    },
                    stats: {
                        total_roles: Object.keys(ROLES).length,
                        hierarchy: ['admin', 'moderator', 'seller', 'customer']
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить статистику пользователей
    async getUserStats(req, res) {
        try {
            const db = new Database();
            
            // Статистика по ролям
            const roleStats = await db.query(`
                SELECT 
                    role,
                    COUNT(*) as count,
                    SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_count,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
                FROM users 
                GROUP BY role
                ORDER BY 
                    CASE role 
                        WHEN 'admin' THEN 1
                        WHEN 'moderator' THEN 2
                        WHEN 'seller' THEN 3
                        WHEN 'customer' THEN 4
                    END
            `);
            
            // Общая статистика
            const totalStats = await db.query(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as total_verified,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as total_active,
                    COUNT(DISTINCT role) as distinct_roles
                FROM users
            `);
            
            // Новые пользователи за последние 30 дней
            const newUsers = await db.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count,
                    GROUP_CONCAT(role) as roles
                FROM users 
                WHERE created_at >= DATE('now', '-30 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 10
            `);
            
            await db.close();
            
            res.json({
                success: true,
                data: {
                    overall: totalStats[0],
                    by_role: roleStats,
                    recent_activity: {
                        last_30_days: newUsers,
                        total_new: newUsers.reduce((sum, item) => sum + item.count, 0)
                    }
                }
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

export default new UserController();