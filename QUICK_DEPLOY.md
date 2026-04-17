# 🚀 Быстрое развертывание на Railway

## 📋 Предварительные требования

1. **GitHub репозиторий** с проектом
2. **Railway аккаунт** (railway.app)
3. **Node.js 18+** локально (опционально)

## 🔧 Шаг 1: Подготовка проекта

### 1.1 Залить проект на GitHub
```bash
# Если еще не залил
git init
git add .
git commit -m "feat: готовый проект агрегатора ведущих"
git remote add origin https://github.com/ТВОЙ_ЮЗЕРНЕЙМ/event-leaders-aggregator.git
git push -u origin main
```

### 1.2 Проверить структуру проекта
Убедись что в корне есть:
- `backend/` - Node.js сервер
- `frontend/` - статические файлы
- `railway.toml` - конфигурация Railway
- `Dockerfile` - конфигурация Docker
- `npxpacks.toml` - конфигурация Nixpacks

## 🚀 Шаг 2: Развертывание на Railway

### Метод A: Через веб-интерфейс (рекомендуется)

1. **Зайди на** [railway.app](https://railway.app)
2. **Нажми "New Project"**
3. **Выбери "Deploy from GitHub repo"**
4. **Авторизуй GitHub** и выбери репозиторий
5. **Railway автоматически:**
   - Определит что это Node.js проект
   - Установит зависимости
   - Запустит приложение

### Метод B: Через Railway CLI

```bash
# Установи Railway CLI
npm install -g @railway/cli

# Войди в аккаунт
railway login

# Создай проект
railway init

# Добавь базу данных
railway add postgresql

# Деплой
railway up
```

## ⚙️ Шаг 3: Настройка переменных окружения

В Railway Dashboard:
1. **Settings** → **Variables**
2. **Добавь переменные:**

```env
NODE_ENV=production
JWT_SECRET=сгенерируй-случайный-ключ-32-символа
CORS_ORIGIN=https://твой-проект.railway.app
```

**Как сгенерировать JWT_SECRET:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## 🗄️ Шаг 4: Проверка базы данных

Railway автоматически:
1. Создаст PostgreSQL базу
2. Добавит DATABASE_URL в переменные
3. Запустит миграции при первом старте

**Проверь что БД работает:**
```bash
# Через Railway CLI
railway run npm run db:check
```

## 🌐 Шаг 5: Получение URL

После деплоя Railway выдаст URL вида:
```
https://event-leaders-aggregator-production.up.railway.app
```

**Проверь что работает:**
1. Открой URL в браузере
2. Проверь health check: `/health`
3. Проверь API: `/api/performers`

## 👤 Шаг 6: Тестовые пользователи

При первом запуске создаются автоматически:

| Роль | Email | Пароль |
|------|-------|--------|
| Админ | `admin@example.com` | `admin123` |
| Ведущий (Москва) | `performer@example.com` | `performer123` |
| Ведущий (Краснодар) | `krasnodar@example.com` | `krasnodar123` |
| Клиент | `client@example.com` | `client123` |

## 🔍 Шаг 7: Проверка функционала

1. **Открой сайт** по Railway URL
2. **Войди** как клиент → найди ведущего → забронируй
3. **Войди** как ведущий → проверь заявки → подтверди
4. **Войди** как админ → проверь статистику

## 🚨 Решение проблем

### Проблема: Приложение не запускается
```bash
# Проверь логи
railway logs

# Или через Dashboard
Project → Metrics → Logs
```

### Проблема: Ошибка базы данных
1. Проверь что DATABASE_URL есть в переменных
2. Перезапусти приложение:
```bash
railway restart
```

### Проблема: Статические файлы не загружаются
1. Проверь что `frontend/` папка в репозитории
2. Проверь путь в `server.js`

### Проблема: CORS ошибки
1. Проверь CORS_ORIGIN в переменных
2. Убедись что URL правильный

## 📈 Шаг 8: Дополнительные настройки

### Кастомный домен
1. **Settings** → **Domains**
2. **Добавь свой домен**
3. **Настрой DNS** (CNAME на railway.app)

### Автоматический деплой
1. **Settings** → **Git**
2. **Включи "Auto Deploy"**
3. При каждом пуше в main будет автоматический деплой

### Мониторинг
- **Логи:** Railway Dashboard → Metrics → Logs
- **Метрики:** CPU, RAM, Network
- **Health checks:** Автоматические проверки `/health`

## ✅ Чеклист успешного деплоя

- [ ] Проект залит на GitHub
- [ ] Railway проект создан
- [ ] База данных PostgreSQL добавлена
- [ ] Переменные окружения установлены
- [ ] Приложение запущено (статус "Deployed")
- [ ] Health check проходит (`/health`)
- [ ] Сайт открывается по Railway URL
- [ ] Тестовые пользователи работают

## 📞 Поддержка

- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Railway Discord:** [discord.gg/railway](https://discord.gg/railway)
- **GitHub Issues:** [github.com/railwayapp](https://github.com/railwayapp)

---

**🎉 Поздравляю! Твой агрегатор ведущих теперь в интернете!**

Дальнейшие шаги:
1. Пригласи первых пользователей
2. Настрой аналитику (Google Analytics)
3. Добавь email уведомления
4. Оптимизируй для SEO