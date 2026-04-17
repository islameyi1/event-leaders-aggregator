const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getQuery, runQuery } = require('../database');
const { generateToken, isValidEmail, isValidPhone } = require('../middleware/auth');

// Регистрация пользователя
router.post('/register', async (req, res) => {
    try {
        const { email, password, role, full_name, phone, city } = req.body;

        // Валидация входных данных
        if (!email || !password || !role || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Заполните все обязательные поля'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный формат email'
            });
        }

        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный формат телефона. Используйте российский формат'
            });
        }

        if (!['client', 'performer'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Неверная роль пользователя'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Пароль должен содержать минимум 6 символов'
            });
        }

        // Проверка, существует ли пользователь с таким email
        const existingUser = await getQuery('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким email уже существует'
            });
        }

        // Хеширование пароля
        const passwordHash = await bcrypt.hash(password, 10);

        // Создание пользователя
        const result = await runQuery(
            'INSERT INTO users (email, password_hash, role, full_name, phone, city) VALUES (?, ?, ?, ?, ?, ?)',
            [email, passwordHash, role, full_name, phone || null, city || null]
        );

        // Если это ведущий, создаем запись в таблице performers
        if (role === 'performer') {
            await runQuery(
                'INSERT INTO performers (user_id, is_approved) VALUES (?, ?)',
                [result.id, 0] // По умолчанию не подтвержден
            );
        }

        // Генерация токена
        const token = generateToken(result.id);

        // Получаем созданного пользователя
        const user = await getQuery(
            'SELECT id, email, role, full_name, phone, city FROM users WHERE id = ?',
            [result.id]
        );

        res.status(201).json({
            success: true,
            message: 'Пользователь успешно зарегистрирован',
            data: {
                user,
                token
            }
        });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при регистрации пользователя'
        });
    }
});

// Вход пользователя
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Валидация входных данных
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Введите email и пароль'
            });
        }

        // Поиск пользователя
        const user = await getQuery(
            'SELECT id, email, password_hash, role, full_name, phone, city FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }

        // Проверка пароля
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Неверный email или пароль'
            });
        }

        // Генерация токена
        const token = generateToken(user.id);

        // Удаляем хеш пароля из ответа
        delete user.password_hash;

        res.json({
            success: true,
            message: 'Вход выполнен успешно',
            data: {
                user,
                token
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при входе в систему'
        });
    }
});

// Получение информации о текущем пользователе
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Требуется аутентификация'
            });
        }

        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Получаем пользователя
        const user = await getQuery(
            'SELECT id, email, role, full_name, phone, city FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        // Если это ведущий, получаем дополнительную информацию
        if (user.role === 'performer') {
            const performer = await getQuery(
                `SELECT p.*, 
                 GROUP_CONCAT(et.name) as event_types
                 FROM performers p
                 LEFT JOIN performer_event_types pet ON p.id = pet.performer_id
                 LEFT JOIN event_types et ON pet.event_type_id = et.id
                 WHERE p.user_id = ?
                 GROUP BY p.id`,
                [user.id]
            );
            
            if (performer) {
                user.performer = {
                    ...performer,
                    event_types: performer.event_types ? performer.event_types.split(',') : []
                };
            }
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Ошибка получения информации о пользователе:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении информации о пользователе'
        });
    }
});

// Выход пользователя (на клиенте просто удаляем токен)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Выход выполнен успешно'
    });
});

// Обновление профиля пользователя
router.put('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Требуется аутентификация'
            });
        }

        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const { full_name, phone, city } = req.body;

        // Валидация
        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный формат телефона'
            });
        }

        // Обновление пользователя
        await runQuery(
            'UPDATE users SET full_name = ?, phone = ?, city = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [full_name, phone || null, city || null, decoded.userId]
        );

        // Получаем обновленного пользователя
        const user = await getQuery(
            'SELECT id, email, role, full_name, phone, city FROM users WHERE id = ?',
            [decoded.userId]
        );

        res.json({
            success: true,
            message: 'Профиль успешно обновлен',
            data: user
        });

    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении профиля'
        });
    }
});

module.exports = router;