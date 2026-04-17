// JavaScript для личного кабинета

document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    if (!Utils.isLoggedIn()) {
        window.location.href = '/login';
        return;
    }

    // Инициализация
    await initDashboard();
});

async function initDashboard() {
    try {
        // Загружаем данные пользователя
        const userResponse = await ApiClient.getCurrentUser();
        
        if (userResponse.success) {
            const user = userResponse.data;
            
            // Отображаем информацию о пользователе
            displayUserInfo(user);
            
            // Настраиваем вкладки в зависимости от роли
            setupRoleSpecificTabs(user.role);
            
            // Загружаем данные для вкладок
            if (user.role === 'client') {
                await loadClientData();
            } else if (user.role === 'performer') {
                await loadPerformerData(user);
            } else if (user.role === 'admin') {
                await loadAdminData();
            }
            
            // Настраиваем формы
            setupForms(user);
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        Utils.showAlert('Ошибка загрузки данных', 'danger', 'alerts');
    }
}

function displayUserInfo(user) {
    // Основная информация
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('userEmail').textContent = user.email;
    
    // Бейдж роли
    const roleBadge = document.getElementById('userRoleBadge');
    roleBadge.textContent = getRoleName(user.role);
    roleBadge.className = `badge bg-${getRoleColor(user.role)}`;
    
    // Профиль
    document.getElementById('profileFullName').textContent = user.full_name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profilePhone').textContent = user.phone || 'Не указан';
    document.getElementById('profileCity').textContent = user.city || 'Не указан';
    document.getElementById('profileRole').textContent = getRoleName(user.role);
    document.getElementById('profileCreatedAt').textContent = Utils.formatDate(user.created_at);
    
    // Форма редактирования
    document.getElementById('editFullName').value = user.full_name;
    document.getElementById('editPhone').value = user.phone || '';
    document.getElementById('editCity').value = user.city || '';
}

function getRoleName(role) {
    switch(role) {
        case 'admin': return 'Администратор';
        case 'performer': return 'Ведущий';
        case 'client': return 'Клиент';
        default: return 'Пользователь';
    }
}

function getRoleColor(role) {
    switch(role) {
        case 'admin': return 'danger';
        case 'performer': return 'warning';
        case 'client': return 'primary';
        default: return 'secondary';
    }
}

function setupRoleSpecificTabs(role) {
    // Показываем/скрываем вкладки в зависимости от роли
    const calendarTab = document.getElementById('calendarTab');
    const performerProfileTab = document.getElementById('performerProfileTab');
    const adminTab = document.getElementById('adminTab');
    
    if (role === 'performer') {
        calendarTab.style.display = 'block';
        performerProfileTab.style.display = 'block';
    } else if (role === 'admin') {
        adminTab.style.display = 'block';
    }
}

async function loadClientData() {
    // Загружаем заявки клиента
    await loadBookings();
    
    // Загружаем статистику
    try {
        const bookingsResponse = await ApiClient.getUserBookings();
        
        if (bookingsResponse.success) {
            const bookings = bookingsResponse.data;
            
            // Статистика
            const stats = {
                total: bookings.length,
                confirmed: bookings.filter(b => b.status === 'confirmed').length,
                pending: bookings.filter(b => b.status === 'pending').length,
                rejected: bookings.filter(b => b.status === 'rejected').length
            };
            
            document.getElementById('statsBookings').textContent = stats.total;
            document.getElementById('statsConfirmed').textContent = stats.confirmed;
            document.getElementById('statsPending').textContent = stats.pending;
            document.getElementById('statsRejected').textContent = stats.rejected;
        }
    } catch (error) {
        console.error('Error loading client stats:', error);
    }
}

async function loadPerformerData(user) {
    // Загружаем заявки ведущего
    await loadPerformerBookings();
    
    // Загружаем профиль ведущего
    await loadPerformerProfile(user);
    
    // Инициализируем календарь
    initPerformerCalendar();
}

async function loadAdminData() {
    // Загружаем данные для админ-панели
    const adminPanelContent = document.getElementById('adminPanelContent');
    adminPanelContent.innerHTML = `
        <div class="text-center py-5">
            <div class="loading-spinner"></div>
            <p class="mt-3">Загрузка админ-панели...</p>
        </div>
    `;
    
    try {
        // Загружаем статистику
        const statsResponse = await ApiClient.getAdminStats();
        
        if (statsResponse.success) {
            displayAdminPanel(statsResponse.data);
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
        adminPanelContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки админ-панели
            </div>
        `;
    }
}

function displayAdminPanel(stats) {
    const adminPanelContent = document.getElementById('adminPanelContent');
    
    adminPanelContent.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h6 class="mb-0">Пользователи</h6>
                    </div>
                    <div class="card-body">
                        <canvas id="usersChart" height="200"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h6 class="mb-0">Ведущие</h6>
                    </div>
                    <div class="card-body">
                        <canvas id="performersChart" height="200"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header bg-warning text-white">
                        <h6 class="mb-0">Бронирования</h6>
                    </div>
                    <div class="card-body">
                        <canvas id="bookingsChart" height="200"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-4">
                <div class="card">
                    <div class="card-header bg-info text-white">
                        <h6 class="mb-0">Быстрые действия</h6>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary" onclick="window.open('/admin', '_blank')">
                                <i class="fas fa-cog"></i> Полная админ-панель
                            </button>
                            <button class="btn btn-outline-success" onclick="loadPendingPerformers()">
                                <i class="fas fa-user-check"></i> Модерация ведущих
                            </button>
                            <button class="btn btn-outline-danger" onclick="viewAllBookings()">
                                <i class="fas fa-list"></i> Все бронирования
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Здесь можно добавить графики с Chart.js если нужно
}

function setupForms(user) {
    // Форма редактирования профиля
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                full_name: document.getElementById('editFullName').value,
                phone: document.getElementById('editPhone').value || null,
                city: document.getElementById('editCity').value || null
            };
            
            try {
                const response = await ApiClient.updateProfile(formData);
                
                if (response.success) {
                    Utils.showAlert('Профиль успешно обновлен', 'success', 'alerts');
                    
                    // Обновляем отображение
                    displayUserInfo(response.data);
                    
                    // Обновляем данные в localStorage
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({
                        ...currentUser,
                        ...response.data
                    }));
                }
            } catch (error) {
                console.error('Error updating profile:', error);
            }
        });
    }
    
    // Фильтр заявок
    const bookingFilter = document.getElementById('bookingFilter');
    if (bookingFilter) {
        bookingFilter.addEventListener('change', loadBookings);
    }
}

// Функции для работы с заявками
window.loadBookings = async function() {
    const filter = document.getElementById('bookingFilter')?.value || null;
    const container = document.getElementById('bookingsList');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-3">
            <div class="loading-spinner"></div>
            <p class="mt-2">Загрузка заявок...</p>
        </div>
    `;
    
    try {
        const response = await ApiClient.getUserBookings(filter);
        
        if (response.success) {
            displayBookings(response.data, container);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки заявок
            </div>
        `;
    }
};

function displayBookings(bookings, container) {
    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h5>Заявок нет</h5>
                <p class="text-muted">У вас пока нет заявок на бронирование</p>
                <a href="/" class="btn btn-primary">
                    <i class="fas fa-search"></i> Найти ведущего
                </a>
            </div>
        `;
        return;
    }
    
    const bookingsHtml = bookings.map(booking => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <h6>${Utils.formatDate(booking.event_date)}</h6>
                        <span class="badge bg-${getBookingStatusColor(booking.status)}">
                            ${getBookingStatusName(booking.status)}
                        </span>
                    </div>
                    <div class="col-md-4">
                        <h6>${booking.performer_name}</h6>
                        <p class="text-muted mb-0 small">
                            <i class="fas fa-phone"></i> ${booking.performer_phone || 'Не указан'}
                        </p>
                    </div>
                    <div class="col-md-3">
                        <p class="mb-1">${Utils.formatPrice(booking.price_from)}${booking.price_to ? ` - ${Utils.formatPrice(booking.price_to)}` : ''}</p>
                        <small class="text-muted">Создано: ${Utils.formatDate(booking.created_at)}</small>
                    </div>
                    <div class="col-md-2 text-end">
                        ${booking.status === 'pending' ? `
                            <button class="btn btn-sm btn-outline-danger" onclick="cancelBooking(${booking.id})">
                                <i class="fas fa-times"></i> Отменить
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${booking.client_message ? `
                    <div class="mt-3">
                        <small class="text-muted">Сообщение:</small>
                        <p class="mb-0">${booking.client_message}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = bookingsHtml;
}

function getBookingStatusName(status) {
    switch(status) {
        case 'pending': return 'Ожидание';
        case 'confirmed': return 'Подтверждено';
        case 'rejected': return 'Отклонено';
        case 'expired': return 'Просрочено';
        default: return status;
    }
}

function getBookingStatusColor(status) {
    switch(status) {
        case 'pending': return 'warning';
        case 'confirmed': return 'success';
        case 'rejected': return 'danger';
        case 'expired': return 'secondary';
        default: return 'light';
    }
}

window.cancelBooking = async function(bookingId) {
    if (!confirm('Вы уверены, что хотите отменить эту заявку?')) {
        return;
    }
    
    try {
        const response = await ApiClient.cancelBooking(bookingId);
        
        if (response.success) {
            Utils.showAlert('Заявка успешно отменена', 'success', 'alerts');
            loadBookings();
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
    }
};

// Функции для ведущих
async function loadPerformerBookings() {
    // Загрузка заявок для ведущего
    // Реализация аналогична loadBookings, но с другим API endpoint
}

async function loadPerformerProfile(user) {
    const container = document.getElementById('performerProfileContent');
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-3">
            <div class="loading-spinner"></div>
            <p class="mt-2">Загрузка профиля ведущего...</p>
        </div>
    `;
    
    // Здесь можно загрузить и отобразить профиль ведущего
    // Для простоты показываем форму редактирования
    setTimeout(() => {
        container.innerHTML = `
            <p class="text-muted">Профиль ведущего загружается...</p>
            <p>Здесь будет форма редактирования профиля ведущего</p>
        `;
    }, 1000);
}

function initPerformerCalendar() {
    // Инициализация календаря для ведущего
    // Реализация аналогична календарю на странице ведущего
}

// Выход из системы
window.logout = function() {
    Utils.removeToken();
    localStorage.removeItem('user');
    window.location.href = '/';
};