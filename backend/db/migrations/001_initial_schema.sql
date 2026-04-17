-- Миграция 001: Создание начальной схемы

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK(role IN ('client', 'performer', 'admin')),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Типы мероприятий
CREATE TABLE IF NOT EXISTS event_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ведущие
CREATE TABLE IF NOT EXISTS performers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    price_from INTEGER,
    price_to INTEGER,
    rating REAL DEFAULT 0,
    photo_url TEXT,
    video_url TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Связь ведущих и типов мероприятий
CREATE TABLE IF NOT EXISTS performer_event_types (
    performer_id INTEGER NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
    event_type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    PRIMARY KEY (performer_id, event_type_id)
);

-- Календарь занятости
CREATE TABLE IF NOT EXISTS calendar (
    id SERIAL PRIMARY KEY,
    performer_id INTEGER NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK(status IN ('free', 'busy', 'pending', 'blocked')),
    booking_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(performer_id, date)
);

-- Бронирования
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    performer_id INTEGER NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK(status IN ('pending', 'confirmed', 'rejected', 'expired')),
    client_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_performers_user_id ON performers(user_id);
CREATE INDEX IF NOT EXISTS idx_performers_is_approved ON performers(is_approved);
CREATE INDEX IF NOT EXISTS idx_calendar_performer_date ON calendar(performer_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at);