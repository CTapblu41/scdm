-- ====================================================
-- StalCraft Division Manager - Database Schema v1.0
-- ====================================================

-- Таблица пользователей нашего сервиса
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Данные из EXBO OAuth
    exbo_id INT UNIQUE NOT NULL COMMENT 'ID из EXBO API',
    exbo_uuid VARCHAR(36) COMMENT 'UUID из EXBO API',
    exbo_login VARCHAR(255) NOT NULL COMMENT 'Логин из EXBO API',
    distributor VARCHAR(50) COMMENT 'Провайдер: EXBO или STEAM',
    -- Основная информация пользователя
    main_faction ENUM('STALKER', 'BANDIT', 'DUTY', 'FREEDOM', 'MERCENARIES', 'COVENANT') NOT NULL COMMENT 'Основная фракция',
    display_name VARCHAR(255) COMMENT 'Отображаемое имя в сервисе (можно менять)',
    -- Системная роль (глобальные права)
    system_role ENUM('USER', 'SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT') DEFAULT 'USER' NOT NULL,
    -- Дополнительная информация
    discord_username VARCHAR(100),
    about TEXT COMMENT 'Описание профиля',
    -- Технические поля
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_exbo_login (exbo_login),
    INDEX idx_main_faction (main_faction)
) COMMENT='Пользователи сервиса (привязаны к EXBO-аккаунту)';

-- Таблица кланов
CREATE TABLE clans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- Игровые данные
    game_clan_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'ID клана в игре (из API)',
    name VARCHAR(255) NOT NULL COMMENT 'Название клана',
    faction ENUM('DUTY', 'FREEDOM', 'MERCENARIES', 'COVENANT') NOT NULL COMMENT 'Игровая фракция клана',
    tag VARCHAR(10) COMMENT 'Тег клана [TAG]',
    -- Описание
    description TEXT,
    is_recruiting BOOLEAN DEFAULT FALSE COMMENT 'Ищет ли клан новых членов',
    -- Метаданные
    created_by_user_id INT COMMENT 'Кто создал запись в сервисе',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Ключи
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_faction (faction),
    INDEX idx_tag (tag)
) COMMENT='Кланы игры';

-- Таблица игровых персонажей
CREATE TABLE profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT 'Владелец',
    character_name VARCHAR(255) NOT NULL COMMENT 'Имя персонажа',
    -- Связь с кланом
    clan_id INT NULL COMMENT 'Ссылка на клан в нашем сервисе',
    clan_rank VARCHAR(100) COMMENT 'Звание в клане (из API игры)',
    -- Флаги
    is_main BOOLEAN DEFAULT FALSE COMMENT 'Основной персонаж пользователя',
    -- Технические поля
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Ключи и индексы
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE SET NULL,
    UNIQUE KEY unique_character (user_id, character_name),
    INDEX idx_clan_id (clan_id),
    INDEX idx_is_main (is_main)
) COMMENT='Игровые персонажи пользователей';

-- БАЗА ПРЕДМЕТОВ: Основная таблица предметов
CREATE TABLE items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Уникальный ID предмета в игре (из JSON)',
    item_type VARCHAR(100) NOT NULL COMMENT 'Тип: outfit, weapon, backpack, artifact и т.д.',
    max_artifacts TINYINT UNSIGNED DEFAULT 0 COMMENT 'Макс. вместимость артефактов (0-7)',
    icon_url VARCHAR(500) COMMENT 'Ссылка на иконку (можно генерировать)',
    tier INT COMMENT 'Тир предмета',
    -- Для синхронизации с репозиторием EXBO
    last_updated_from_source DATETIME,
    hash VARCHAR(64) COMMENT 'Хэш данных для проверки обновлений',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_game_id (game_id),
    INDEX idx_item_type (item_type),
    INDEX idx_tier (tier)
) COMMENT='База предметов игры (синхронизация с EXBO репозиторием)';

