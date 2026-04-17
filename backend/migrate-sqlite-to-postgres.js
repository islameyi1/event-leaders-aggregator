#!/usr/bin/env node

/**
 * Скрипт для миграции данных из SQLite в PostgreSQL (Railway)
 * Использование: node migrate-sqlite-to-postgres.js
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

console.log('🚀 Начинаем миграцию данных из SQLite в PostgreSQL...');

// Проверяем переменные окружения
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL не найден в переменных окружения');
    console.log('📋 Добавь в .env файл:');
    console.log('   DATABASE_URL=postgresql://...');
    process.exit(1);
}

// Путь к локальной SQLite базе
const SQLITE_DB_PATH = path.join(__dirname, 'database.db');
const POSTGRES_URL = process.env.DATABASE_URL;

// Подключаемся к SQLite
console.log(`🔗 Подключаемся к SQLite: ${SQLITE_DB_PATH}`);
const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err.message);
        process.exit(1);
    }
    console.log('✅ Подключение к SQLite успешно');
});

// Подключаемся к PostgreSQL (Railway)
console.log('🔗 Подключаемся к PostgreSQL (Railway)...');
const pgPool = new Pool({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

// Список таблиц для миграции (в правильном порядке из-за foreign keys)
const TABLES_ORDER = [
    'users',
    'event_types', 
    'performers',
    'performer_event_types',
    'calendar',
    'bookings'
];

// Функция для получения структуры таблицы SQLite
function getTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                reject(err);
            } else {
                resolve(columns);
            }
        });
    });
}

// Функция для получения всех данных из таблицы SQLite
function getTableData(tableName) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Функция для создания таблицы в PostgreSQL
async function createPostgresTable(tableName, columns) {
    const pgClient = await pgPool.connect();
    
    try {
        // Создаем SQL для создания таблицы
        const columnDefs = columns.map(col => {
            let type = 'TEXT';
            
            // Преобразуем типы SQLite в PostgreSQL
            switch (col.type.toUpperCase()) {
                case 'INTEGER':
                case 'INT':
                    type = col.pk ? 'SERIAL PRIMARY KEY' : 'INTEGER';
                    break;
                case 'REAL':
                case 'FLOAT':
                case 'DOUBLE':
                    type = 'REAL';
                    break;
                case 'BOOLEAN':
                    type = 'BOOLEAN';
                    break;
                case 'DATETIME':
                case 'TIMESTAMP':
                    type = 'TIMESTAMP WITH TIME ZONE';
                    break;
                case 'DATE':
                    type = 'DATE';
                    break;
                default:
                    type = 'TEXT';
            }
            
            return `"${col.name}" ${type}`;
        }).join(', ');
        
        const createSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs})`;
        
        console.log(`   Создаем таблицу: ${tableName}`);
        await pgClient.query(createSQL);
        
        // Добавляем constraints если нужно
        if (tableName === 'bookings') {
            await pgClient.query(`
                ALTER TABLE bookings 
                ADD CONSTRAINT check_status 
                CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired'))
            `);
        }
        
        if (tableName === 'calendar') {
            await pgClient.query(`
                ALTER TABLE calendar 
                ADD CONSTRAINT check_status 
                CHECK (status IN ('free', 'busy', 'pending', 'blocked'))
            `);
        }
        
        if (tableName === 'users') {
            await pgClient.query(`
                ALTER TABLE users 
                ADD CONSTRAINT check_role 
                CHECK (role IN ('client', 'performer', 'admin'))
            `);
        }
        
    } catch (error) {
        console.error(`   ❌ Ошибка создания таблицы ${tableName}:`, error.message);
        throw error;
    } finally {
        pgClient.release();
    }
}

// Функция для вставки данных в PostgreSQL
async function insertDataToPostgres(tableName, rows, columns) {
    if (rows.length === 0) {
        console.log(`   📭 Таблица ${tableName} пуста, пропускаем`);
        return;
    }
    
    const pgClient = await pgPool.connect();
    
    try {
        // Подготавливаем имена колонок
        const columnNames = columns.map(col => `"${col.name}"`).join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertSQL = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`;
        
        console.log(`   📥 Вставляем ${rows.length} записей в ${tableName}...`);
        
        // Вставляем данные построчно
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const values = columns.map(col => {
                let value = row[col.name];
                
                // Преобразуем значения для PostgreSQL
                if (value === null || value === undefined) {
                    return null;
                }
                
                // Преобразуем булевы значения
                if (col.type.toUpperCase() === 'BOOLEAN') {
                    return value === 1 || value === true || value === 'true';
                }
                
                // Преобразуем даты
                if (col.type.toUpperCase().includes('DATE') || col.type.toUpperCase().includes('TIME')) {
                    return new Date(value).toISOString();
                }
                
                return value;
            });
            
            try {
                await pgClient.query(insertSQL, values);
            } catch (error) {
                console.error(`     ❌ Ошибка вставки строки ${i + 1}:`, error.message);
                console.error(`     Данные:`, row);
                // Продолжаем со следующей строкой
            }
            
            // Показываем прогресс каждые 50 записей
            if ((i + 1) % 50 === 0 || i === rows.length - 1) {
                process.stdout.write(`     Прогресс: ${i + 1}/${rows.length}\r`);
            }
        }
        
        console.log(`\n   ✅ Успешно вставлено ${rows.length} записей в ${tableName}`);
        
    } catch (error) {
        console.error(`   ❌ Ошибка вставки данных в ${tableName}:`, error.message);
        throw error;
    } finally {
        pgClient.release();
    }
}

// Основная функция миграции
async function migrateDatabase() {
    const pgClient = await pgPool.connect();
    
    try {
        console.log('\n📊 Проверяем подключение к PostgreSQL...');
        const result = await pgClient.query('SELECT NOW() as time');
        console.log(`✅ PostgreSQL подключен: ${result.rows[0].time}`);
        
        // Отключаем foreign key constraints для ускорения
        await pgClient.query('SET session_replication_role = replica;');
        
        console.log('\n🔄 Начинаем миграцию таблиц...');
        
        for (const tableName of TABLES_ORDER) {
            console.log(`\n📋 Таблица: ${tableName}`);
            
            try {
                // Проверяем существует ли таблица в SQLite
                const tableExists = await new Promise((resolve) => {
                    sqliteDb.get(
                        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                        [tableName],
                        (err, row) => resolve(!!row)
                    );
                });
                
                if (!tableExists) {
                    console.log(`   ⚠️  Таблица ${tableName} не найдена в SQLite, пропускаем`);
                    continue;
                }
                
                // Получаем структуру таблицы
                const columns = await getTableStructure(tableName);
                console.log(`   📐 Колонок: ${columns.length}`);
                
                // Создаем таблицу в PostgreSQL
                await createPostgresTable(tableName, columns);
                
                // Получаем данные из SQLite
                const rows = await getTableData(tableName);
                console.log(`   📊 Записей для миграции: ${rows.length}`);
                
                // Вставляем данные в PostgreSQL
                await insertDataToPostgres(tableName, rows, columns);
                
            } catch (error) {
                console.error(`   ❌ Ошибка миграции таблицы ${tableName}:`, error.message);
                // Продолжаем со следующей таблицей
            }
        }
        
        // Включаем foreign key constraints обратно
        await pgClient.query('SET session_replication_role = origin;');
        
        console.log('\n🎉 Миграция завершена!');
        
        // Выводим статистику
        console.log('\n📈 Статистика:');
        for (const tableName of TABLES_ORDER) {
            try {
                const result = await pgClient.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                console.log(`   ${tableName}: ${result.rows[0].count} записей`);
            } catch (error) {
                // Игнорируем ошибки для несуществующих таблиц
            }
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка миграции:', error);
        process.exit(1);
    } finally {
        pgClient.release();
    }
}

// Запускаем миграцию
migrateDatabase().then(() => {
    console.log('\n✅ Миграция успешно завершена!');
    console.log('🚀 Данные теперь в PostgreSQL на Railway');
    
    // Закрываем соединения
    sqliteDb.close();
    pgPool.end();
    
    process.exit(0);
}).catch(error => {
    console.error('❌ Ошибка при миграции:', error);
    process.exit(1);
});