const express = require('express');
const router = express.Router();
const { getQuery, allQuery, runQuery } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// Получение списка ведущих с фильтрами
router.get('/', async (req, res) => {
    try {
        const { city, event_type, date, price_from, price_to, page = 1, limit = 10 } = req.query;
        
        let query = `
            SELECT 
                p.id,
                u.full_name,
                u.city,
                p.description,
                p.price_from,
                p.price_to,
                p.rating,
                p.photo_url,
                p.video_url,
                p.is_approved,
                GROUP_CONCAT(DISTINCT et.name) as event_types
            FROM performers p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN performer_event_types pet ON p.id = pet.performer_id
            LEFT JOIN event_types et ON pet.event_type_id = et.id
            WHERE p.is_approved = 1
        `;
        
        const params = [];
        const conditions = [];
        
        // Фильтр по городу
        if (city) {
            conditions.push('u.city LIKE ?');
            params.push(`%${city}%`);
        }
        
        // Фильтр по типу мероприятия
        if (event_type) {
            conditions.push('et.name = ?');
            params.push(event_type);
        }
        
        // Фильтр по дате (проверка доступности)
        if (date) {
            conditions.push(`
                p.id NOT IN (
                    SELECT performer_id 
                    FROM calendar 
                    WHERE date = ? AND status IN ('busy', 'pending')
                )
            `);
            params.push(date);
        }
        
        // Фильтр по цене
        if (price_from) {
            conditions.push('p.price_from >= ?');
            params.push(price_from);
        }
        
        if (price_to) {
            conditions.push('p.price_to <= ?');
            params.push(price_to);
        }
        
        // Добавляем условия в запрос
        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }
        
        // Группировка и сортировка
        query += ' GROUP BY p.id ORDER BY p.rating DESC';
        
        // Пагинация
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        // Выполняем запрос
        const performers = await allQuery(query, params);
        
        // Преобразуем event_types из строки в массив
        performers.forEach(performer => {
            performer.event_types = performer.event_types ? performer.event_types.split(',') : [];
        });
        
        // Получаем общее количество для пагинации
        let countQuery = `
            SELECT COUNT(DISTINCT p.id) as total
            FROM performers p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN performer_event_types pet ON p.id = pet.performer_id
            LEFT JOIN event_types et ON pet.event_type_id = et.id
            WHERE p.is_approved = 1
        `;
        
        const countParams = params.slice(0, -2); // Убираем LIMIT и OFFSET
        if (conditions.length > 0) {
            countQuery += ' AND ' + conditions.join(' AND ');
        }
        
        const countResult = await getQuery(countQuery, countParams);
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
        console.error('Ошибка получения списка ведущих:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении списка ведущих'
        });
    }
});

// Получение информации о конкретном ведущем
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const performer = await getQuery(`
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
                GROUP_CONCAT(DISTINCT et.name) as event_types,
                GROUP_CONCAT(DISTINCT et.id) as event_type_ids
            FROM performers p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN performer_event_types pet ON p.id = pet.performer_id
            LEFT JOIN event_types et ON pet.event_type_id = et.id
            WHERE p.id = ?
            GROUP BY p.id
        `, [id]);
        
        if (!performer) {
            return res.status(404).json({
                success: false,
                message: 'Ведущий не найден'
            });
        }
        
        // Преобразуем event_types из строки в массив
        performer.event_types = performer.event_types ? performer.event_types.split(',') : [];
        performer.event_type_ids = performer.event_type_ids ? performer.event_type_ids.split(',').map(id => parseInt(id)) : [];
        
        // Получаем календарь на ближайший месяц
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthStr = nextMonth.toISOString().split('T')[0];
        
        const calendar = await allQuery(`
            SELECT date, status
            FROM calendar
            WHERE performer_id = ? AND date BETWEEN ? AND ?
            ORDER BY date
        `, [id, today, nextMonthStr]);
        
        performer.calendar = calendar;
        
        res.json({
            success: true,
            data: performer
        });
        
    } catch (error) {
        console.error('Ошибка получения информации о ведущем:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении информации о ведущем'
        });
    }
});

