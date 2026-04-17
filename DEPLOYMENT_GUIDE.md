# 🚀 Руководство по развертыванию на Railway

## 📋 Предварительные требования

### 1. Аккаунты
- [x] GitHub аккаунт
- [x] Railway аккаунт (railway.app)
- [x] (Опционально) Домен для кастомного URL

### 2. Локальная разработка
```bash
node --version  # >= 18.0.0
npm --version   # >= 8.0.0
git --version   # >= 2.0.0
```

## 🔧 Подготовка проекта

### 1. Клонирование и настройка
```bash
# Клонируй репозиторий
git clone <твой-репозиторий>
cd event-leaders-aggregator

# Установи зависимости
cd backend
npm install

# Создай .env файл
cp .env.example .env

# Отредактируй .env файл
nano .env
```

### 2. Конфигурация .env файла
```env
# Production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=твой-секретный-ключ-минимум-32-символа
CORS_ORIGIN=https://твой-домен.railway.app

# Development
# NODE_ENV=development
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/event_leaders
# CORS_ORIGIN=http://localhost:3000
```

## 🚀 Развертывание на Railway

### Метод 1: Через GitHub (рекомендуется)

1. **Подключи GitHub к Railway**
   - Зайди на [railway.app](https://railway.app)
   - Нажми "New Project"
   - Выбери "Deploy from GitHub repo"
   - Авторизуй GitHub
   - Выбери репозиторий `event-leaders-aggregator`

2. **Настрой переменные окружения**
   ```bash
   # Через Railway Dashboard
   Settings → Variables → Add Variables
   
   # Или через CLI
   railway variables set NODE_ENV production
   railway variables set JWT_SECRET твой-секретный-ключ
   ```

3. **Добавь базу данных**
   - В Railway Dashboard нажми "New" → "Database"
   - Выбери PostgreSQL
   - Railway автоматически добавит DATABASE_URL в переменные

4. **Деплой**
   - Railway автоматически деплоит при пуше в main
   - Или нажми "Manual Deploy" в Dashboard

### Метод 2: Через Railway CLI

```bash
# Установи Railway CLI
npm i -g @railway/cli

# Войди в аккаунт
railway login

# Инициализируй проект
railway init

# Создай базу данных
railway add postgresql

# Установи переменные окружения
railway variables set NODE_ENV production
railway variables set JWT_SECRET твой-секретный-ключ

# Деплой
railway up
```

## 🗄️ Настройка базы данных

### Автоматические миграции
При каждом деплое Railway автоматически:
1. Создает базу данных PostgreSQL
2. Запускает миграции из `backend/db/migrations/`
3. Заполняет тестовыми данными

### Ручное управление миграциями
```bash
# Проверь подключение к БД
npm run db:check

# Запусти миграции
npm run migrate

# Сбрось БД (только для разработки!)
npm run db:reset
```

## 🔒 Безопасность

### Обязательные настройки
1. **JWT Secret:** Минимум 32 случайных символа
2. **CORS Origin:** Только твой домен
3. **HTTPS:** Railway предоставляет автоматически
4. **Rate Limiting:** Включено по умолчанию

### Рекомендуемые настройки
```env
# В Railway Variables
ADMIN_EMAIL=твой-email@example.com
SENTRY_DSN=для-мониторинга-ошибок
LOG_LEVEL=info
```

## 📊 Мониторинг и логи

### Railway Dashboard
- **Metrics:** CPU, RAM, Network
- **Logs:** Реальные логи приложения
- **Health Checks:** Автоматические проверки /health

### Просмотр логов
```bash
# Через CLI
railway logs

# Через Dashboard
Project → Metrics → Logs
```

### Health Check
```
GET https://твой-проект.railway.app/health
```
Ответ:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "service": "event-leaders-aggregator",
  "database": "healthy"
}
```

## 🔄 Автоматический деплой

### Настройка GitHub Actions
Создай `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: railwayapp/action@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: event-leaders-aggregator
```

### Получение Railway Token
1. Railway Dashboard → Settings → Tokens
2. Generate New Token
3. Добавь в GitHub Secrets как `RAILWAY_TOKEN`

## 🌐 Домен и SSL

### Кастомный домен
1. **В Railway Dashboard:** Settings → Domains
2. **Добавь домен:** твой-домен.com
3. **Настрой DNS:** CNAME на railway.app
4. **SSL:** Автоматически от Let's Encrypt

### Проверка SSL
```bash
curl -I https://твой-домен.com
# Должен вернуть 200 OK
```

## 🚨 Решение проблем

### Проблема: Приложение не запускается
```bash
# Проверь логи
railway logs

# Проверь переменные
railway variables list

# Проверь health check
curl https://твой-проект.railway.app/health
```

### Проблема: Ошибка базы данных
1. Проверь DATABASE_URL в переменных
2. Убедись что БД запущена
3. Проверь миграции:
```bash
railway run npm run migrate
```

### Проблема: Статические файлы не загружаются
1. Проверь путь в server.js
2. Убедись что frontend/ папка в репозитории
3. Проверь права доступа

### Проблема: CORS ошибки
1. Проверь CORS_ORIGIN в переменных
2. Убедись что домен правильный
3. Перезапусти приложение

## 📈 Масштабирование

### Автоматическое масштабирование
Railway автоматически масштабирует:
- **По CPU:** > 80% более 5 минут
- **По RAM:** > 85% более 5 минут
- **По запросам:** > 1000 RPM

### Ручное масштабирование
```bash
# Увеличь RAM
railway scale memory 1024

# Увеличь CPU
railway scale cpu 1.0

# Увеличь количество инстансов
railway scale min 2
railway scale max 5
```

## 💰 Стоимость

### Бесплатный тариф
- 500 часов/месяц
- 1 ГБ RAM на инстанс
- 1 ГБ диск PostgreSQL
- Неограниченная пропускная способность

### Pro тариф ($20/месяц)
- Неограниченные часы
- Приоритетный деплой
- Резервные копии БД
- Приоритетная поддержка

## 📞 Поддержка

### Полезные ссылки
- [Railway Documentation](https://docs.railway.app)
- [Railway Status](https://status.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [GitHub Issues](https://github.com/railwayapp/issues)

### Контакты
- **Email:** support@railway.app
- **Twitter:** @railway_app
- **GitHub:** @railwayapp

## ✅ Чеклист развертывания

- [ ] Репозиторий на GitHub
- [ ] Railway проект создан
- [ ] PostgreSQL база добавлена
- [ ] Переменные окружения установлены
- [ ] Домен настроен (опционально)
- [ ] SSL сертификат активен
- [ ] Health check проходит
- [ ] Тестовые пользователи созданы
- [ ] Приложение доступно по URL

---

**🎉 Поздравляю! Твой агрегатор ведущих теперь работает в продакшене!**

Следующие шаги:
1. Пригласи первых пользователей
2. Настрой аналитику (Google Analytics)
3. Добавь мониторинг ошибок (Sentry)
4. Настрой email рассылку
5. Оптимизируй производительность