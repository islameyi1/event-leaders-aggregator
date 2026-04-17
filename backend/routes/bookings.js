const express = require('express');
const router = express.Router();
const { getQuery, allQuery, runQuery } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// Создание заявки на бронирование
router.post('/', authenticate, authorize('client'), async (req, res) => {
    try {
        const clientId = req.user.id;
        const { performer_id, event_date, client_message } = req.body;
        
        // Валидация входных данных
        if (!performer_id || !event_date) {
            return res.status(400).json({
                success: false,
                message: 'Укажите ведущего и дату мероприятия'
            });
        }
        
        // Проверяем, существует ли ведущий
        const performer = await getQuery(`
            SELECT p.id, u.full_name
            FROM performers p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ? AND p.is_approved = 1
        `, [performer_id]);
        
        if (!performer) {
            return res.status(404).json({
                success: false,
                message: 'Ведущий не найден или не подтвержден'
            });
        }
        
        // Проверяем доступность даты
        const dateCheck = await getQuery(`
            SELECT status, booking_id
            FROM calendar
            WHERE performer_id = ? AND date = ?
        `, [performer_id, event_date]);
        
        if (dateCheck) {
            if (dateCheck.status === 'busy' || dateCheck.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Эта дата уже занята'
                });
            }
        }
        
        // Устанавливаем время истечения заявки (24 часа)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        // Создаем заявку
        const result = await runQuery(`
            INSERT INTO bookings (client_id, performer_id, event_date, status, client_message, expires_at)
            VALUES (?, ?, ?, 'pending', ?, ?)
        `, [clientId, performer_id, event_date, client_message || '', expiresAt.toISOString()]);
        
        // Обновляем календарь - временно блокируем дату
        await runQuery(`
            INSERT OR REPLACE INTO calendar (performer_id, date, status, booking_id)
            VALUES (?, ?, 'pending', ?)
        `, [performer_id, event_date, result.id]);
        
        // Получаем созданную заявку
        const booking = await getQuery(`
            SELECT 
                b.*,
                u.full_name as client_name,
                p.user_id as performer_user_id
            FROM bookings b
            JOIN users u ON b.client_id = u.id
            JOIN performers p ON b.performer_id = p.id
            WHERE b.id = ?
        `, [result.id]);
        
        res.status(201).json({
            success: true,
            message: 'Заявка успешно создана. Дата временно заблокирована на 24 часа.',
            data: booking
        });
        
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании заявки'
        });
    }
});

// Получение заявок клиента
router.get('/my', authenticate, authorize('client'), async (req, res) => {
    try {
        const clientId = req.user.id;
        const { status } = req.query;
        
        let query = `
            SELECT 
                b.id,
                b.event_date,
                b.status,
                b.client_message,
                b.created_at,
                b.expires_at,
                u.full_name as performer_name,
                u.phone as performer_phone,
                p.price_from,
                p.price_to,
                p.rating
            FROM bookings b
            JOIN performers p ON b.performer_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE b.client_id = ?
        `;
        
        const params = [clientId];
        
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
        console.error('Ошибка получения заявок клиента:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении заявок'
        });
    }
});

// Обновление статуса заявки (для ведущего)
router.put('/:id/status', authenticate, authorize('performer'), async (req, res) => {
    try {
        const userId = req.user.id;
        const bookingId = req.params.id;
        const { status } = req.body;
        
        if (!['confirmed', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный статус'
            });
        }
        
        // Проверяем, что заявка принадлежит ведущему
        const booking = await getQuery(`
            SELECT b.*, p.user_id as performer_user_id
            FROM bookings b
            JOIN performers p ON b.performer_id = p.id
            WHERE b.id = ?
        `, [bookingId]);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        if (booking.performer_user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Недостаточно прав для обновления этой заявки'
            });
        }
        
        // Проверяем, не истекло ли время заявки
        if (new Date(booking.expires_at) < new Date() && booking.status === 'pending') {
            // Автоматически отклоняем просроченные заявки
            await runQuery(`
                UPDATE bookings 
                SET status = 'expired' 
                WHERE id = ?
            `, [bookingId]);
            
            // Освобождаем дату в календаре
            await runQuery(`
                UPDATE calendar 
                SET status = 'free', booking_id = NULL 
                WHERE booking_id = ?
            `, [bookingId]);
            
            return res.status(400).json({
                success: false,
                message: 'Время на подтверждение заявки истекло'
            });
        }
        
        // Обновляем статус заявки
        await runQuery('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);
        
        // Обновляем календарь
        if (status === 'confirmed') {
            // Подтверждаем бронирование
            await runQuery(`
                UPDATE calendar 
                SET status = 'busy' 
                WHERE performer_id = ? AND date = ?
            `, [booking.performer_id, booking.event_date]);
        } else if (status === 'rejected') {
            // Отклоняем и освобождаем дату
            await runQuery(`
                UPDATE calendar 
                SET status = 'free', booking_id = NULL 
                WHERE booking_id = ?
            `, [bookingId]);
        }
        
        // Получаем обновленную заявку
        const updatedBooking = await getQuery(`
            SELECT 
                b.*,
                u.full_name as client_name,
                u.phone as client_phone,
                u.email as client_email
            FROM bookings b
            JOIN users u ON b.client_id = u.id
            WHERE b.id = ?
        `, [bookingId]);
        
        res.json({
            success: true,
            message: `Заявка успешно ${status === 'confirmed' ? 'подтверждена' : 'отклонена'}`,
            data: updatedBooking
        });
        
    } catch (error) {
        console.error('Ошибка обновления статуса заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении статуса заявки'
        });
    }
});

