import Database from '../db.js';

class UserController {
    async getAllUsers(req, res) {
        try {
            const db = new Database();
            const users = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, is_verified, created_at FROM users ORDER BY created_at DESC'
            );
            
            res.json({
                success: true,
                count: users.length,
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

    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
            const users = await db.query(
                'SELECT id, username, email, first_name, last_name, avatar, role, is_active, is_verified, created_at FROM users WHERE id = ?',
                [id]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: users[0]
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

    async toggleUserActive(req, res) {
        try {
            const { id } = req.params;
            const db = new Database();
            
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

            res.json({
                success: true,
                message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
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
}

export default new UserController();