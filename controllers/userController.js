import User from '../models/User.js';

class UserController {
    // Получить всех пользователей (только для админа)
    async getAllUsers(req, res) {
        try {
            const users = await User.getAll();
            
            res.json({
                success: true,
                count: users.length,
                data: users
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }

    // Получить пользователя по ID (только для админа)
    async getUserById(req, res) {
        try {
            const { id } = req.params;
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

    // Активировать/деактивировать пользователя (только для админа)
    async toggleUserActive(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
            // Получаем текущий статус пользователя
            const user = await db.query('SELECT is_active FROM users WHERE id = ?', [id]);
            
            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
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
}

export default new UserController();