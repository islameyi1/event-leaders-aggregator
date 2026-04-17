// JavaScript для страницы профиля ведущего

document.addEventListener('DOMContentLoaded', function() {
    // Получаем ID ведущего из URL
    const pathParts = window.location.pathname.split('/');
    const performerId = pathParts[pathParts.length - 1];
    
    if (!performerId || isNaN(performerId)) {
        showError('Неверный ID ведущего');
        return;
    }
    
    // Загружаем профиль ведущего
    loadPerformerProfile(performerId);
    
    // Настраиваем форму бронирования
    setupBookingForm(performerId);
});

async function loadPerformerProfile(performerId) {
    try {
        // Загружаем данные ведущего
        const response = await ApiClient.getPerformer(performerId);
        
        if (response.success) {
            displayPerformerProfile(response.data);
            setupCalendar(performerId, response.data.calendar);
        } else {
            showError('Не удалось загрузить профиль ведущего');
        }
    } catch (error) {
        console.error('Error loading performer profile:', error);
        showError('Ошибка загрузки профиля');
    }
}

function displayPerformerProfile(performer) {
    // Скрываем индикатор загрузки
    document.getElementById('loading').style.display = 'none';
    
    // Показываем профиль
    const profileElement = document.getElementById('performerProfile');
    profileElement.style.display = 'block';
    
    // Заполняем данные
    document.getElementById('performerName').textContent = performer.full_name;
    document.getElementById('performerCity').textContent = performer.city || 'Город не указан';
    document.getElementById('performerEmail').textContent = performer.email;
    document.getElementById('performerPhone').textContent = performer.phone || 'Не указан';
    document.getElementById('performerLocation').textContent = performer.city || 'Город не указан';
    document.getElementById('performerDescription').textContent = performer.description || 'Описание отсутствует';
    document.getElementById('performerRating').textContent = performer.rating || 'Нет';
    
    // Цена
    if (performer.price_from && performer.price_to) {
        document.getElementById('performerPrice').textContent = 
            `${Utils.formatPrice(performer.price_from)} - ${Utils.formatPrice(performer.price_to)}`;
    } else if (performer.price_from) {
        document.getElementById('performerPrice').textContent = 
            `от ${Utils.formatPrice(performer.price_from)}`;
    } else {
        document.getElementById('performerPrice').textContent = 'Цена по договоренности';
    }
    
    // Типы мероприятий
    const eventTypesContainer = document.getElementById('performerEventTypes');
    if (performer.event_types && performer.event_types.length > 0) {
        eventTypesContainer.innerHTML = performer.event_types
            .map(type => `<span class="performer-tag">${type}</span>`)
            .join('');
    } else {
        eventTypesContainer.innerHTML = '<span class="performer-tag">Разные мероприятия</span>';
    }
    
    // Фото
    if (performer.photo_url) {
        document.getElementById('performerPhoto').src = performer.photo_url;
    }
    
    // ID для формы бронирования
    document.getElementById('performerId').value = performer.id;
}

function setupCalendar(performerId, calendarData) {
    const calendarEl = document.getElementById('calendar');
    
    // Преобразуем данные календаря в формат FullCalendar
    const events = calendarData.map(item => {
        let color;
        switch(item.status) {
            case 'busy':
                color = '#dc3545'; // красный
                break;
            case 'pending':
                color = '#ffc107'; // желтый
                break;
            case 'blocked':
                color = '#6c757d'; // серый
                break;
            default:
                color = '#28a745'; // зеленый
        }
        
        let title;
        switch(item.status) {
            case 'busy':
                title = 'Занят';
                break;
            case 'pending':
                title = 'Ожидание';
                break;
            case 'blocked':
                title = 'Заблокирован';
                break;
            default:
                title = 'Свободен';
        }
        
        return {
            title: title,
            start: item.date,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: 'white'
        };
    });
    
    // Инициализируем календарь
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ru',
        height: 400,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
        },
        events: events,
        eventClick: function(info) {
            // При клике на событие показываем информацию о дате
            const date = info.event.startStr;
            const status = info.event.title.toLowerCase();
            
            let message;
            switch(status) {
                case 'занят':
                    message = 'Эта дата уже занята';
                    break;
                case 'ожидание':
                    message = 'На эту дату есть ожидающая заявка';
                    break;
                case 'заблокирован':
                    message = 'Эта дата заблокирована';
                    break;
                default:
                    message = 'Дата свободна для бронирования';
            }
            
            Utils.showAlert(`${date}: ${message}`, 'info', 'alerts');
        }
    });
    
    calendar.render();
}

