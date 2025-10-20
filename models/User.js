import Database from '../db.js';
import bcrypt from 'bcryptjs';

class User {
    // Найти пользователя по ID
    static async findById(id) {
        try {
            const db = new Database();
            const users = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, created_at FROM users WHERE id = ?',
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

    // Создать нового пользователя
    static async create(userData) {
        try {
            const { username, email, password, first_name, last_name } = userData;
            
            // Хешируем пароль
            const hashedPassword = await bcrypt.hash(password, 12);
            
            const db = new Database();
            const result = await db.run(
                'INSERT INTO users (username, email, password, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, first_name || '', last_name || '']
            );
            
            const newUser = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, created_at FROM users WHERE id = ?',
                [result.id]
            );
            
            await db.close();
            return newUser[0];
        } catch (error) {
            throw error;
        }
    }

    // Проверить пароль
    static async checkPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
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
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, created_at FROM users WHERE id = ?',
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

    // Получить всех пользователей (для админа)
    static async getAll() {
        try {
            const db = new Database();
            const users = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, created_at FROM users ORDER BY created_at DESC'
            );
            await db.close();
            return users;
        } catch (error) {
            throw error;
        }
    }
}

export default User;