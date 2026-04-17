const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Импорт модулей
const database = require('./database');
const authRoutes = require('./routes/auth');
const performerRoutes = require('./routes/performers');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const eventTypeRoutes = require('./routes/eventTypes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для продакшена
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(compression());
// Логирование для Railway
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// CORS настройка
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статические файлы (для фронтенда)
const staticOptions = {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    // Для Railway
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0');
        }
    }
};
app.use(express.static(path.join(__dirname, '../frontend'), staticOptions));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/performers', performerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/event-types', eventTypeRoutes);

// Health check endpoint (для Railway и мониторинга)
app.get('/health', async (req, res) => {
    try {
        // Для Railway: если нет DATABASE_URL, считаем что БД не требуется
        if (!process.env.DATABASE_URL) {
            return res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'event-leaders-aggregator',
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV,
                database: 'not_configured',
                message: 'База данных не настроена. Добавьте PostgreSQL в Railway.'
            });
        }
        
        // Проверяем подключение к базе данных
        const dbHealthy = await database.checkDatabaseConnection();
        
        if (!dbHealthy) {
            return res.status(503).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                service: 'event-leaders-aggregator',
                database: 'unhealthy'
            });
        }
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'event-leaders-aggregator',
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV,
            database: 'healthy'
        });
    } catch (error) {
        // Если ошибка подключения к БД, но приложение может работать
        if (error.message.includes('connect') || error.message.includes('DATABASE_URL')) {
            return res.status(200).json({
                status: 'degraded',
                timestamp: new Date().toISOString(),
                service: 'event-leaders-aggregator',
                database: 'unavailable',
                message: 'Приложение работает, но база данных недоступна'
            });
        }
        
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

app.get('/performer/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/performer.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/admin.html'));
});

// Инициализация базы данных
async function startServer() {
    try {
        await database.initializeDatabase();
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📁 Frontend: http://localhost:${PORT}`);
            console.log(`🔧 API: http://localhost:${PORT}/api`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
            console.log(`👤 Тестовый админ: admin@example.com / admin123`);
            console.log(`🎤 Тестовый ведущий: performer@example.com / performer123`);
            console.log(`👥 Тестовый клиент: client@example.com / client123`);
            console.log(`📍 Ведущий из Краснодара: krasnodar@example.com / krasnodar123`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 Получен SIGTERM, завершаем работу...');
            server.close(async () => {
                await database.closeDatabase();
                console.log('✅ Сервер остановлен');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('🛑 Получен SIGINT, завершаем работу...');
            server.close(async () => {
                await database.closeDatabase();
                console.log('✅ Сервер остановлен');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('🔥 Ошибка сервера:', {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Внутренняя ошибка сервера' 
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 обработчик
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Маршрут не найден'
    });
});

// Запуск сервера
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };