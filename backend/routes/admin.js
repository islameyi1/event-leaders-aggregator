const express = require('express');
const router = express.Router();
const { getQuery, allQuery, runQuery } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// Получение списка ведущих для модерации
router.get('/performers', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        let query = `
            SELECT 
                p.id,
                u.full_name,
                u.email,
                u.phone,
                u.city,
                p.description,
                p.price_from,
                p.price_to,
                p.rating,
                p.photo_url,
                p.video_url,
                p.is_approved,
                p.created_at,
                GROUP_CONCAT(DISTINCT et.name) as event_types
            FROM performers p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN performer_event_types pet ON p.id = pet.performer_id
            LEFT JOIN event_types et ON pet.event_type_id = et.id
        `;
        
        const params = [];
        
        if (status === 'pending') {
            query += ' WHERE p.is_approved = 0';
        } else if (status === 'approved') {
            query += ' WHERE p.is_approved = 1';
        }
        
        query += ' GROUP BY p.id ORDER BY p.created_at DESC';
        
        // Пагинация
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const performers = await allQuery(query, params);
        
        // Преобразуем event_types из строки в массив
        performers.forEach(performer => {
            performer.event_types = performer.event_types ? performer.event_types.split(',') : [];
        });
        
        // Получаем общее количество
        let countQuery = 'SELECT COUNT(*) as total FROM performers';
        if (status === 'pending') {
            countQuery += ' WHERE is_approved = 0';
        } else if (status === 'approved') {
            countQuery += ' WHERE is_approved = 1';
        }
        
        const countResult = await getQuery(countQuery);
        const total = countResult.total;
        
        res.json({
            success: true,
            data: {
                performers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения списка ведущих для модерации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении списка ведущих'
        });
    }
});

// Подтверждение/отклонение ведущего
router.put('/performers/:id/approve', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { approve } = req.body;
        
        if (typeof approve !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Укажите параметр approve (true/false)'
            });
        }
        
        // Обновляем статус подтверждения
        await runQuery(
            'UPDATE performers SET is_approved = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [approve ? 1 : 0, id]
        );
        
        // Получаем обновленного ведущего
        const performer = await getQuery(`
            SELECT 
                p.id,
                u.full_name,
                u.email,
                p.is_approved
            FROM performers p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [id]);
        
        res.json({
            success: true,
            message: `Ведущий успешно ${approve ? 'подтвержден' : 'отклонен'}`,
            data: performer
        });
        
    } catch (error) {
        console.error('Ошибка обновления статуса ведущего:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении статуса ведущего'
        });
    }
});

// Получение всех пользователей
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;
        
        let query = `
            SELECT 
                id,
                email,
                role,
                full_name,
                phone,
                city,
                created_at
            FROM users
            WHERE role != 'admin'
        `;
        
        const params = [];
        
        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }
        
        query += ' ORDER BY created_at DESC';
        
        // Пагинация
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const users = await allQuery(query, params);
        
        // Получаем общее количество
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role != "admin"';
        if (role) {
            countQuery += ' AND role = ?';
        }
        
        const countResult = await getQuery(countQuery, role ? [role] : []);
        const total = countResult.total;
        
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения списка пользователей:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении списка пользователей'
        });
    }
});

// Получение всех бронирований
router.get('/bookings', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        let query = `
            SELECT 
                b.id,
                b.event_date,
                b.status,
                b.client_message,
                b.created_at,
                b.expires_at,
                u_client.full_name as client_name,
                u_client.email as client_email,
                u_performer.full_name as performer_name,
                u_performer.email as performer_email
            FROM bookings b
            JOIN users u_client ON b.client_id = u_client.id
            JOIN performers p ON b.performer_id = p.id
            JOIN users u_performer ON p.user_id = u_performer.id
        `;
        
        const params = [];
        
        if (status) {
            query += ' WHERE b.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY b.created_at DESC';
        
        // Пагинация
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const bookings = await allQuery(query, params);
        
        // Получаем общее количество
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM bookings
        `;
        if (status) {
            countQuery += ' WHERE status = ?';
        }
        
        const countResult = await getQuery(countQuery, status ? [status] : []);
        const total = countResult.total;
        
        res.json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения списка бронирований:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении списка бронирований'
        });
    }
});

// Получение статистики
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        // Общая статистика пользователей
        const userStats = await getQuery(`
            SELECT 
                role,
                COUNT(*) as count
            FROM users
            GROUP BY role
        `);
        
        // Статистика ведущих
        const performerStats = await getQuery(`
            SELECT 
                is_approved,
                COUNT(*) as count
            FROM performers
            GROUP BY is_approved
        `);
        
        // Статистика бронирований
        const bookingStats = await getQuery(`
            SELECT 
                status,
                COUNT(*) as count
            FROM bookings
            GROUP BY status
        `);
        
        // Статистика по городам
        const cityStats = await allQuery(`
            SELECT 
                u.city,
                COUNT(DISTINCT p.id) as performer_count,
                COUNT(DISTINCT b.id) as booking_count
            FROM users u
            LEFT JOIN performers p ON u.id = p.user_id AND p.is_approved = 1
            LEFT JOIN bookings b ON u.id = b.client_id
            WHERE u.city IS NOT NULL AND u.city != ''
            GROUP BY u.city
            ORDER BY performer_count DESC
            LIMIT 10
        `);
        
        // Ежедневная статистика бронирований за последние 30 дней
        const dailyStats = await allQuery(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as bookings_count,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
            FROM bookings
            WHERE created_at >= date('now', '-30 days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        
        res.json({
            success: true,
            data: {
                users: userStats,
                performers: performerStats,
                bookings: bookingStats,
                cities: cityStats,
                daily: dailyStats
            }
        });
        
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении статистики'
        });
    }
});

// Удаление пользователя (только админ)
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, что это не админ
        const user = await getQuery('SELECT role FROM users WHERE id = ?', [id]);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }
        
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Нельзя удалить администратора'
            });
        }
        
        // Удаляем пользователя (каскадное удаление через внешние ключи)
        await runQuery('DELETE FROM users WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Пользователь успешно удален'
        });
        
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении пользователя'
        });
    }
});

// Удаление бронирования (только админ)
router.delete('/bookings/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Получаем информацию о бронировании
        const booking = await getQuery('SELECT * FROM bookings WHERE id = ?', [id]);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Бронирование не найден'
            });
        }
        
        // Удаляем бронирование
        await runQuery('DELETE FROM bookings WHERE id = ?', [id]);
        
        // Освобождаем дату в календаре
        await runQuery(`
            UPDATE calendar 
            SET status = 'free', booking_id = NULL 
            WHERE booking_id = ?
        `, [id]);
        
        res.json({
            success: true,
            message: 'Бронирование успешно удалено'
        });
        
    } catch (error) {
        console.error('Ошибка удаления бронирования:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении бронирования'
        });
    }
});

module.exports = router;