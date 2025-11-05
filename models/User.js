import Database from '../db.js';
import bcrypt from 'bcryptjs';

class User {
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

    static async create(userData) {
        try {
            const { username, email, password, first_name, last_name } = userData;
            const hashedPassword = await bcrypt.hash(password, 12);
            const emailVerificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            const db = new Database();
            const result = await db.run(
                'INSERT INTO users (username, email, password, first_name, last_name, email_verification_token) VALUES (?, ?, ?, ?, ?, ?)',
                [username, email, hashedPassword, first_name || '', last_name || '', emailVerificationToken]
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

    static async checkPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

export default User;