import nodemailer from 'nodemailer';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: 'smtp.mail.ru',
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });
    }

    async sendVerificationEmail(email, token, username) {
        const verificationUrl = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;
        
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Подтверждение регистрации - Product API',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Добро пожаловать, ${username}!</h2>
                    <p>Для завершения регистрации на Product API, пожалуйста, подтвердите ваш email адрес.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #667eea; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Подтвердить Email
                        </a>
                    </div>
                    <p>Если кнопка не работает, скопируйте эту ссылку в браузер:</p>
                    <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Ссылка действительна в течение 24 часов.
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Email sending error:', error);
            return false;
        }
    }

    async sendPasswordResetEmail(email, token, username) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Восстановление пароля - Product API',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Восстановление пароля</h2>
                    <p>Здравствуйте, ${username}!</p>
                    <p>Мы получили запрос на восстановление пароля для вашего аккаунта.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #667eea; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Восстановить пароль
                        </a>
                    </div>
                    <p>Если кнопка не работает, скопируйте эту ссылку в браузер:</p>
                    <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Ссылка действительна в течение 1 часа. Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Email sending error:', error);
            return false;
        }
    }
}

export default new EmailService();