// Отмена заявки клиентом
router.delete('/:id', authenticate, authorize('client'), async (req, res) => {
    try {
        const clientId = req.user.id;
        const bookingId = req.params.id;
        
        // Проверяем, что заявка принадлежит клиенту
        const booking = await getQuery('SELECT * FROM bookings WHERE id = ? AND client_id = ?', [bookingId, clientId]);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        // Проверяем, можно ли отменить заявку
        if (booking.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Можно отменить только заявки со статусом "ожидание"'
            });
        }
        
        // Удаляем заявку
        await runQuery('DELETE FROM bookings WHERE id = ?', [bookingId]);
        
        // Освобождаем дату в календаре
        await runQuery(`
            UPDATE calendar 
            SET status = 'free', booking_id = NULL 
            WHERE booking_id = ?
        `, [bookingId]);
        
        res.json({
            success: true,
            message: 'Заявка успешно отменена'
        });
        
    } catch (error) {
        console.error('Ошибка отмены заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при отмене заявки'
        });
    }
});

// Проверка доступности даты
router.get('/availability/:performer_id', async (req, res) => {
    try {
        const { performer_id } = req.params;
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Укажите дату для проверки'
            });
        }
        
        // Проверяем существование ведущего
        const performer = await getQuery('SELECT id FROM performers WHERE id = ? AND is_approved = 1', [performer_id]);
        
        if (!performer) {
            return res.status(404).json({
                success: false,
                message: 'Ведущий не найден'
            });
        }
        
        // Проверяем доступность даты
        const availability = await getQuery(`
            SELECT status
            FROM calendar
            WHERE performer_id = ? AND date = ?
        `, [performer_id, date]);
        
        const isAvailable = !availability || availability.status === 'free';
        
        res.json({
            success: true,
            data: {
                date,
                available: isAvailable,
                status: availability ? availability.status : 'free'
            }
        });
        
    } catch (error) {
        console.error('Ошибка проверки доступности:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при проверке доступности'
        });
    }
});

// Получение детальной информации о заявке
router.get('/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const bookingId = req.params.id;
        
        // Получаем заявку с проверкой прав доступа
        const booking = await getQuery(`
            SELECT 
                b.*,
                u_client.full_name as client_name,
                u_client.phone as client_phone,
                u_client.email as client_email,
                u_performer.full_name as performer_name,
                u_performer.phone as performer_phone,
                u_performer.email as performer_email,
                p.user_id as performer_user_id
            FROM bookings b
            JOIN users u_client ON b.client_id = u_client.id
            JOIN performers p ON b.performer_id = p.id
            JOIN users u_performer ON p.user_id = u_performer.id
            WHERE b.id = ? AND (b.client_id = ? OR p.user_id = ?)
        `, [bookingId, userId, userId]);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена или недостаточно прав'
            });
        }
        
        res.json({
            success: true,
            data: booking
        });
        
    } catch (error) {
        console.error('Ошибка получения информации о заявке:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении информации о заявке'
        });
    }
});

// Автоматическая обработка просроченных заявок (вызывается по cron)
router.post('/cleanup-expired', async (req, res) => {
    try {
        // Находим просроченные заявки со статусом pending
        const expiredBookings = await allQuery(`
            SELECT id, performer_id, event_date
            FROM bookings
            WHERE status = 'pending' AND expires_at < datetime('now')
        `);
        
        let cleanedCount = 0;
        
        // Обновляем статус и освобождаем даты
        for (const booking of expiredBookings) {
            await runQuery('UPDATE bookings SET status = "expired" WHERE id = ?', [booking.id]);
            
            await runQuery(`
                UPDATE calendar 
                SET status = 'free', booking_id = NULL 
                WHERE performer_id = ? AND date = ?
            `, [booking.performer_id, booking.event_date]);
            
            cleanedCount++;
        }
        
        res.json({
            success: true,
            message: `Обработано ${cleanedCount} просроченных заявок`,
            data: { cleanedCount }
        });
        
    } catch (error) {
        console.error('Ошибка очистки просроченных заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обработке просроченных заявок'
        });
    }
});

module.exports = router;