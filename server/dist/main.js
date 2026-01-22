// ============================================
// StalCraft Division Manager - Основной сервер
// Файл: app.js (точка входа)
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
            server_error: 'Internal server error'
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
            server_error: 'Внутренняя ошибка сервера'
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

// Функция для определения языка
const getLanguage = (req) => {
    const langHeader = req.headers['accept-language'] || 'en';
    return langHeader.startsWith('ru') ? 'ru' : 'en';
};

// Функция перевода
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
app.use(cors({
    origin: ['https://scdm.fairplay.su', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для добавления функции перевода в запрос
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

// Проверка подключения
pool.getConnection()
    .then(connection => {
        console.log('✅ База данных подключена успешно');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Ошибка подключения к БД:', err.message);
    });

// ================== МАРШРУТЫ ==================

// 1. Главный маршрут
app.get('/', (req, res) => {
    res.json({ 
        message: req.t('api.welcome'),
        version: '1.0.0',
        status: 'OK',
        language: getLanguage(req)
    });
});

// 2. Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { login, password, main_faction } = req.body;
        
        if (!login || !password || !main_faction) {
            return res.status(400).json({ 
                error: req.t('errors.required_fields')
            });
        }

        // Проверка существующего пользователя
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE exbo_login = ?',
            [login]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                error: req.t('errors.user_exists')
            });
        }

        // Временное хранение пароля (TODO: хэширование)
        const hashedPassword = password;

        // Создание пользователя
        const [result] = await pool.execute(
            `INSERT INTO users 
             (exbo_id, exbo_login, main_faction, system_role, password_hash) 
             VALUES (?, ?, ?, 'USER', ?)`,
            [-Math.floor(Math.random() * 10000), login, main_faction, hashedPassword]
        );

        // Создание профиля
        await pool.execute(
            'INSERT INTO profiles (user_id, character_name) VALUES (?, ?)',
            [result.insertId, login]
        );

        // Временный токен
        const token = `temp-jwt-${Date.now()}`;

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
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ 
            error: req.t('errors.server_error')
        });
    }
});

// 3. Вход
app.post('/api/auth/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        
        if (!login || !password) {
            return res.status(400).json({ 
                error: req.t('errors.required_fields')
            });
        }

        // Поиск пользователя
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE exbo_login = ?',
            [login]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                error: req.t('errors.invalid_credentials')
            });
        }

        const user = users[0];
        
        // Временная проверка пароля
        const passwordValid = (password === user.password_hash);

        if (!passwordValid) {
            return res.status(401).json({ 
                error: req.t('errors.invalid_credentials')
            });
        }

        // Временный токен
        const token = `temp-jwt-${Date.now()}`;

        res.json({
            success: true,
            message: req.t('success.logged_in'),
            token: token,
            user: {
                id: user.id,
                login: user.exbo_login,
                main_faction: user.main_faction,
                system_role: user.system_role
            }
        });

    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ 
            error: req.t('errors.server_error')
        });
    }
});

// 4. Защищённый маршрут
app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('temp-jwt-')) {
        return res.status(401).json({ 
            error: req.t('errors.auth_required')
        });
    }
    
    // Временная логика
    res.json({
        success: true,
        user: {
            id: 1,
            login: 'testuser',
            main_faction: 'STALKER',
            system_role: 'USER'
        }
    });
});

// ================== ЗАПУСК ==================
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📡 API доступно: https://api.schelper.fairplay.su`);
    console.log(`🌐 Поддерживаемые языки: ru, en`);
});