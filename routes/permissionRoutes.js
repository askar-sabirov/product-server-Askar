import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { can, ROLES } from '../models/User.js';

const router = express.Router();

// 🔐 Все маршруты требуют аутентификации

// Проверить конкретное разрешение
router.get('/check', 
    authenticateToken,
    async (req, res) => {
        try {
            const { permission } = req.query;
            
            if (!permission) {
                return res.status(400).json({
                    success: false,
                    message: 'Permission parameter is required'
                });
            }

            const hasPermission = can(req.user, permission);

            res.json({
                success: true,
                data: {
                    user_id: req.user.id,
                    username: req.user.username,
                    role: req.user.role,
                    permission,
                    allowed: hasPermission,
                    message: hasPermission 
                        ? `Permission "${permission}" granted for role "${req.user.role}"`
                        : `Permission "${permission}" denied for role "${req.user.role}"`
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
);

// Получить все разрешения текущего пользователя
router.get('/my-permissions', 
    authenticateToken,
    (req, res) => {
        const permissions = {
            admin: {
                general: ['all'],
                users: ['view_users', 'edit_users', 'delete_users', 'change_user_roles'],
                products: ['create_products', 'edit_products', 'delete_products', 'manage_categories'],
                orders: ['view_orders', 'edit_orders', 'delete_orders', 'update_order_status'],
                reviews: ['view_reviews', 'edit_reviews', 'delete_reviews', 'moderate_reviews'],
                system: ['manage_settings', 'view_statistics', 'export_data']
            },
            moderator: {
                general: ['view_dashboard'],
                users: ['view_users', 'edit_users'],
                products: ['create_products', 'edit_products', 'manage_categories'],
                orders: ['view_orders', 'update_order_status'],
                reviews: ['view_reviews', 'moderate_reviews'],
                system: ['view_statistics']
            },
            seller: {
                general: ['view_dashboard'],
                products: ['create_products', 'edit_own_products', 'view_own_products'],
                orders: ['view_own_orders', 'update_own_order_status'],
                reviews: ['view_product_reviews', 'reply_to_reviews'],
                system: ['view_sales_statistics']
            },
            customer: {
                general: ['view_catalog'],
                products: ['view_products'],
                orders: ['create_orders', 'view_own_orders', 'cancel_own_orders'],
                reviews: ['write_reviews', 'edit_own_reviews', 'delete_own_reviews'],
                system: ['view_order_history']
            }
        };

        const userPermissions = permissions[req.user.role] || {};

        res.json({
            success: true,
            data: {
                user_id: req.user.id,
                username: req.user.username,
                role: req.user.role,
                role_description: getRoleDescription(req.user.role),
                permissions: userPermissions,
                permissions_flat: flattenPermissions(userPermissions),
                hierarchy_level: getHierarchyLevel(req.user.role)
            }
        });
    }
);

// Проверить несколько разрешений одновременно
router.post('/check-multiple', 
    authenticateToken,
    async (req, res) => {
        try {
            const { permissions } = req.body;
            
            if (!permissions || !Array.isArray(permissions)) {
                return res.status(400).json({
                    success: false,
                    message: 'Permissions array is required'
                });
            }

            const results = permissions.map(permission => ({
                permission,
                allowed: can(req.user, permission)
            }));

            const allAllowed = results.every(result => result.allowed);
            const anyAllowed = results.some(result => result.allowed);

            res.json({
                success: true,
                data: {
                    user_id: req.user.id,
                    role: req.user.role,
                    permissions: results,
                    summary: {
                        total_checked: permissions.length,
                        allowed_count: results.filter(r => r.allowed).length,
                        denied_count: results.filter(r => !r.allowed).length,
                        all_allowed: allAllowed,
                        any_allowed: anyAllowed
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
);

// Получить информацию о всех ролях и их разрешениях (только админы и модераторы)
router.get('/roles/permissions', 
    authenticateToken,
    requireRole(['admin', 'moderator']),
    (req, res) => {
        const allPermissions = {
            admin: getAllPermissionsForRole('admin'),
            moderator: getAllPermissionsForRole('moderator'),
            seller: getAllPermissionsForRole('seller'),
            customer: getAllPermissionsForRole('customer')
        };

        res.json({
            success: true,
            data: {
                roles: Object.keys(ROLES).map(key => ({
                    id: key,
                    name: ROLES[key],
                    description: getRoleDescription(ROLES[key]),
                    permissions_count: allPermissions[ROLES[key]]?.length || 0
                })),
                permissions_by_role: allPermissions,
                total_permissions: countTotalUniquePermissions(allPermissions)
            }
        });
    }
);

// Вспомогательные функции
function getRoleDescription(role) {
    const descriptions = {
        admin: 'Full system administrator with complete access',
        moderator: 'Content moderator with management privileges',
        seller: 'Product seller with inventory and order management',
        customer: 'Regular customer with shopping capabilities'
    };
    return descriptions[role] || 'Unknown role';
}

function getHierarchyLevel(role) {
    const hierarchy = {
        admin: 1,
        moderator: 2,
        seller: 3,
        customer: 4
    };
    return hierarchy[role] || 5;
}

function flattenPermissions(permissionObj) {
    const flat = [];
    for (const category in permissionObj) {
        flat.push(...permissionObj[category]);
    }
    return flat;
}

function getAllPermissionsForRole(role) {
    const permissions = {
        admin: ['all'],
        moderator: [
            'view_dashboard',
            'view_users', 'edit_users',
            'create_products', 'edit_products', 'manage_categories',
            'view_orders', 'update_order_status',
            'view_reviews', 'moderate_reviews',
            'view_statistics'
        ],
        seller: [
            'view_dashboard',
            'create_products', 'edit_own_products', 'view_own_products',
            'view_own_orders', 'update_own_order_status',
            'view_product_reviews', 'reply_to_reviews',
            'view_sales_statistics'
        ],
        customer: [
            'view_catalog',
            'view_products',
            'create_orders', 'view_own_orders', 'cancel_own_orders',
            'write_reviews', 'edit_own_reviews', 'delete_own_reviews',
            'view_order_history'
        ]
    };
    return permissions[role] || [];
}

function countTotalUniquePermissions(permissionsByRole) {
    const allPermissions = new Set();
    for (const role in permissionsByRole) {
        permissionsByRole[role].forEach(permission => allPermissions.add(permission));
    }
    return allPermissions.size;
}

export default router;