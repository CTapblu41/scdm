// ====================================================
// StalCraft Division Manager - Frontend Logic
// Версия: 3.0 (с кастомным select и исправленными сообщениями)
// ====================================================

// ==================== КОНФИГУРАЦИЯ ====================
const API_URL = 'https://api.schelper.fairplay.su';
let currentLanguage = localStorage.getItem('language') || 'ru';
let factionSelectOpen = false;

// ==================== СЛОВАРИ ПЕРЕВОДОВ ====================
const translations = {
    ru: {
        page_title: 'StalCraft Division Manager',
        app_title: 'StalCraft Division Manager',
        login_title: 'Вход в систему',
        login_placeholder: 'Логин',
        password_placeholder: 'Пароль',
        login_button: 'Войти',
        register_button: 'Зарегистрироваться',
        register_title: 'Регистрация',
        select_faction: 'Выберите фракцию',
        faction_stalker: 'Сталкер',
        faction_bandit: 'Бандит',
        faction_duty: 'Долг',
        faction_freedom: 'Свобода',
        faction_mercenaries: 'Наёмники',
        faction_covenant: 'Завет',
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
        login_title: 'Login',
        login_placeholder: 'Username',
        password_placeholder: 'Password',
        login_button: 'Sign In',
        register_button: 'Register',
        register_title: 'Registration',
        select_faction: 'Select faction',
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

// ==================== ФУНКЦИИ ПЕРЕВОДА ====================
function t(key, params = {}) {
    let text = translations[currentLanguage][key] || key;
    
    for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(`{${paramKey}}`, paramValue);
    }
    
    return text;
}

function applyTranslations() {
    // Текстовые элементы
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const params = {};
        
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
    
    // Обновляем выбранную фракцию если есть
    const selectedFaction = document.getElementById('reg-faction').value;
    if (selectedFaction) {
        const factionText = t('faction_' + selectedFaction.toLowerCase());
        document.getElementById('selected-faction').textContent = factionText;
    }
}

// ==================== ФУНКЦИИ ДЛЯ ФЛАГОВ ====================
function updateActiveFlag() {
    document.querySelectorAll('.flag-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const currentFlag = document.querySelector(`.flag-btn[onclick*="${currentLanguage}"]`);
    if (currentFlag) {
        currentFlag.classList.add('active');
    }
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    applyTranslations();
    updateActiveFlag();
    loadUserProfile();
}

// ==================== КАСТОМНЫЙ SELECT ДЛЯ ФРАКЦИЙ ====================

// Переключение выпадающего списка
function toggleFactionSelect() {
    const select = document.querySelector('.custom-select');
    const options = document.getElementById('faction-options');
    
    factionSelectOpen = !factionSelectOpen;
    
    if (factionSelectOpen) {
        select.classList.add('active');
        options.style.maxHeight = '300px';
        options.style.opacity = '1';
        options.style.visibility = 'visible';
    } else {
        select.classList.remove('active');
        options.style.maxHeight = '0';
        options.style.opacity = '0';
        options.style.visibility = 'hidden';
    }
}

// Выбор фракции
function selectFaction(faction) {
    const selectedElement = document.getElementById('selected-faction');
    const hiddenInput = document.getElementById('reg-faction');
    
    // Находим перевод для выбранной фракции
    const factionText = t('faction_' + faction.toLowerCase());
    selectedElement.textContent = factionText;
    hiddenInput.value = faction;
    
    // Закрываем выпадающий список
    toggleFactionSelect();
}

// Закрытие выпадающего списка при клике вне его
document.addEventListener('click', function(event) {
    const select = document.querySelector('.custom-select');
    if (!select) return;
    
    const isClickInside = select.contains(event.target);
    
    if (!isClickInside && factionSelectOpen) {
        factionSelectOpen = false;
        select.classList.remove('active');
        const options = document.getElementById('faction-options');
        if (options) {
            options.style.maxHeight = '0';
            options.style.opacity = '0';
            options.style.visibility = 'hidden';
        }
    }
});

// ==================== УПРАВЛЕНИЕ ФОРМАМИ ====================
function showRegister() {
    // Скрываем форму входа
    document.getElementById('login-form').style.opacity = '0';
    document.getElementById('login-form').style.visibility = 'hidden';
    document.getElementById('login-form').style.pointerEvents = 'none';
    
    // Показываем форму регистрации
    document.getElementById('register-form').style.opacity = '1';
    document.getElementById('register-form').style.visibility = 'visible';
    document.getElementById('register-form').style.pointerEvents = 'all';
    
    // Меняем заголовок
    document.getElementById('form-title').textContent = t('register_title');
    
    // Сбрасываем выбор фракции если не выбран
    const hiddenInput = document.getElementById('reg-faction');
    if (!hiddenInput.value) {
        document.getElementById('selected-faction').textContent = t('select_faction');
    }
}

function showLogin() {
    // Показываем форму входа
    document.getElementById('login-form').style.opacity = '1';
    document.getElementById('login-form').style.visibility = 'visible';
    document.getElementById('login-form').style.pointerEvents = 'all';
    
    // Скрываем форму регистрации
    document.getElementById('register-form').style.opacity = '0';
    document.getElementById('register-form').style.visibility = 'hidden';
    document.getElementById('register-form').style.pointerEvents = 'none';
    
    // Скрываем профиль
    document.getElementById('profile-section').style.opacity = '0';
    document.getElementById('profile-section').style.visibility = 'hidden';
    document.getElementById('profile-section').style.pointerEvents = 'none';
    
    // Меняем заголовок
    document.getElementById('form-title').textContent = t('login_title');
    
    // Закрываем выпадающий список если открыт
    if (factionSelectOpen) {
        toggleFactionSelect();
    }
}

function showProfile() {
    // Скрываем обе формы
    document.getElementById('login-form').style.opacity = '0';
    document.getElementById('login-form').style.visibility = 'hidden';
    document.getElementById('login-form').style.pointerEvents = 'none';
    
    document.getElementById('register-form').style.opacity = '0';
    document.getElementById('register-form').style.visibility = 'hidden';
    document.getElementById('register-form').style.pointerEvents = 'none';
    
    // Показываем профиль
    document.getElementById('profile-section').style.opacity = '1';
    document.getElementById('profile-section').style.visibility = 'visible';
    document.getElementById('profile-section').style.pointerEvents = 'all';
    
    // Заголовок профиля (не меняем общий заголовок)
    // document.getElementById('form-title').textContent = '';
}

// ==================== СООБЩЕНИЯ ====================
function showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    
    // Если сообщение уже видно, сначала скрываем его плавно
    if (messageEl.classList.contains('show')) {
        messageEl.classList.remove('show');
        
        // Ждём завершения анимации скрытия
        setTimeout(() => {
            showNewMessage(messageEl, text, type);
        }, 300);
    } else {
        showNewMessage(messageEl, text, type);
    }
}

function showNewMessage(messageEl, text, type) {
    // Устанавливаем новый текст и тип
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    
    // Показываем с плавной анимацией
    setTimeout(() => {
        messageEl.classList.add('show');
    }, 50);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 5000);
}

// ==================== API ВЗАИМОДЕЙСТВИЕ ====================
async function register() {
    const login = document.getElementById('reg-login').value;
    const password = document.getElementById('reg-password').value;
    const faction = document.getElementById('reg-faction').value;
    
    if (!login || !password || !faction) {
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

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showLogin();
    document.getElementById('login').value = '';
    document.getElementById('password').value = '';
    applyTranslations();
}

// ==================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================
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

function updateProfileDisplay(user) {
    const profileTitle = document.getElementById('profile-title');
    profileTitle.textContent = t('welcome_user', { username: user.login });
    
    const factionText = t('faction_' + user.main_faction.toLowerCase());
    const roleText = t('role_label') + ': ' + user.system_role;
    document.getElementById('profile-info').textContent = 
        `${t('faction_label')}: ${factionText} • ${roleText}`;
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    updateActiveFlag();
    loadUserProfile();
    
    // Инициализируем скрытое поле для фракции если оно пустое
    const factionInput = document.getElementById('reg-faction');
    if (factionInput && !factionInput.value) {
        document.getElementById('selected-faction').textContent = t('select_faction');
    }
});