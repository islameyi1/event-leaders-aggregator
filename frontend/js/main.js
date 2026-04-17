// Основной JavaScript файл для агрегатора ведущих

const API_BASE_URL = 'http://localhost:3000/api';

// Утилиты
class Utils {
    static showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="loading-spinner"></div>';
        }
    }

    static showAlert(message, type = 'info', containerId = 'alerts') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        container.appendChild(alert);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    static formatPrice(price) {
        return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    static getToken() {
        return localStorage.getItem('token');
    }

    static setToken(token) {
        localStorage.setItem('token', token);
    }

    static removeToken() {
        localStorage.removeItem('token');
    }

    static isLoggedIn() {
        return !!this.getToken();
    }

    static getUserRole() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.role;
    }

    static redirectIfNotLoggedIn(requiredRole = null) {
        if (!this.isLoggedIn()) {
            window.location.href = '/login';
            return false;
        }

        if (requiredRole && this.getUserRole() !== requiredRole) {
            Utils.showAlert('Недостаточно прав для доступа к этой странице', 'danger');
            setTimeout(() => window.location.href = '/dashboard', 2000);
            return false;
        }

        return true;
    }
}

// API клиент
class ApiClient {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = Utils.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Неавторизован - редирект на логин
                    Utils.removeToken();
                    localStorage.removeItem('user');
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                }
                throw new Error(data.message || 'Ошибка сервера');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            Utils.showAlert(error.message, 'danger');
            throw error;
        }
    }

    // Аутентификация
    static async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    static async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async getCurrentUser() {
        return this.request('/auth/me');
    }

    static async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Ведущие
    static async getPerformers(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/performers?${params}`);
    }

    static async getPerformer(id) {
        return this.request(`/performers/${id}`);
    }

    static async getPerformerCalendar(performerId, start, end) {
        const params = new URLSearchParams({ start, end }).toString();
        return this.request(`/performers/${performerId}/calendar?${params}`);
    }

    static async updatePerformerProfile(profileData) {
        return this.request('/performers', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }

    // Бронирования
    static async createBooking(bookingData) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    }

    static async getUserBookings(status = null) {
        const params = status ? `?status=${status}` : '';
        return this.request(`/bookings/my${params}`);
    }

    static async updateBookingStatus(bookingId, status) {
        return this.request(`/bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    static async cancelBooking(bookingId) {
        return this.request(`/bookings/${bookingId}`, {
            method: 'DELETE'
        });
    }

    static async checkAvailability(performerId, date) {
        return this.request(`/bookings/availability/${performerId}?date=${date}`);
    }

    // Типы мероприятий
    static async getEventTypes() {
        return this.request('/event-types');
    }

    // Админ
    static async getAdminPerformers(status = null) {
        const params = status ? `?status=${status}` : '';
        return this.request(`/admin/performers${params}`);
    }

    static async approvePerformer(performerId, approve) {
        return this.request(`/admin/performers/${performerId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ approve })
        });
    }

    static async getAdminStats() {
        return this.request('/admin/stats');
    }
}

// Обработчики для главной страницы
class MainPage {
    static async init() {
        // Загружаем типы мероприятий для фильтра
        await this.loadEventTypes();
        
        // Загружаем популярных ведущих
        await this.loadPopularPerformers();
        
        // Настраиваем форму поиска
        this.setupSearchForm();
    }

    static async loadEventTypes() {
        try {
            const response = await ApiClient.getEventTypes();
            const select = document.getElementById('eventType');
            
            if (select && response.data) {
                response.data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.name;
                    option.textContent = type.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки типов мероприятий:', error);
        }
    }

    static async loadPopularPerformers() {
        const container = document.getElementById('performersList');
        if (!container) return;

        Utils.showLoading('performersList');

        try {
            const response = await ApiClient.getPerformers({ limit: 6 });
            
            if (response.data && response.data.performers.length > 0) {
                container.innerHTML = this.renderPerformers(response.data.performers);
            } else {
                container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Ведущие не найдены</p></div>';
            }
        } catch (error) {
            container.innerHTML = '<div class="col-12 text-center"><p class="text-danger">Ошибка загрузки ведущих</p></div>';
        }
    }

    static renderPerformers(performers) {
        return performers.map(performer => `
            <div class="col-md-4 mb-4">
                <div class="card performer-card h-100">
                    <img src="${performer.photo_url || 'https://via.placeholder.com/400x300?text=Ведущий'}" 
                         class="card-img-top performer-img" alt="${performer.full_name}">
                    <div class="card-body">
                        <h5 class="card-title">${performer.full_name}</h5>
                        <p class="card-text performer-city">
                            <i class="fas fa-map-marker-alt"></i> ${performer.city || 'Город не указан'}
                        </p>
                        <p class="card-text">${performer.description ? performer.description.substring(0, 100) + '...' : 'Описание отсутствует'}</p>
                        
                        <div class="performer-tags">
                            ${performer.event_types && performer.event_types.length > 0 
                                ? performer.event_types.map(type => `<span class="performer-tag">${type}</span>`).join('')
                                : '<span class="performer-tag">Разные мероприятия</span>'
                            }
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <div>
                                <span class="performer-price">${Utils.formatPrice(performer.price_from)}</span>
                                ${performer.price_to ? ` - ${Utils.formatPrice(performer.price_to)}` : ''}
                            </div>
                            <div class="performer-rating">
                                <i class="fas fa-star"></i> ${performer.rating || 'Нет'}
                            </div>
                        </div>
                        
                        <a href="/performer/${performer.id}" class="btn btn-primary w-100 mt-3">
                            <i class="fas fa-eye"></i> Подробнее
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    }

    static setupSearchForm() {
        const form = document.getElementById('searchForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const city = document.getElementById('city').value;
            const eventType = document.getElementById('eventType').value;
            const date = document.getElementById('date').value;
            const priceRange = document.getElementById('priceRange').value;
            
            const filters = {};
            if (city) filters.city = city;
            if (eventType) filters.event_type = eventType;
            if (date) filters.date = date;
            if (priceRange) {
                const [from, to] = priceRange.split('-');
                if (from) filters.price_from = from;
                if (to) filters.price_to = to;
            }

            // Сохраняем фильтры в localStorage для страницы результатов
            localStorage.setItem('searchFilters', JSON.stringify(filters));
            
            // Перенаправляем на страницу поиска (можно сделать модальное окно)
            Utils.showAlert('Поиск выполнен. Результаты загружаются...', 'info');
            await this.performSearch(filters);
        });
    }

    static async performSearch(filters) {
        const container = document.getElementById('performersList');
        if (!container) return;

        Utils.showLoading('performersList');

        try {
            const response = await ApiClient.getPerformers(filters);
            
            if (response.data && response.data.performers.length > 0) {
                container.innerHTML = `
                    <div class="col-12 mb-4">
                        <h4>Найдено ${response.data.performers.length} ведущих</h4>
                    </div>
                    ${this.renderPerformers(response.data.performers)}
                `;
            } else {
                container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">По вашему запросу ведущие не найдены</p></div>';
            }
        } catch (error) {
            container.innerHTML = '<div class="col-12 text-center"><p class="text-danger">Ошибка поиска</p></div>';
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, на какой странице мы находимся
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index.html') {
        MainPage.init();
    }
    
    // Проверяем авторизацию для защищенных страниц
    const protectedPages = ['/dashboard', '/admin', '/performer-profile'];
    if (protectedPages.some(page => path.includes(page))) {
        if (!Utils.isLoggedIn()) {
            window.location.href = '/login';
        }
    }
    
    // Отображаем информацию о пользователе в навигации
    updateNavigation();
});

// Обновление навигации в зависимости от авторизации
function updateNavigation() {
    const loginBtn = document.querySelector('a[href="/login"]');
    const registerBtn = document.querySelector('a[href="/register"]');
    const userMenu = document.getElementById('userMenu');
    
    if (Utils.isLoggedIn()) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        
        if (userMenu) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            userMenu.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user"></i> ${user.full_name || 'Пользователь'}
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/dashboard"><i class="fas fa-tachometer-alt"></i> Личный кабинет</a></li>
                        <li><hr class="dropdown-divider"></li>
                        ${user.role === 'admin' ? '<li><a class="dropdown-item" href="/admin"><i class="fas fa-cog"></i> Админ-панель</a></li>' : ''}
                        ${user.role === 'performer' ? '<li><a class="dropdown-item" href="/performer-profile"><i class="fas fa-user-tie"></i> Мой профиль</a></li>' : ''}
                        <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Выйти</a></li>
                    </ul>
                </div>
            `;
        }
    }
}

// Выход из системы
window.logout = function() {
    Utils.removeToken();
    localStorage.removeItem('user');
    window.location.href = '/';
};

// Экспорт для использования в других файлах
window.Utils = Utils;
window.ApiClient = ApiClient;