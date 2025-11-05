import User from '../models/User.js';
import EmailService from '../services/emailService.js';
import { generateToken } from '../middleware/auth.js';
import multer from 'multer';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настройка multer для аватаров
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = join(__dirname, '../uploads/users');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
    }
});

export const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

class AuthController {
    async register(req, res) {
        try {
            const { username, email, password, first_name, last_name } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, email and password are required'
                });
            }

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            const user = await User.create({
                username,
                email,
                password,
                first_name,
                last_name
            });

            // Отправляем email для подтверждения
            const emailSent = await EmailService.sendVerificationEmail(
                email, 
                user.email_verification_token, 
                username
            );

            res.status(201).json({
                success: true,
                message: 'User registered successfully. Please check your email for verification.',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        role: user.role,
                        is_verified: false
                    }
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

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated'
                });
            }

            const isPasswordValid = await User.checkPassword(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Проверяем верификацию email (кроме админа)
            if (user.role !== 'admin' && !user.is_verified) {
                return res.status(403).json({
                    success: false,
                    message: 'Email not verified. Please check your email.',
                    needsVerification: true
                });
            }

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
                        is_verified: user.is_verified
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

    async verifyEmail(req, res) {
        try {
            const { token } = req.query;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification token is required'
                });
            }

            const user = await User.findByVerificationToken(token);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification token'
                });
            }

            await User.verifyEmail(user.id);

            res.json({
                success: true,
                message: 'Email verified successfully. You can now login.'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during email verification',
                error: error.message
            });
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const user = await User.findByEmail(email);
            if (user) {
                const resetToken = crypto.randomBytes(32).toString('hex');
                const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

                await User.setResetToken(user.id, resetToken, resetExpires);
                await EmailService.sendPasswordResetEmail(email, resetToken, user.username);
            }

            // Всегда возвращаем успех для безопасности
            res.json({
                success: true,
                message: 'If the email exists, password reset instructions have been sent'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Token and new password are required'
                });
            }

            const user = await User.findByResetToken(token);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }

            await User.resetPassword(user.id, newPassword);

            res.json({
                success: true,
                message: 'Password reset successfully'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during password reset',
                error: error.message
            });
        }
    }

    async updateProfile(req, res) {
        try {
            const { first_name, last_name } = req.body;
            const userId = req.user.id;

            // Базовая реализация - можно расширить
            const updateData = { first_name, last_name };
            const updatedUser = await User.update(userId, updateData);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: { user: updatedUser }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during profile update',
                error: error.message
            });
        }
    }

    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            const user = await User.findByEmail(req.user.email);
            const isCurrentPasswordValid = await User.checkPassword(currentPassword, user.password);

            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            await User.changePassword(userId, newPassword);

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