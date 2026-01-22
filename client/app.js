// ============================================
// StalCraft Division Manager - Frontend Logic
// ============================================

const API_URL = 'https://api.schelper.fairplay.su';
let currentLanguage = localStorage.getItem('language') || 'ru';

// Полные переводы
const translations = {
    ru: {
        page_title: 'StalCraft Division Manager',
        app_title: 'StalCraft Division Manager',
        language_ru: 'РУС',
        language_en: 'ENG',
        login_title: 'Вход в систему',
        login_placeholder: 'Логин',
        password_placeholder: 'Пароль',
        login_button: 'Войти',
        register_button: 'Зарегистрироваться',
        register_title: 'Регистрация',
        faction_stalker: 'Сталкер',
        faction_bandit: 'Бандит',
        faction_duty: 'Долг',
        faction_freedom: 'Свобода',
        faction_mercenaries: 'Наёмники',
        faction_covenant: 'Ковенант',
        register_submit: 'Зарегистрироваться',
        back_to_login: 'Назад ко входу',
        logout_button: 'Выйти',
        welcome_user: 'Добро пожаловать, {username}!',
        faction_label: 'Фракция',
        role_label: 'Роль',
        registration_success: 'Регистрация успешна!',
        login_success: 'Вход выполнен успешно!',
        error_occurred: 'Произошла ошибка',
        loading: 'Загрузка...',
        fill_all_fields: 'Заполните все поля',
        unknown_error: 'Неизвестная ошибка'
    },
    en: {
        page_title: 'StalCraft Division Manager',
        app_title: 'StalCraft Division Manager',
        language_ru: 'RUS',
        language_en: 'ENG',
        login_title: 'Login',
        login_placeholder: 'Username',
        password_placeholder: 'Password',
        login_button: 'Sign In',
        register_button: 'Register',
        register_title: 'Registration',
        faction_stalker: 'Stalker',
        faction_bandit: 'Bandit',
        faction_duty: 'Duty',
        faction_freedom: 'Freedom',
        faction_mercenaries: 'Mercenaries',
        faction_covenant: 'Covenant',
        register_submit: 'Register',
        back_to_login: 'Back to Login',
        logout_button: 'Logout',
        welcome_user: 'Welcome, {username}!',
        faction_label: 'Faction',
        role_label: 'Role',
        registration_success: 'Registration successful!',
        login_success: 'Login successful!',
        error_occurred: 'An error occurred',
        loading: 'Loading...',
        fill_all_fields: 'Please fill in all fields',
        unknown_error: 'Unknown error'
    }
};

// Функция перевода с подстановкой
function t(key, params = {}) {
    let text = translations[currentLanguage][key] || key;
    
    // Заменяем плейсхолдеры {key} на значения из params
    for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(`{${paramKey}}`, paramValue);
    }
    
    return text;
}

// Применение переводов ко всем элементам
function applyTranslations() {
    // Текстовые элементы
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const params = {};
        
        // Специальная обработка для profile-title
        if (key === 'welcome_user') {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            params.username = user.login || 'Гость';
        }
        
        el.textContent = t(key, params);
    });
    
    // Placeholder'ы
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
    
    // Заголовок страницы
    document.title = t('page_title');
}

// Смена языка
function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    applyTranslations();
    
    // Также меняем язык в заголовках запросов к API
    loadUserProfile();
}

// Показать/скрыть формы
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('profile-section').style.display = 'none';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('profile-section').style.display = 'none';
}

function showProfile() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';
}

// Показать сообщение
function showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// Регистрация
async function register() {
    const login = document.getElementById('reg-login').value;
    const password = document.getElementById('reg-password').value;
    const faction = document.getElementById('reg-faction').value;
    
    if (!login || !password) {
        showMessage(t('error_occurred') + ': ' + t('fill_all_fields'), 'error');
        return;
    }
    
    showMessage(t('loading'), 'success');
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': currentLanguage
            },
            body: JSON.stringify({ login, password, main_faction: faction })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(t('registration_success'), 'success');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showProfile();
            updateProfileDisplay(data.user);
        } else {
            showMessage(t('error_occurred') + ': ' + (data.error || t('unknown_error')), 'error');
        }
    } catch (error) {
        showMessage(t('error_occurred') + ': ' + error.message, 'error');
    }
}

// Вход
async function login() {
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    
    if (!login || !password) {
        showMessage(t('error_occurred') + ': ' + t('fill_all_fields'), 'error');
        return;
    }
    
    showMessage(t('loading'), 'success');
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': currentLanguage
            },
            body: JSON.stringify({ login, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(t('login_success'), 'success');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showProfile();
            updateProfileDisplay(data.user);
        } else {
            showMessage(t('error_occurred') + ': ' + (data.error || t('unknown_error')), 'error');
        }
    } catch (error) {
        showMessage(t('error_occurred') + ': ' + error.message, 'error');
    }
}

// Выход
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showLogin();
    document.getElementById('login').value = '';
    document.getElementById('password').value = '';
    applyTranslations(); // Обновляем переводы (профиль скроется)
}

// Загрузка профиля
async function loadUserProfile() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept-Language': currentLanguage
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                showProfile();
                updateProfileDisplay(data.user);
            } else {
                logout();
            }
        } catch (error) {
            logout();
        }
    }
}

// Обновление отображения профиля
function updateProfileDisplay(user) {
    // Обновляем заголовок с именем пользователя
    const profileTitle = document.getElementById('profile-title');
    profileTitle.textContent = t('welcome_user', { username: user.login });
    
    // Обновляем информацию о фракции и роли
    const factionText = t('faction_' + user.main_faction.toLowerCase());
    const roleText = t('role_label') + ': ' + user.system_role;
    document.getElementById('profile-info').textContent = 
        `${t('faction_label')}: ${factionText} • ${roleText}`;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    loadUserProfile();
});