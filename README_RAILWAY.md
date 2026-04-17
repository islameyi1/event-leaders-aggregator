# 🚀 Агрегатор ведущих мероприятий России

**Полнофункциональный веб-приложение для поиска и бронирования ведущих мероприятий по всей России.**

## 🌐 Онлайн демо

Развернуто на Railway: [https://event-leaders-aggregator-production.up.railway.app](https://event-leaders-aggregator-production.up.railway.app)

## 📋 Функционал

### 👥 Три роли пользователей:
1. **Клиент** - поиск ведущих, бронирование дат
2. **Ведущий** - управление календарем, заявки
3. **Админ** - модерация, статистика, управление

### 🔧 Основные возможности:
- 🔍 **Поиск ведущих** с фильтрами (город, дата, тип мероприятия, цена)
- 📅 **Календарь занятости** с FullCalendar
- 🎯 **Бронирование** с блокировкой дат на 24 часа
- 👤 **Личные кабинеты** для всех ролей
- 📊 **Админ-панель** с статистикой и модерацией
- 📱 **Адаптивный дизайн** на Bootstrap 5

## 🛠️ Технологии

### Бэкенд:
- **Node.js** + **Express** - серверная часть
- **PostgreSQL** - база данных (готово для Railway)
- **JWT** + **bcrypt** - аутентификация
- **Helmet** + **CORS** - безопасность

### Фронтенд:
- **HTML5** + **CSS3** + **Vanilla JS**
- **Bootstrap 5** - адаптивный дизайн
- **FullCalendar** - календарь занятости
- **Font Awesome** - иконки

### DevOps:
- **Railway** - хостинг и развертывание
- **Docker** - контейнеризация
- **PostgreSQL** - продакшен база данных
- **GitHub** - контроль версий

## 🚀 Быстрый старт

### Локальная разработка:
```bash
# Клонируй репозиторий
git clone <твой-репозиторий>
cd event-leaders-aggregator/backend

# Установи зависимости
npm install

# Запусти сервер
npm start

# Открой в браузере
# http://localhost:3000
```

### Тестовые аккаунты:
```
Админ:      admin@example.com      / admin123
Ведущий:    performer@example.com  / performer123
Клиент:     client@example.com     / client123
Краснодар:  krasnodar@example.com  / krasnodar123
```

## 🎯 Развертывание на Railway

### Простой способ (5 минут):
1. **Залить проект на GitHub**
2. **Создать проект на** [railway.app](https://railway.app)
3. **Подключить GitHub репозиторий**
4. **Railway сделает все автоматически**

### Подробная инструкция:
Смотри [QUICK_DEPLOY.md](QUICK_DEPLOY.md)

## 📁 Структура проекта

```
event-leaders-aggregator/
├── backend/                 # Node.js сервер
│   ├── server.js           # Основной сервер
│   ├── database.js         # PostgreSQL подключение
│   ├── routes/             # API эндпоинты
│   ├── db/migrations/      # Миграции базы данных
│   └── package.json        # Зависимости
├── frontend/               # Статические файлы
│   ├── index.html          # Главная страница
│   ├── pages/              # HTML страницы
│   ├── css/                # Стили
│   └── js/                 # JavaScript
├── railway.toml            # Конфигурация Railway
├── Dockerfile              # Конфигурация Docker
└── npxpacks.toml           # Конфигурация Nixpacks
```

## 🔧 API Endpoints

### Аутентификация:
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `GET /api/auth/me` - информация о пользователе

### Ведущие:
- `GET /api/performers` - поиск с фильтрами
- `GET /api/performers/:id` - информация о ведущем
- `GET /api/performers/:id/calendar` - календарь ведущего

### Бронирования:
- `POST /api/bookings` - создание заявки
- `GET /api/bookings/my` - заявки пользователя
- `PUT /api/bookings/:id/status` - обновление статуса

### Админ:
- `GET /api/admin/performers` - модерация ведущих
- `GET /api/admin/stats` - статистика
- `PUT /api/admin/performers/:id/approve` - подтверждение ведущего

## 🎮 Как тестировать

### Сценарий 1: Клиент ищет ведущего
1. Войти как `client@example.com`
2. Найти ведущего (попробуй "Краснодар")
3. Забронировать дату
4. Проверить заявки в личном кабинете

### Сценарий 2: Ведущий обрабатывает заявки
1. Войти как `performer@example.com`
2. Проверить заявки от клиентов
3. Подтвердить или отклонить
4. Управлять календарем занятости

### Сценарий 3: Админ модерирует
1. Войти как `admin@example.com`
2. Проверить админ-панель
3. Подтвердить новых ведущих
4. Просмотреть статистику

## 📈 Мониторинг

### Health Check:
```
GET /health
```
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "service": "event-leaders-aggregator",
  "database": "healthy"
}
```

### Railway Dashboard:
- Реальные логи приложения
- Метрики CPU, RAM, Network
- Автоматические health checks
- Статус деплоя

## 🔒 Безопасность

- **JWT аутентификация** с expires
- **Helmet.js** для HTTP заголовков безопасности
- **CORS** с ограничением по домену
- **Rate limiting** для защиты от DDoS
- **PostgreSQL** с правильными индексами
- **Environment variables** для секретов

## 📞 Поддержка

### Проблемы с развертыванием:
1. Проверь логи: `railway logs`
2. Проверь переменные: `railway variables list`
3. Проверь health check: `/health`

### Полезные ссылки:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [GitHub Issues](https://github.com/railwayapp/issues)

## 👨‍💻 Разработка

### Команды:
```bash
# Запуск в режиме разработки
npm run dev

# Запуск миграций базы данных
npm run migrate

# Проверка подключения к БД
npm run db:check

# Сброс базы данных (только для разработки!)
npm run db:reset
```

### Добавление нового функционала:
1. Создать миграцию базы данных
2. Добавить API endpoint
3. Обновить фронтенд
4. Протестировать локально
5. Залить на GitHub → автоматический деплой на Railway

## 📄 Лицензия

MIT License - смотри [LICENSE](LICENSE) файл

## 🤝 Вклад в проект

1. Форкни репозиторий
2. Создай feature branch
3. Внеси изменения
4. Создай Pull Request

---

**🎉 Проект готов к использованию в продакшене!**

Разверни на Railway и начни привлекать первых пользователей!