function setupBookingForm(performerId) {
    const bookingDateInput = document.getElementById('bookingDate');
    const dateAvailability = document.getElementById('dateAvailability');
    
    // Устанавливаем минимальную дату (завтра)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    bookingDateInput.min = tomorrow.toISOString().split('T')[0];
    
    // Устанавливаем максимальную дату (через год)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    bookingDateInput.max = nextYear.toISOString().split('T')[0];
    
    // Проверяем доступность при изменении даты
    bookingDateInput.addEventListener('change', async function() {
        const date = this.value;
        
        if (!date) {
            dateAvailability.textContent = '';
            return;
        }
        
        try {
            const response = await ApiClient.checkAvailability(performerId, date);
            
            if (response.success) {
                if (response.data.available) {
                    dateAvailability.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Дата свободна</span>';
                } else {
                    dateAvailability.innerHTML = `<span class="text-danger"><i class="fas fa-times-circle"></i> Дата занята (${response.data.status})</span>`;
                }
            }
        } catch (error) {
            console.error('Error checking availability:', error);
        }
    });
}

async function submitBooking() {
    const performerId = document.getElementById('performerId').value;
    const date = document.getElementById('bookingDate').value;
    const message = document.getElementById('clientMessage').value;
    
    // Валидация
    if (!date) {
        Utils.showAlert('Выберите дату мероприятия', 'warning', 'alerts');
        return;
    }
    
    // Проверяем авторизацию
    if (!Utils.isLoggedIn()) {
        Utils.showAlert('Для бронирования необходимо войти в систему', 'warning', 'alerts');
        
        // Сохраняем данные для бронирования
        localStorage.setItem('pendingBooking', JSON.stringify({
            performerId,
            date,
            message
        }));
        
        // Перенаправляем на страницу входа
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return;
    }
    
    // Проверяем роль пользователя
    const userRole = Utils.getUserRole();
    if (userRole !== 'client') {
        Utils.showAlert('Только клиенты могут бронировать ведущих', 'warning', 'alerts');
        return;
    }
    
    // Создаем бронирование
    try {
        const response = await ApiClient.createBooking({
            performer_id: performerId,
            event_date: date,
            client_message: message
        });
        
        if (response.success) {
            Utils.showAlert('Заявка успешно создана! Дата заблокирована на 24 часа.', 'success', 'alerts');
            
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
            modal.hide();
            
            // Обновляем календарь
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    } catch (error) {
        console.error('Error creating booking:', error);
    }
}

function showError(message) {
    document.getElementById('loading').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i> ${message}
        </div>
        <button class="btn btn-primary mt-3" onclick="window.history.back()">
            <i class="fas fa-arrow-left"></i> Вернуться назад
        </button>
    `;
}

// Проверяем, есть ли отложенное бронирование после входа
window.addEventListener('load', function() {
    const pendingBooking = localStorage.getItem('pendingBooking');
    
    if (pendingBooking && Utils.isLoggedIn() && Utils.getUserRole() === 'client') {
        const bookingData = JSON.parse(pendingBooking);
        localStorage.removeItem('pendingBooking');
        
        // Заполняем форму бронирования
        document.getElementById('performerId').value = bookingData.performerId;
        document.getElementById('bookingDate').value = bookingData.date;
        document.getElementById('clientMessage').value = bookingData.message;
        
        // Показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
        modal.show();
        
        Utils.showAlert('Продолжите бронирование', 'info', 'alerts');
    }
});