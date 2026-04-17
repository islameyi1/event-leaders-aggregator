#!/bin/bash

# Скрипт для развертывания на Railway

echo "🚀 Подготовка к развертыванию на Railway..."

# Проверяем наличие Railway CLI
if ! command -v railway &> /dev/null; then
    echo "📦 Установка Railway CLI..."
    npm install -g @railway/cli
fi

# Вход в Railway
echo "🔑 Вход в Railway..."
railway login

# Создание проекта
echo "🆕 Создание проекта на Railway..."
railway init

# Добавление базы данных PostgreSQL
echo "🗄️  Добавление PostgreSQL базы данных..."
railway add postgresql

# Установка переменных окружения
echo "⚙️  Настройка переменных окружения..."
railway variables set NODE_ENV production
railway variables set JWT_SECRET $(openssl rand -hex 32)
railway variables set CORS_ORIGIN "\$RAILWAY_STATIC_URL"

echo "📝 Переменные окружения:"
railway variables list

# Деплой
echo "🚀 Запуск деплоя..."
railway up

echo "✅ Деплой запущен! Проверь статус в Railway Dashboard."
echo "🌐 После деплоя приложение будет доступно по URL Railway"
echo "🔧 Тестовые пользователи будут созданы автоматически:"