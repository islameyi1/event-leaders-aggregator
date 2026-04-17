-- Миграция 002: Начальные данные

-- Типы мероприятий
INSERT INTO event_types (name, description) VALUES
('Свадьба', 'Свадебные торжества и церемонии'),
('День рождения', 'Празднование дней рождения'),
('Корпоратив', 'Корпоративные мероприятия'),
('Выпускной', 'Выпускные вечера'),
('Презентация', 'Презентации продуктов и услуг'),
('Конференция', 'Конференции и форумы'),
('Детский праздник', 'Детские праздники и мероприятия'),
('Юбилей', 'Юбилейные торжества')
ON CONFLICT (name) DO NOTHING;

-- Администратор (пароль: admin123)
INSERT INTO users (email, password_hash, role, full_name, phone, city) VALUES
('admin@example.com', '$2a$10$X8zY7qNQ2Q1W3R4T5Y6U7I.O9P0Q1W2E3R4T5Y6U7I8O9P0Q1W2E3R4', 'admin', 'Администратор Системы', '+7 (999) 111-22-33', 'Москва')
ON CONFLICT (email) DO NOTHING;

-- Ведущий из Москвы (пароль: performer123)
INSERT INTO users (email, password_hash, role, full_name, phone, city) VALUES
('performer@example.com', '$2a$10$A1B2C3D4E5F6G7H8I9J0K.L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5', 'performer', 'Александр Ведущий', '+7 (999) 222-33-44', 'Москва')
ON CONFLICT (email) DO NOTHING;

INSERT INTO performers (user_id, description, price_from, price_to, rating, photo_url, is_approved) VALUES
((SELECT id FROM users WHERE email = 'performer@example.com'), 'Профессиональный ведущий с 10-летним опытом. Специализация: свадьбы, корпоративы, дни рождения.', 20000, 50000, 4.8, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', true)
ON CONFLICT (user_id) DO NOTHING;

-- Ведущий из Краснодара (пароль: krasnodar123)
INSERT INTO users (email, password_hash, role, full_name, phone, city) VALUES
('krasnodar@example.com', '$2a$10$K1L2M3N4O5P6Q7R8S9T0U.V1W2X3Y4Z5A6B7C8D9E0F1G2H3I4J5', 'performer', 'Иван Краснодарский', '+7 (861) 123-45-67', 'Краснодар')
ON CONFLICT (email) DO NOTHING;

INSERT INTO performers (user_id, description, price_from, price_to, rating, photo_url, is_approved) VALUES
((SELECT id FROM users WHERE email = 'krasnodar@example.com'), 'Ведущий из Краснодара. Специализация: свадьбы, корпоративы, дни рождения. Опыт работы 5 лет.', 15000, 40000, 4.7, 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&auto=format&fit=crop&w-400&q=80', true)
ON CONFLICT (user_id) DO NOTHING;

-- Клиент (пароль: client123)
INSERT INTO users (email, password_hash, role, full_name, phone, city) VALUES
('client@example.com', '$2a$10$C1D2E3F4G5H6I7J8K9L0M.N1O2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5', 'client', 'Иван Клиентов', '+7 (999) 333-44-55', 'Москва')
ON CONFLICT (email) DO NOTHING;

-- Связь ведущих и типов мероприятий
INSERT INTO performer_event_types (performer_id, event_type_id) VALUES
((SELECT id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'performer@example.com')), 1),
((SELECT id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'performer@example.com')), 2),
((SELECT id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'performer@example.com')), 3),
((SELECT id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'krasnodar@example.com')), 1),
((SELECT id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'krasnodar@example.com')), 2),
((SELECT id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'krasnodar@example.com')), 3)
ON CONFLICT (performer_id, event_type_id) DO NOTHING;

-- Календарь на ближайший месяц
DO $$
DECLARE
    performer1_id INTEGER;
    performer2_id INTEGER;
    i INTEGER;
    current_date DATE;
    status_text VARCHAR(20);
BEGIN
    -- Получаем ID ведущих
    SELECT id INTO performer1_id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'performer@example.com');
    SELECT id INTO performer2_id FROM performers WHERE user_id = (SELECT id FROM users WHERE email = 'krasnodar@example.com');
    
    -- Заполняем календарь на 30 дней
    FOR i IN 0..29 LOOP
        current_date := CURRENT_DATE + i;
        
        -- Для первого ведущего
        IF random() < 0.3 THEN
            status_text := 'busy';
        ELSE
            status_text := 'free';
        END IF;
        
        INSERT INTO calendar (performer_id, date, status) VALUES
        (performer1_id, current_date, status_text)
        ON CONFLICT (performer_id, date) DO NOTHING;
        
        -- Для второго ведущего
        IF random() < 0.4 THEN
            status_text := 'busy';
        ELSE
            status_text := 'free';
        END IF;
        
        INSERT INTO calendar (performer_id, date, status) VALUES
        (performer2_id, current_date, status_text)
        ON CONFLICT (performer_id, date) DO NOTHING;
    END LOOP;
END $$;