// Создание/обновление карточки ведущего (только для ведущих)
router.post('/', authenticate, authorize('performer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { description, price_from, price_to, photo_url, video_url, event_types } = req.body;
        
        // Получаем ID ведущего по user_id
        const performer = await getQuery('SELECT id FROM performers WHERE user_id = ?', [userId]);
        
        if (!performer) {
            return res.status(404).json({
                success: false,
                message: 'Профиль ведущего не найден'
            });
        }
        
        // Обновляем информацию о ведущем
        await runQuery(`
            UPDATE performers 
            SET description = ?, price_from = ?, price_to = ?, photo_url = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [description, price_from, price_to, photo_url, video_url, performer.id]);
        
        // Обновляем типы мероприятий
        if (event_types && Array.isArray(event_types)) {
            // Удаляем старые связи
            await runQuery('DELETE FROM performer_event_types WHERE performer_id = ?', [performer.id]);
            
            // Добавляем новые связи
            for (const eventTypeId of event_types) {
                await runQuery(
                    'INSERT INTO performer_event_types (performer_id, event_type_id) VALUES (?, ?)',
                    [performer.id, eventTypeId]
                );
            }
        }
        
        // Получаем обновленного ведущего
        const updatedPerformer = await getQuery(`
            SELECT 
                p.id,
                u.full_name,
                u.city,
                p.description,
                p.price_from,
                p.price_to,
                p.rating,
                p.photo_url,
                p.video_url,
                p.is_approved,
                GROUP_CONCAT(DISTINCT et.name) as event_types
            FROM performers p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN performer_event_types pet ON p.id = pet.performer_id
            LEFT JOIN event_types et ON pet.event_type_id = et.id
            WHERE p.id = ?
            GROUP BY p.id
        `, [performer.id]);
        
        updatedPerformer.event_types = updatedPerformer.event_types ? updatedPerformer.event_types.split(',') : [];
        
        res.json({
            success: true,
            message: 'Карточка ведущего успешно обновлена',
            data: updatedPerformer
        });
        
    } catch (error) {
        console.error('Ошибка обновления карточки ведущего:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении карточки ведущего'
        });
    }
});

// Получение календаря ведущего
router.get('/:id/calendar', async (req, res) => {
    try {
        const { id } = req.params;
        const { start, end } = req.query;
        
        let query = 'SELECT date, status FROM calendar WHERE performer_id = ?';
        const params = [id];
        
        if (start && end) {
            query += ' AND date BETWEEN ? AND ?';
            params.push(start, end);
        }
        
        query += ' ORDER BY date';
        
        const calendar = await allQuery(query, params);
        
        res.json({
            success: true,
            data: calendar
        });
        
    } catch (error) {
        console.error('Ошибка получения календаря:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении календаря'
        });
    }
});

// Обновление календаря ведущего (только для ведущего)
router.put('/:id/calendar', authenticate, authorize('performer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const performerId = req.params.id;
        const { date, status } = req.body;
        
        // Проверяем, что ведущий обновляет свой собственный календарь
        const performer = await getQuery('SELECT id FROM performers WHERE id = ? AND user_id = ?', [performerId, userId]);
        
        if (!performer) {
            return res.status(403).json({
                success: false,
                message: 'Недостаточно прав для обновления календаря'
            });
        }
        
        // Проверяем, нет ли подтвержденных бронирований на эту дату
        if (status === 'free') {
            const existingBooking = await getQuery(`
                SELECT b.id 
                FROM bookings b
                JOIN calendar c ON b.id = c.booking_id
                WHERE c.performer_id = ? AND c.date = ? AND b.status = 'confirmed'
            `, [performerId, date]);
            
            if (existingBooking) {
                return res.status(400).json({
                    success: false,
                    message: 'Нельзя освободить дату с подтвержденным бронированием'
                });
            }
        }
        
        // Обновляем или создаем запись в календаре
        await runQuery(`
            INSERT OR REPLACE INTO calendar (performer_id, date, status)
            VALUES (?, ?, ?)
        `, [performerId, date, status]);
        
        res.json({
            success: true,
            message: 'Календарь успешно обновлен'
        });
        
    } catch (error) {
        console.error('Ошибка обновления календаря:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении календаря'
        });
    }
});

// Получение заявок ведущего
router.get('/:id/bookings', authenticate, authorize('performer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const performerId = req.params.id;
        const { status } = req.query;
        
        // Проверяем, что ведущий получает свои заявки
        const performer = await getQuery('SELECT id FROM performers WHERE id = ? AND user_id = ?', [performerId, userId]);
        
        if (!performer) {
            return res.status(403).json({
                success: false,
                message: 'Недостаточно прав для просмотра заявок'
            });
        }
        
        let query = `
            SELECT 
                b.id,
                b.event_date,
                b.status,
                b.client_message,
                b.created_at,
                b.expires_at,
                u.full_name as client_name,
                u.phone as client_phone,
                u.email as client_email
            FROM bookings b
            JOIN users u ON b.client_id = u.id
            WHERE b.performer_id = ?
        `;
        
        const params = [performerId];
        
        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY b.created_at DESC';
        
        const bookings = await allQuery(query, params);
        
        res.json({
            success: true,
            data: bookings
        });
        
    } catch (error) {
        console.error('Ошибка получения заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении заявок'
        });
    }
});

// Поиск ведущих по городу
router.get('/city/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const { limit = 5 } = req.query;
        
        const performers = await allQuery(`
            SELECT 
                p.id,
                u.full_name,
                u.city,
                p.description,
                p.price_from,
                p.price_to,
                p.rating,
                p.photo_url
            FROM performers p
            JOIN users u ON p.user_id = u.id
            WHERE u.city LIKE ? AND p.is_approved = 1
            ORDER BY p.rating DESC
            LIMIT ?
        `, [`%${city}%`, limit]);
        
        res.json({
            success: true,
            data: performers
        });
        
    } catch (error) {
        console.error('Ошибка поиска ведущих по городу:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при поиске ведущих'
        });
    }
});

module.exports = router;