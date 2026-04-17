const jwt = require('jsonwebtoken');
const { getQuery } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware для проверки аутентификации
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Требуется аутентификация'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Получаем пользователя из базы данных
        const user = await getQuery(
            'SELECT id, email, role, full_name, phone, city FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Ошибка аутентификации:', error);
        res.status(401).json({
            success: false,
            message: 'Неверный токен аутентификации'
        });
    }
};

// Middleware для проверки роли
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Требуется аутентификация'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Недостаточно прав'
            });
        }

        next();
    };
};

// Генерация JWT токена
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Валидация email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Валидация телефона (российский формат)
const isValidPhone = (phone) => {
    const phoneRegex = /^(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/;
    return phoneRegex.test(phone);
};

module.exports = {
    authenticate,
    authorize,
    generateToken,
    isValidEmail,
    isValidPhone
};