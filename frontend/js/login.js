// JavaScript для страницы входа

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, если пользователь уже авторизован
    if (Utils.isLoggedIn()) {
        window.location.href = '/dashboard';
        return;
    }

    // Инициализация
    initLoginPage();
});

function initLoginPage() {
    // Переключение видимости пароля
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Обработка формы входа
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Восстановление пароля
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Валидация
    if (!email || !password) {
        Utils.showAlert('Заполните все поля', 'warning', 'alerts');
        return;
    }
    
    // Показываем индикатор загрузки
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    submitBtn.disabled = true;
    
    try {
        // Выполняем вход
        const response = await ApiClient.login(email, password);
        
        if (response.success) {
            // Сохраняем токен и данные пользователя
            Utils.setToken(response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            // Если выбрано "Запомнить меня", сохраняем в localStorage
            if (rememberMe) {
                localStorage.setItem('rememberEmail', email);
            } else {
                localStorage.removeItem('rememberEmail');
            }
            
            // Показываем успешное сообщение
            Utils.showAlert('Вход выполнен успешно! Перенаправление...', 'success', 'alerts');
            
            // Перенаправляем на дашборд
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        }
    } catch (error) {
        // Ошибка уже обработана в ApiClient
        console.error('Login error:', error);
    } finally {
        // Восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    
    if (!email) {
        Utils.showAlert('Введите email для восстановления пароля', 'warning', 'alerts');
        return;
    }
    
    // В реальном приложении здесь был бы запрос на восстановление пароля
    Utils.showAlert(`Запрос на восстановление пароля отправлен на ${email}. В демо-версии используйте тестовые аккаунты.`, 'info', 'alerts');
}

// Функции для быстрого входа с тестовыми аккаунтами
window.useTestAccount = function(role) {
    let email, password;
    
    switch(role) {
        case 'admin':
            email = 'admin@example.com';
            password = 'admin123';
            break;
        case 'performer':
            email = 'performer@example.com';
            password = 'performer123';
            break;
        case 'client':
            email = 'client@example.com';
            password = 'client123';
            break;
        default:
            return;
    }
    
    // Заполняем форму
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
    document.getElementById('rememberMe').checked = true;
    
    // Показываем информацию
    Utils.showAlert(`Заполнены данные для ${role}. Нажмите "Войти"`, 'info', 'alerts');
    
    // Автоматически отправляем форму через 1 секунду
    setTimeout(() => {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }, 1000);
};

// Восстанавливаем сохраненный email при загрузке страницы
window.addEventListener('load', function() {
    const savedEmail = localStorage.getItem('rememberEmail');
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
        document.getElementById('rememberMe').checked = true;
    }
});