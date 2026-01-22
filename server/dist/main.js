// ============================================
// StalCraft Division Manager - Основной сервер
// ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// ================== МУЛЬТИЯЗЫЧНОСТЬ ==================
const translations = {
    en: {
        errors: {
            required_fields: 'All fields are required: login, password, main_faction',
            user_exists: 'User with this login already exists',
            invalid_credentials: 'Invalid login or password',
            auth_required: 'Authentication required',
            server_error: 'Internal server error',
            fill_all_fields: 'Please fill in all fields'
        },
        success: {
            registered: 'User registered successfully',
            logged_in: 'Login successful'
        },
        api: {
            welcome: 'StalCraft Division Manager API is running!'
        }
    },
    ru: {
        errors: {
            required_fields: 'Все поля обязательны: логин, пароль, основная фракция',
            user_exists: 'Пользователь с таким логином уже существует',
            invalid_credentials: 'Неверный логин или пароль',
            auth_required: 'Требуется авторизация',
            server_error: 'Внутренняя ошибка сервера',
            fill_all_fields: 'Заполните все поля'
        },
        success: {
            registered: 'Пользователь успешно зарегистрирован',
            logged_in: 'Вход выполнен успешно'
        },
        api: {
            welcome: 'StalCraft Division Manager API работает!'
        }
    }
};

const getLanguage = (req) => {
    const langHeader = req.headers['accept-language'] || 'en';
    return langHeader.startsWith('ru') ? 'ru' : 'en';
};

const t = (req, key) => {
    const lang = getLanguage(req);
    const keys = key.split('.');
    let value = translations[lang];
    
    for (const k of keys) {
        value = value?.[k];
        if (!value) break;
    }
    
    return value || key;
};

// ================== MIDDLEWARE ==================
app.use(helmet());

// 🔧 ИСПРАВЛЕННЫЙ CORS
app.use(cors({
    origin: [
        'https://scdm.fairplay.su',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
}));

// Явная обработка OPTIONS
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.t = (key) => t(req, key);
    next();
});

// ================== БАЗА ДАННЫХ ==================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || '032508008_scdm',
    password: process.env.DB_PASSWORD || 'c6wrf72gbP',
    database: process.env.DB_NAME || 'ctapblu_scdm',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

pool.getConnection()
    .then(connection => {
        console.log('✅ База данных подключена успешно');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Ошибка подключения к БД:', err.message);
    });

// ================== МАРШРУТЫ ==================
app.get('/', (req, res) => {
    res.json({ 
        message: req.t('api.welcome'),
        version: '1.0.0',
        status: 'OK',
        language: getLanguage(req)
    });
});

// ================== РЕГИСТРАЦИЯ (ИСПРАВЛЕННАЯ) ==================
app.post('/api/auth/register', async (req, res) => {
    console.log('📝 Регистрация:', req.body);
    
    try {
        const { login, password, main_faction } = req.body;
        
        if (!login || !password || !main_faction) {
            return res.status(400).json({ 
                error: req.t('errors.fill_all_fields')
            });
        }

        // 🔧 ИСПРАВЛЕНИЕ: используем правильное имя столбца
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE login = ?', // ← БЫЛО: exbo_login
            [login]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                error: req.t('errors.user_exists')
            });
        }

        // 🔧 ИСПРАВЛЕНИЕ: простая вставка (позже добавим хеширование)
        const [result] = await pool.execute(
            `INSERT INTO users (login, password, main_faction, system_role) 
             VALUES (?, ?, ?, 'USER')`,
            [login, password, main_faction]
        );

        // Создаём временный токен
        const token = `scdm-token-${result.insertId}-${Date.now()}`;

        console.log('✅ Пользователь создан:', result.insertId);

        res.status(201).json({
            success: true,
            message: req.t('success.registered'),
            token: token,
            user: {
                id: result.insertId,
                login: login,
                main_faction: main_faction,
                system_role: 'USER'
            }
        });

    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({ 
            error: req.t('errors.server_error'),
            details: error.message
        });
    }
});

// ================== ВХОД (ИСПРАВЛЕННЫЙ) ==================
app.post('/api/auth/login', async (req, res) => {
    console.log('🔑 Вход:', req.body.login);
    
    try {
        const { login, password } = req.body;
        
        if (!login || !password) {
            return res.status(400).json({ 
                error: req.t('errors.fill_all_fields')
            });
        }

        // 🔧 ИСПРАВЛЕНИЕ: правильные имена столбцов
        const [users] = await pool.execute(
            'SELECT id, login, password, main_faction, system_role FROM users WHERE login = ?',
            [login]
        );

        if (users.length === 0) {
            console.log('❌ Пользователь не найден:', login);
            return res.status(401).json({ 
                error: req.t('errors.invalid_credentials')
            });
        }

        const user = users[0];
        
        // 🔧 Временная проверка пароля (без хеширования)
        const passwordValid = (password === user.password);

        if (!passwordValid) {
            console.log('❌ Неверный пароль для:', login);
            return res.status(401).json({ 
                error: req.t('errors.invalid_credentials')
            });
        }

        const token = `scdm-token-${user.id}-${Date.now()}`;

        console.log('✅ Успешный вход:', login);

        res.json({
            success: true,
            message: req.t('success.logged_in'),
            token: token,
            user: {
                id: user.id,
                login: user.login,
                main_faction: user.main_faction,
                system_role: user.system_role
            }
        });

    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        res.status(500).json({ 
            error: req.t('errors.server_error'),
            details: error.message
        });
    }
});

// ================== ПРОФИЛЬ (ИСПРАВЛЕННЫЙ) ==================
app.get('/api/auth/me', async (req, res) => {
    console.log('👤 Запрос профиля');
    
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: req.t('errors.auth_required')
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        if (!token.startsWith('scdm-token-')) {
            return res.status(401).json({ 
                error: req.t('errors.auth_required')
            });
        }
        
        // Извлекаем ID пользователя из токена
        const tokenParts = token.split('-');
        if (tokenParts.length < 3) {
            return res.status(401).json({ 
                error: req.t('errors.auth_required')
            });
        }
        
        const userId = tokenParts[2];
        
        // 🔧 ИСПРАВЛЕНИЕ: запрашиваем реальные данные
        const [users] = await pool.execute(
            'SELECT id, login, main_faction, system_role FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                error: 'User not found'
            });
        }

        console.log('✅ Профиль загружен для ID:', userId);

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('❌ Ошибка профиля:', error);
        res.status(500).json({ 
            error: req.t('errors.server_error'),
            details: error.message
        });
    }
});

// ================== ЗАПУСК ==================
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📡 API доступно: https://api.schelper.fairplay.su`);
    console.log(`🌐 Поддерживаемые языки: ru, en`);
    console.log(`🎯 CORS разрешён для: https://scdm.fairplay.su`);
});