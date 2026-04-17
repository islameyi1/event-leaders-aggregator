# Развертывание на Railway

## 🚀 Быстрый старт

### 1. Подготовка репозитория
```bash
# Клонируй репозиторий (если еще не сделал)
git clone <твой-репозиторий>
cd event-leaders-aggregator

# Добавь все файлы
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Развертывание на Railway

#### Вариант A: Через GitHub (рекомендуется)
1. Зайди на [railway.app](https://railway.app)
2. Нажми "New Project"
3. Выбери "Deploy from GitHub repo"
4. Подключи свой GitHub аккаунт
5. Выбери репозиторий `event-leaders-aggregator`
6. Railway автоматически определит настройки

#### Вариант B: Через Railway CLI
```bash
# Установи Railway CLI
npm i -g @railway/cli

# Войди в аккаунт
railway login

# Создай проект
railway init

# Разверни
railway up
```

### 3. Настройка переменных окружения
В Railway Dashboard:
1. Перейди в настройки проекта
2. Выбери вкладку "Variables"
3. Добавь переменные:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=твой-секретный-ключ-из-32-символов
CORS_ORIGIN=твой-домен.railway.app
```

### 4. Получение домена
После деплоя Railway выдаст домен вида:
```
https://event-leaders-aggregator-production.up.railway.app
```

## 🔧 Конфигурация для продакшена

### База данных
Railway предоставляет PostgreSQL. Для перехода с SQLite:

1. В Railway создай новую базу данных (PostgreSQL)
2. Получи connection string
3. Обнови переменные окружения:
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

### SSL/HTTPS
Railway автоматически предоставляет:
- HTTPS сертификат (Let's Encrypt)
- Домен с SSL
- CDN и кэширование

## 📊 Мониторинг

Railway предоставляет:
- **Логи** в реальном времени
- **Метрики** CPU, RAM, трафик
- **Алерты** при ошибках
- **Авто-деплой** при пуше в GitHub

## 🚨 Решение проблем

### Проблема: Приложение не запускается
```bash
# Проверь логи
railway logs

# Проверь переменные окружения
railway vars
```

### Проблема: Ошибка базы данных
1. Убедись что DATABASE_URL правильный
2. Проверь что БД создана и доступна
3. Перезапусти приложение:
```bash
railway restart
```

### Проблема: Статические файлы не загружаются
1. Проверь путь к фронтенду в server.js
2. Убедись что файлы есть в репозитории
3. Проверь права доступа

## 🔄 Автоматическое обновление

Настрой GitHub Actions для автоматического деплоя:

1. В Railway Dashboard → Settings → Git
2. Включи "Auto Deploy"
3. При каждом пуше в main будет автоматический деплой

## 💰 Тарифы

Railway предлагает:
- **Бесплатный тариф:** 500 часов/мес, 1 ГБ RAM, 1 ГБ диск
- **Pro тариф:** $20/мес, безлимитные часы, приоритетная поддержка

## 📞 Поддержка

- **Документация:** [docs.railway.app](https://docs.railway.app)
- **Discord:** [railway.app/discord](https://railway.app/discord)
- **GitHub Issues:** [github.com/railwayapp](https://github.com/railwayapp)

## ✅ Проверка работоспособности

После деплоя проверь:
1. Главная страница: `https://твой-домен.railway.app`
2. API: `https://твой-домен.railway.app/api/performers`
3. Вход: `https://твой-домен.railway.app/login`

Тестовые аккаунты будут созданы автоматически при первом запуске.