-- БАЗА ПРЕДМЕТОВ: Переводы названий и описаний
CREATE TABLE item_translations (
    item_id INT NOT NULL,
    language_code CHAR(2) NOT NULL COMMENT 'ru, en',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    PRIMARY KEY (item_id, language_code),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_language (language_code)
) COMMENT='Локализация предметов';

-- БАЗА ПРЕДМЕТОВ: Характеристики предметов
CREATE TABLE item_properties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    property_key VARCHAR(100) NOT NULL COMMENT 'Ключ характеристики: damage_ballistic, capacity и т.д.',
    value_numeric DECIMAL(10,2) NULL COMMENT 'Числовое значение',
    value_text VARCHAR(255) NULL COMMENT 'Текстовое значение',
    unit VARCHAR(50) NULL COMMENT 'Единица измерения: %, кг, ед.',
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_item_key (item_id, property_key)
) COMMENT='Характеристики предметов';

-- Таблица экипировки персонажей (ИСПРАВЛЕННАЯ)
CREATE TABLE equipment_slots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    profile_id INT NOT NULL COMMENT 'Какому персонажу принадлежит',
    -- Тип слота
    slot_type ENUM(
        'BODY_ARMOR',
        'BACKPACK_MAIN',
        'BACKPACK_SWAP',
        'MELEE',
        'PRIMARY_MAIN',
        'PRIMARY_SWAP',
        'SECONDARY',
        'ARTIFACT_1', 'ARTIFACT_2', 'ARTIFACT_3',
        'ARTIFACT_4', 'ARTIFACT_5', 'ARTIFACT_6', 'ARTIFACT_7'
    ) NOT NULL,
    -- Ссылка на предмет в базе
    item_id INT NULL COMMENT 'Предмет в этом слоте (NULL если слот пуст)',
    -- Персональные данные игрока (переопределяют общие)
    custom_name VARCHAR(255) NULL COMMENT 'Кастомное название от игрока',
    item_condition TINYINT UNSIGNED NULL COMMENT 'Прочность/состояние в % (опционально)',
    notes TEXT COMMENT 'Заметки игрока об этом предмете',
    -- Флаги
    is_equipped BOOLEAN DEFAULT TRUE COMMENT 'Надет ли предмет (активен ли слот)',
    -- Технические поля
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Ключи и ограничения
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
    UNIQUE KEY unique_slot (profile_id, slot_type),
    INDEX idx_item_id (item_id),
    INDEX idx_is_equipped (is_equipped)
) COMMENT='Экипировка персонажей (слоты)';

-- СИСТЕМА РОЛЕЙ: Глобальные роли сервиса (админ, модератор)
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Уникальный код: event_manager, content_moderator',
    name VARCHAR(100) NOT NULL COMMENT 'Человекочитаемое название',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) COMMENT='Справочник глобальных ролей сервиса';

-- СИСТЕМА РОЛЕЙ: Связь пользователей с глобальными ролей
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by_user_id INT COMMENT 'Кто выдал роль',
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(id),
    INDEX idx_assigned_by (assigned_by_user_id)
) COMMENT='Назначенные глобальные роли';

-- СИСТЕМА РОЛЕЙ: Клановые роли (крафтер, логист и т.д.)
CREATE TABLE clan_role_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Уникальный код: crafter, logistician, treasurer',
    name VARCHAR(100) NOT NULL COMMENT 'Название роли',
    description TEXT,
    can_assign JSON COMMENT 'Кто может назначать эту роль (массив кодов системных ролей)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) COMMENT='Типы ролей внутри клана';

-- СИСТЕМА РОЛЕЙ: Связь персонажей с клановыми ролей
CREATE TABLE profile_clan_roles (
    profile_id INT NOT NULL,
    role_type_id INT NOT NULL,
    assigned_by_user_id INT COMMENT 'Кто назначил роль в сервисе',
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT COMMENT 'Примечания к назначению',
    PRIMARY KEY (profile_id, role_type_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (role_type_id) REFERENCES clan_role_types(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(id),
    INDEX idx_assigned_by (assigned_by_user_id)
) COMMENT='Назначенные клановые роли персонажам';