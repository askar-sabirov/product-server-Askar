import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

class AuthController {
    // Регистрация пользователя
    async register(req, res) {
        try {
            const { username, email, password, first_name, last_name } = req.body;

            // Валидация
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, email and password are required'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
            }

            // Проверяем, существует ли пользователь
            const existingUser = await User.findByEmail(email) || await User.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email or username already exists'
                });
            }

            // Создаем пользователя
            const user = await User.create({
                username,
                email,
                password,
                first_name,
                last_name
            });

            // Генерируем токен
            const token = generateToken(user.id);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        role: user.role
                    },
                    token
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during registration',
                error: error.message
            });
        }
    }

    // Вход пользователя
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Валидация
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            // Находим пользователя
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Проверяем активность пользователя
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated'
                });
            }

            // Проверяем пароль
            const isPasswordValid = await User.checkPassword(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Генерируем токен
            const token = generateToken(user.id);

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        role: user.role,
                        avatar: user.avatar ? `/uploads/users/${user.avatar}` : null
                    },
                    token
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during login',
                error: error.message
            });
        }
    }

    // Получить текущего пользователя
    async getMe(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    user: req.user
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

    // Обновить профиль пользователя
    async updateProfile(req, res) {
        try {
            const { first_name, last_name } = req.body;
            const avatar = req.file ? req.file.filename : undefined;

            const updateData = {};
            if (first_name !== undefined) updateData.first_name = first_name;
            if (last_name !== undefined) updateData.last_name = last_name;
            if (avatar !== undefined) updateData.avatar = avatar;

            // Если загружено новое изображение, удаляем старое
            if (avatar && req.user.avatar) {
                const fs = await import('fs');
                const { fileURLToPath } = await import('url');
                const { dirname, join } = await import('path');
                
                const __filename = fileURLToPath(import.meta.url);
                const __dirname = dirname(__filename);
                const oldImagePath = join(__dirname, '../uploads/users', req.user.avatar);
                
                try {
                    await fs.promises.unlink(oldImagePath);
                } catch (err) {
                    console.log('Could not delete old avatar:', err.message);
                }
            }

            const updatedUser = await User.update(req.user.id, updateData);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    user: updatedUser
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during profile update',
                error: error.message
            });
        }
    }

    // Сменить пароль
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters long'
                });
            }

            // Получаем полные данные пользователя для проверки пароля
            const user = await User.findByEmail(req.user.email);
            const isCurrentPasswordValid = await User.checkPassword(currentPassword, user.password);

            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            await User.changePassword(req.user.id, newPassword);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during password change',
                error: error.message
            });
        }
    }
}

export default new AuthController();