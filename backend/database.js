const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

// Конфигурация подключения к PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Дополнительные настройки для Railway
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20
});

// Функция для выполнения SQL запросов
async function runQuery(sql, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return { id: result.rows[0]?.id, changes: result.rowCount, rows: result.rows };
    } finally {
        client.release();
    }
}

// Функция для получения одной записи
async function getQuery(sql, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

// Функция для получения нескольких записей
async function allQuery(sql, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    } finally {
        client.release();
    }
}

// Функция для выполнения миграций
async function runMigrations() {
    const client = await pool.connect();
    try {
        // Создаем таблицу для отслеживания миграций
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Получаем список выполненных миграций
        const executedMigrations = await client.query('SELECT name FROM migrations');
        const executedNames = executedMigrations.rows.map(row => row.name);

        // Читаем файлы миграций
        const migrationsDir = path.join(__dirname, 'db', 'migrations');
        let migrationFiles;
        
        try {
            migrationFiles = await fs.readdir(migrationsDir);
        } catch (error) {
            console.log('📁 Директория миграций не найдена, пропускаем...');
            return;
        }

        // Сортируем файлы по имени
        migrationFiles.sort();

        // Выполняем новые миграции
        for (const file of migrationFiles) {
            if (file.endsWith('.sql') && !executedNames.includes(file)) {
                console.log(`🔄 Выполняем миграцию: ${file}`);
                
                const migrationPath = path.join(migrationsDir, file);
                const migrationSQL = await fs.readFile(migrationPath, 'utf8');
                
                try {
                    await client.query('BEGIN');
                    await client.query(migrationSQL);
                    await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    await client.query('COMMIT');
                    
                    console.log(`✅ Миграция ${file} выполнена успешно`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    console.error(`❌ Ошибка выполнения миграции ${file}:`, error.message);
                    throw error;
                }
            }
        }
        
        console.log('✅ Все миграции выполнены');
    } finally {
        client.release();
    }
}

// Функция для проверки подключения к базе данных
async function checkDatabaseConnection() {
    try {
        const result = await pool.query('SELECT NOW() as time');
        console.log(`✅ Подключение к PostgreSQL установлено: ${result.rows[0].time}`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
        return false;
    }
}

// Функция для инициализации базы данных
async function initializeDatabase() {
    console.log('🔧 Инициализация базы данных...');
    
    // Проверяем подключение
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
        throw new Error('Не удалось подключиться к базе данных');
    }
    
    // Выполняем миграции
    await runMigrations();
    
    console.log('✅ База данных инициализирована успешно');
}

// Обработка ошибок подключения
pool.on('error', (err) => {
    console.error('❌ Неожиданная ошибка подключения к PostgreSQL:', err);
});

// Graceful shutdown
async function closeDatabase() {
    console.log('🔌 Закрытие подключений к базе данных...');
    await pool.end();
    console.log('✅ Подключения к базе данных закрыты');
}

// Экспорт функций
module.exports = {
    pool,
    initializeDatabase,
    runQuery,
    getQuery,
    allQuery,
    closeDatabase,
    checkDatabaseConnection
};