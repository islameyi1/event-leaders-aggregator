#!/usr/bin/env node

/**
 * Скрипт для сброса базы данных (только для разработки!)
 * ВНИМАНИЕ: Удалит все данные!
 */

const { Pool } = require('pg');
const readline = require('readline');
const path = require('path');
const fs = require('fs').promises;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function confirmReset() {
    return new Promise((resolve) => {
        rl.question('⚠️  ВНИМАНИЕ: Это удалит ВСЕ данные из базы данных!\nВведите "RESET" для подтверждения: ', (answer) => {
            rl.close();
            resolve(answer === 'RESET');
        });
    });
}

async function resetDatabase() {
    console.log('🔄 Начинаем сброс базы данных...');
    
    const confirmed = await confirmReset();
    if (!confirmed) {
        console.log('❌ Отменено пользователем');
        process.exit(0);
    }
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/event_leaders',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    
    try {
        console.log('🔧 Подключаемся к базе данных...');
        
        // Получаем список всех таблиц
        const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);
        
        const tables = tablesResult.rows.map(row => row.tablename);
        
        if (tables.length === 0) {
            console.log('✅ База данных уже пуста');
            return;
        }
        
        // Отключаем foreign key constraints
        await client.query('SET session_replication_role = replica;');
        
        // Удаляем все таблицы
        console.log(`🗑️  Удаляем ${tables.length} таблиц...`);
        for (const table of tables) {
            if (table !== 'spatial_ref_sys') { // Исключаем PostGIS таблицу если есть
                console.log(`   Удаляем таблицу: ${table}`);
                await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
            }
        }
        
        // Включаем foreign key constraints обратно
        await client.query('SET session_replication_role = origin;');
        
        console.log('✅ Все таблицы удалены');
        
        // Запускаем миграции заново
        console.log('🔄 Запускаем миграции...');
        
        const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
        const migrationFiles = await fs.readdir(migrationsDir);
        migrationFiles.sort();
        
        for (const file of migrationFiles) {
            if (file.endsWith('.sql')) {
                console.log(`   Выполняем: ${file}`);
                const migrationPath = path.join(migrationsDir, file);
                const migrationSQL = await fs.readFile(migrationPath, 'utf8');
                await client.query(migrationSQL);
            }
        }
        
        console.log('✅ База данных успешно сброшена и переинициализирована');
        console.log('👤 Тестовые пользователи созданы:');
        console.log('   Админ: admin@example.com / admin123');
        console.log('   Ведущий: performer@example.com / performer123');
        console.log('   Клиент: client@example.com / client123');
        console.log('   Краснодар: krasnodar@example.com / krasnodar123');
        
    } catch (error) {
        console.error('❌ Ошибка при сбросе базы данных:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Запускаем сброс
resetDatabase().catch(console.error);