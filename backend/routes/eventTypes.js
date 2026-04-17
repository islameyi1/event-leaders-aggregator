const express = require('express');
const router = express.Router();
const { getQuery, allQuery, runQuery } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// Получение всех типов мероприятий
router.get('/', async (req, res) => {
    try {
        const eventTypes = await allQuery(`
            SELECT 
                id,
                name,
                description,
                created_at
            FROM event_types
            ORDER BY name
        `);
        
        res.json({
            success: true,
            data: eventTypes
        });
        
    } catch (error) {
        console.error('Ошибка получения типов мероприятий:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении типов мероприятий'
        });
    }
});

// Получение конкретного типа мероприятия
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const eventType = await getQuery(`
            SELECT 
                id,
                name,
                description,
                created_at
            FROM event_types
            WHERE id = ?
        `, [id]);
        
        if (!eventType) {
            return res.status(404).json({
                success: false,
                message: 'Тип мероприятия не найден'
            });
        }
        
        res.json({
            success: true,
            data: eventType
        });
        
    } catch (error) {
        console.error('Ошибка получения типа мероприятия:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении типа мероприятия'
        });
    }
});

// Создание типа мероприятия (только админ)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Укажите название типа мероприятия'
            });
        }
        
        // Проверяем, существует ли уже такой тип
        const existingType = await getQuery('SELECT id FROM event_types WHERE name = ?', [name]);
        if (existingType) {
            return res.status(400).json({
                success: false,
                message: 'Тип мероприятия с таким названием уже существует'
            });
        }
        
        // Создаем тип мероприятия
        const result = await runQuery(
            'INSERT INTO event_types (name, description) VALUES (?, ?)',
            [name, description || null]
        );
        
        // Получаем созданный тип
        const eventType = await getQuery('SELECT * FROM event_types WHERE id = ?', [result.id]);
        
        res.status(201).json({
            success: true,
            message: 'Тип мероприятия успешно создан',
            data: eventType
        });
        
    } catch (error) {
        console.error('Ошибка создания типа мероприятия:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании типа мероприятия'
        });
    }
});

// Обновление типа мероприятия (только админ)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Укажите название типа мероприятия'
            });
        }
        
        // Проверяем существование типа
        const existingType = await getQuery('SELECT id FROM event_types WHERE id = ?', [id]);
        if (!existingType) {
            return res.status(404).json({
                success: false,
                message: 'Тип мероприятия не найден'
            });
        }
        
        // Проверяем, не занято ли имя другим типом
        const nameCheck = await getQuery('SELECT id FROM event_types WHERE name = ? AND id != ?', [name, id]);
        if (nameCheck) {
            return res.status(400).json({
                success: false,
                message: 'Тип мероприятия с таким названием уже существует'
            });
        }
        
        // Обновляем тип мероприятия
        await runQuery(
            'UPDATE event_types SET name = ?, description = ? WHERE id = ?',
            [name, description || null, id]
        );
        
        // Получаем обновленный тип
        const eventType = await getQuery('SELECT * FROM event_types WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Тип мероприятия успешно обновлен',
            data: eventType
        });
        
    } catch (error) {
        console.error('Ошибка обновления типа мероприятия:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении типа мероприятия'
        });
    }
});

// Удаление типа мероприятия (только админ)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем существование типа
        const existingType = await getQuery('SELECT id FROM event_types WHERE id = ?', [id]);
        if (!existingType) {
            return res.status(404).json({
                success: false,
                message: 'Тип мероприятия не найден'
            });
        }
        
        // Проверяем, используется ли тип мероприятия
        const usageCheck = await getQuery(`
            SELECT COUNT(*) as count 
            FROM performer_event_types 
            WHERE event_type_id = ?
        `, [id]);
        
        if (usageCheck.count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Невозможно удалить тип мероприятия, так как он используется ведущими'
            });
        }
        
        // Удаляем тип мероприятия
        await runQuery('DELETE FROM event_types WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Тип мероприятия успешно удален'
        });
        
    } catch (error) {
        console.error('Ошибка удаления типа мероприятия:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при удалении типа мероприятия'
        });
    }
});

// Получение ведущих по типу мероприятия
router.get('/:id/performers', async (req, res) => {
    try {
        const { id } = req.params;
        const { city, page = 1, limit = 10 } = req.query;
        
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
                p.is_approved
            FROM performers p
            JOIN users u ON p.user_id = u.id
            JOIN performer_event_types pet ON p.id = pet.performer_id
            WHERE pet.event_type_id = ? AND p.is_approved = 1
        `;
        
        const params = [id];
        
        if (city) {
            query += ' AND u.city LIKE ?';
            params.push(`%${city}%`);
        }
        
        query += ' ORDER BY p.rating DESC';
        
        // Пагинация
        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const performers = await allQuery(query, params);
        
        // Получаем общее количество
        let countQuery = `
            SELECT COUNT(*) as total
            FROM performers p
            JOIN users u ON p.user_id = u.id
            JOIN performer_event_types pet ON p.id = pet.performer_id
            WHERE pet.event_type_id = ? AND p.is_approved = 1
        `;
        
        const countParams = [id];
        if (city) {
            countQuery += ' AND u.city LIKE ?';
            countParams.push(`%${city}%`);
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
        console.error('Ошибка получения ведущих по типу мероприятия:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении ведущих'
        });
    }
});

module.exports = router;