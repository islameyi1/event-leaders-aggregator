// JavaScript для страницы регистрации

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, если пользователь уже авторизован
    if (Utils.isLoggedIn()) {
        window.location.href = '/dashboard';
        return;
    }

    // Инициализация
    initRegistrationPage();
});

function initRegistrationPage() {
    // Выбор роли
    initRoleSelection();
    
    // Обработка формы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
    
    // Валидация пароля в реальном времени
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    
    if (passwordInput && confirmPasswordInput) {
        passwordInput.addEventListener('input', validatePassword);
        confirmPasswordInput.addEventListener('input', validatePassword);
    }
    
    // Валидация телефона
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', formatPhoneNumber);
    }
}

function initRoleSelection() {
    const roleCards = document.querySelectorAll('.role-card');
    const roleInput = document.getElementById('role');
    const performerFields = document.getElementById('performerFields');
    
    roleCards.forEach(card => {
        card.addEventListener('click', function() {
            const role = this.getAttribute('data-role');
            
            // Админ недоступен для регистрации
            if (role === 'admin') {
                Utils.showAlert('Регистрация администраторов недоступна', 'warning', 'alerts');
                return;
            }
            
            // Снимаем выделение со всех карточек
            roleCards.forEach(c => {
                c.classList.remove('border-primary', 'border-3');
                c.style.boxShadow = 'none';
            });
            
            // Выделяем выбранную карточку
            this.classList.add('border-primary', 'border-3');
            this.style.boxShadow = '0 0 20px rgba(67, 97, 238, 0.3)';
            
            // Устанавливаем значение роли
            roleInput.value = role;
            
            // Показываем/скрываем дополнительные поля для ведущих
            if (role === 'performer') {
                performerFields.style.display = 'block';
            } else {
                performerFields.style.display = 'none';
            }
            
            Utils.showAlert(`Вы выбрали роль: ${role === 'client' ? 'Клиент' : 'Ведущий'}`, 'info', 'alerts');
        });
    });
    
    // По умолчанию выбираем клиента
    if (roleCards.length > 0) {
        roleCards[0].click();
    }
}

function validatePassword() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const passwordError = document.getElementById('passwordError');
    
    if (!passwordError) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'passwordError';
        errorDiv.className = 'form-text text-danger';
        document.getElementById('password').parentNode.appendChild(errorDiv);
    }
    
    const errorElement = document.getElementById('passwordError');
    
    if (password.length > 0 && password.length < 6) {
        errorElement.textContent = 'Пароль должен содержать минимум 6 символов';
        return false;
    }
    
    if (confirmPassword.length > 0 && password !== confirmPassword) {
        errorElement.textContent = 'Пароли не совпадают';
        return false;
    }
    
    errorElement.textContent = '';
    return true;
}

function formatPhoneNumber(event) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length === 0) return;
    
    let formattedValue = '+7 ';
    
    if (value.length > 1) {
        formattedValue += '(' + value.substring(1, 4);
    }
    if (value.length >= 4) {
        formattedValue += ') ' + value.substring(4, 7);
    }
    if (value.length >= 7) {
        formattedValue += '-' + value.substring(7, 9);
    }
    if (value.length >= 9) {
        formattedValue += '-' + value.substring(9, 11);
    }
    
    event.target.value = formattedValue;
}

async function handleRegistration(event) {
    event.preventDefault();
    
    // Собираем данные формы
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        role: document.getElementById('role').value,
        full_name: document.getElementById('full_name').value,
        phone: document.getElementById('phone').value || null,
        city: document.getElementById('city').value || null
    };
    
    // Валидация
    if (!validateForm(formData)) {
        return;
    }
    
    // Дополнительные данные для ведущих
    if (formData.role === 'performer') {
        formData.description = document.getElementById('description').value || null;
        formData.price_from = document.getElementById('price_from').value || null;
        formData.price_to = document.getElementById('price_to').value || null;
    }
    
    // Показываем индикатор загрузки
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
    submitBtn.disabled = true;
    
    try {
        // Отправляем запрос на регистрацию
        const response = await ApiClient.register(formData);
        
        if (response.success) {
            // Сохраняем токен и данные пользователя
            Utils.setToken(response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Показываем успешное сообщение
            Utils.showAlert('Регистрация прошла успешно! Перенаправление...', 'success', 'alerts');
            
            // Перенаправляем на дашборд
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        }
    } catch (error) {
        // Ошибка уже обработана в ApiClient
        console.error('Registration error:', error);
    } finally {
        // Восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function validateForm(formData) {
    // Проверка обязательных полей
    if (!formData.email || !formData.password || !formData.full_name) {
        Utils.showAlert('Заполните все обязательные поля', 'warning', 'alerts');
        return false;
    }
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        Utils.showAlert('Введите корректный email', 'warning', 'alerts');
        return false;
    }
    
    // Валидация пароля
    if (formData.password.length < 6) {
        Utils.showAlert('Пароль должен содержать минимум 6 символов', 'warning', 'alerts');
        return false;
    }
    
    // Проверка совпадения паролей
    const confirmPassword = document.getElementById('confirm_password').value;
    if (formData.password !== confirmPassword) {
        Utils.showAlert('Пароли не совпадают', 'warning', 'alerts');
        return false;
    }
    
    // Валидация телефона (если указан)
    if (formData.phone) {
        const phoneRegex = /^(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/;
        if (!phoneRegex.test(formData.phone)) {
            Utils.showAlert('Введите корректный номер телефона', 'warning', 'alerts');
            return false;
        }
    }
    
    // Проверка согласия с условиями
    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        Utils.showAlert('Необходимо согласиться с условиями использования', 'warning', 'alerts');
        return false;
    }
    
    return true;
}

// Автозаполнение формы из URL параметров
window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    
    if (role && (role === 'client' || role === 'performer')) {
        // Находим карточку с нужной ролью и кликаем на нее
        const roleCard = document.querySelector(`.role-card[data-role="${role}"]`);
        if (roleCard) {
            setTimeout(() => {
                roleCard.click();
            }, 100);
        }
    }
});