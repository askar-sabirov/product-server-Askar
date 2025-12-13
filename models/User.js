import Database from '../db.js';
import bcrypt from 'bcryptjs';

// Константы ролей
export const ROLES = {
    ADMIN: 'admin',
    MODERATOR: 'moderator', 
    SELLER: 'seller',
    CUSTOMER: 'customer'
};

// Проверка ролей
export const hasRole = (user, roles) => {
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
};

// Проверка прав доступа
export const can = (user, permission) => {
    const permissions = {
        [ROLES.ADMIN]: ['all'],
        [ROLES.MODERATOR]: [
            'view_users', 
            'edit_products', 
            'manage_categories',
            'moderate_reviews',
            'update_order_status'
        ],
        [ROLES.SELLER]: [
            'create_products', 
            'edit_own_products', 
            'view_own_orders',
            'update_own_orders',
            'manage_own_products'
        ],
        [ROLES.CUSTOMER]: [
            'view_products', 
            'create_orders', 
            'write_reviews',
            'view_own_orders',
            'cancel_own_orders'
        ]
    };

    if (permissions[user.role]?.includes('all')) return true;
    return permissions[user.role]?.includes(permission) || false;
};

class User {
    // Найти пользователя по ID
    static async findById(id) {
        try {
            const db = new Database();
            const users = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, is_verified, email_verification_token, password_reset_token, password_reset_expires, created_at FROM users WHERE id = ?',
                [id]
            );
            await db.close();
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw error;
        }
    }

    // Найти пользователя по email
    static async findByEmail(email) {
        try {
            const db = new Database();
            const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            await db.close();
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw error;
        }
    }

    // Найти пользователя по username
    static async findByUsername(username) {
        try {
            const db = new Database();
            const users = await db.query('SELECT * FROM users WHERE username = ?', [username]);
            await db.close();
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw error;
        }
    }

    // Найти по токену верификации
    static async findByVerificationToken(token) {
        try {
            const db = new Database();
            const users = await db.query(
                'SELECT * FROM users WHERE email_verification_token = ?',
                [token]
            );
            await db.close();
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw error;
        }
    }

    // Найти по токену сброса пароля
    static async findByResetToken(token) {
        try {
            const db = new Database();
            const users = await db.query(
                'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > ?',
                [token, new Date()]
            );
            await db.close();
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            throw error;
        }
    }

    // Создать нового пользователя
    static async create(userData) {
        try {
            const { username, email, password, first_name, last_name, role = ROLES.CUSTOMER } = userData;
            const hashedPassword = await bcrypt.hash(password, 12);
            const emailVerificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            const db = new Database();
            const result = await db.run(
                'INSERT INTO users (username, email, password, first_name, last_name, role, email_verification_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [username, email, hashedPassword, first_name || '', last_name || '', role, emailVerificationToken]
            );
            
            const newUser = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, is_verified, created_at FROM users WHERE id = ?',
                [result.id]
            );
            
            await db.close();
            return { ...newUser[0], email_verification_token: emailVerificationToken };
        } catch (error) {
            throw error;
        }
    }

    // Подтвердить email
    static async verifyEmail(userId) {
        try {
            const db = new Database();
            await db.run(
                'UPDATE users SET is_verified = 1, email_verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );
            await db.close();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Установить токен сброса пароля
    static async setResetToken(userId, token, expires) {
        try {
            const db = new Database();
            await db.run(
                'UPDATE users SET password_reset_token = ?, password_reset_expires = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [token, expires, userId]
            );
            await db.close();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Сбросить пароль
    static async resetPassword(userId, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            const db = new Database();
            await db.run(
                'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, userId]
            );
            await db.close();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Изменить роль пользователя
    static async changeRole(userId, newRole) {
        try {
            const validRoles = Object.values(ROLES);
            if (!validRoles.includes(newRole)) {
                throw new Error(`Invalid role. Valid roles: ${validRoles.join(', ')}`);
            }

            const db = new Database();
            await db.run(
                'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newRole, userId]
            );
            
            await db.close();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Обновить пользователя
    static async update(id, updateData) {
        try {
            const db = new Database();
            const { first_name, last_name, avatar } = updateData;
            
            const updateFields = [];
            const updateValues = [];
            
            if (first_name !== undefined) {
                updateFields.push('first_name = ?');
                updateValues.push(first_name);
            }
            
            if (last_name !== undefined) {
                updateFields.push('last_name = ?');
                updateValues.push(last_name);
            }
            
            if (avatar !== undefined) {
                updateFields.push('avatar = ?');
                updateValues.push(avatar);
            }
            
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);
            
            await db.run(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
            
            const updatedUser = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, is_verified, created_at FROM users WHERE id = ?',
                [id]
            );
            
            await db.close();
            return updatedUser[0];
        } catch (error) {
            throw error;
        }
    }

    // Сменить пароль
    static async changePassword(id, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            const db = new Database();
            
            await db.run(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, id]
            );
            
            await db.close();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Получить всех пользователей
    static async getAll() {
        try {
            const db = new Database();
            const users = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, is_verified, created_at FROM users ORDER BY created_at DESC'
            );
            await db.close();
            return users;
        } catch (error) {
            throw error;
        }
    }

    // Проверить пароль
    static async checkPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

export default User;
export { ROLES, hasRole, can };