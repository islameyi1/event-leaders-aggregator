// Скрипт для проверки подключения к базе данных Railway
require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Проверка подключения к базе данных Railway...');

// Проверяем есть ли DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL не найден в переменных окружения');
    console.log('📋 Как добавить:');
    console.log('1. В Railway Dashboard: Settings → Variables');
    console.log('2. Добавь переменную DATABASE_URL');
    console.log('3. Значение: postgresql://... (Railway создает автоматически)');
    process.exit(1);
}

console.log('✅ DATABASE_URL найден');
console.log('🔗 Подключаемся к базе данных...');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    const client = await pool.connect();
    try {
        // Проверяем подключение
        const result = await client.query('SELECT NOW() as time, version() as version');
        console.log('✅ Подключение успешно!');
        console.log(`⏰ Время сервера: ${result.rows[0].time}`);
        console.log(`📊 Версия PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
        
        // Проверяем существующие таблицы
        const tables = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);
        
        console.log(`📋 Найдено таблиц: ${tables.rows.length}`);
        if (tables.rows.length > 0) {
            console.log('📊 Таблицы в базе:');
            tables.rows.forEach((row, i) => {
                console.log(`   ${i + 1}. ${row.tablename}`);
            });
        } else {
            console.log('📝 База данных пуста, можно запускать миграции');
        }
        
    } catch (error) {
        console.error('❌ Ошибка подключения к базе данных:');
        console.error(`   Сообщение: ${error.message}`);
        console.error(`   Код: ${error.code}`);
        
        if (error.code === '28P01') {
            console.log('\n🔑 Проблема с аутентификацией:');
            console.log('   - Проверь пароль в DATABASE_URL');
            console.log('   - Railway мог изменить пароль');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n🌐 Проблема с подключением:');
            console.log('   - Проверь хост и порт в DATABASE_URL');
            console.log('   - База данных может быть не запущена');
        }
        
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

testConnection();