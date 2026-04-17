// Упрощенный сервер для локальной разработки
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// SQLite база данных
const db = new sqlite3.Database('./database.db');

// Инициализация базы данных
function initializeDatabase() {
    console.log('🔧 Инициализация SQLite базы данных...');
    
    // Создаем таблицы
    db.serialize(() => {
        // Пользователи
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('client', 'performer', 'admin')),
            full_name TEXT,
            phone TEXT,
            city TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        
        // Ведущие
        db.run(`CREATE TABLE IF NOT EXISTS performers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            description TEXT,
            price_from INTEGER,
            price_to INTEGER,
            rating REAL DEFAULT 0,
            photo_url TEXT,
            is_approved BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
        
        // Бронирования
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            performer_id INTEGER NOT NULL,
            event_date DATE NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES users(id),
            FOREIGN KEY (performer_id) REFERENCES performers(id)
        )`);
        
        console.log('✅ Таблицы созданы');
        
        // Создаем тестовых пользователей если их нет
        createTestUsers();
    });
}

// Создание тестовых пользователей
function createTestUsers() {
    const testUsers = [
        {
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin',
            name: 'Администратор'
        },
        {
            email: 'performer@example.com',
            password: 'performer123',
            role: 'performer',
            name: 'Александр Ведущий',
            city: 'Москва'
        },
        {
            email: 'krasnodar@example.com',
            password: 'krasnodar123',
            role: 'performer',
            name: 'Иван Краснодарский',
            city: 'Краснодар'
        },
        {
            email: 'client@example.com',
            password: 'client123',
            role: 'client',
            name: 'Иван Клиентов',
            city: 'Москва'
        }
    ];
    
    testUsers.forEach(user => {
        const passwordHash = bcrypt.hashSync(user.password, 10);
        
        db.get('SELECT id FROM users WHERE email = ?', [user.email], (err, row) => {
            if (!row) {
                db.run(
                    'INSERT INTO users (email, password_hash, role, full_name, city) VALUES (?, ?, ?, ?, ?)',
                    [user.email, passwordHash, user.role, user.name, user.city || 'Москва'],
                    function() {
                        if (user.role === 'performer') {
                            db.run(
                                'INSERT INTO performers (user_id, description, price_from, price_to, rating, is_approved) VALUES (?, ?, ?, ?, ?, ?)',
                                [this.lastID, 
                                 `Профессиональный ведущий из ${user.city}. Опыт работы 5 лет.`,
                                 15000, 40000, 4.7, 1]
                            );
                        }
                    }
                );
            }
        });
    });
    
    console.log('✅ Тестовые пользователи созданы');
}

// Простые API эндпоинты
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            'local-dev-secret',
            { expiresIn: '24h' }
        );
        
        res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role, name: user.full_name } });
    });
});

app.get('/api/performers', (req, res) => {
    const { city } = req.query;
    
    let sql = `
        SELECT p.*, u.full_name, u.city 
        FROM performers p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.is_approved = 1
    `;
    const params = [];
    
    if (city) {
        sql += ' AND u.city LIKE ?';
        params.push(`%${city}%`);
    }
    
    db.all(sql, params, (err, performers) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка базы данных' });
        }
        res.json({ success: true, data: { performers } });
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'event-leaders-aggregator-local'
    });
});

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

// Запуск сервера
initializeDatabase();

app.listen(PORT, () => {
    console.log(`🚀 Локальный сервер запущен на порту ${PORT}`);
    console.log(`📁 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`👤 Тестовые пользователи созданы`);
    console.log(`   Админ: admin@example.com / admin123`);
    console.log(`   Ведущий (Москва): performer@example.com / performer123`);
    console.log(`   Ведущий (Краснодар): krasnodar@example.com / krasnodar123`);
    console.log(`   Клиент: client@example.com / client123`);
});