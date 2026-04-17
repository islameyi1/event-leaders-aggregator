# Используем официальный Node.js образ
FROM node:18-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY backend/package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY backend/ ./
COPY frontend/ ../frontend/

# Создаем пользователя без привилегий
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Меняем владельца файлов
RUN chown -R nodejs:nodejs /app

# Переключаемся на пользователя без привилегий
USER nodejs

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server.js"]