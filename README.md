# 🤖 SMM Bot - Telegram Content Generator

Автоматизированный бот для управления Telegram каналами. Парсит контент, генерирует его через Claude AI и публикует по расписанию.

## 🎯 Функциональность

- **📝 Генерация контента** - Используёт Claude AI для создания оригинального контента
- **📅 Расписание** - Публикует посты в определённое время
- **📊 Бустинг метрик** - Повышает просмотры через SMM.media
- **🔄 Парсинг контента** - Извлекает идеи из целевых каналов
- **⚙️ Конфигурируемо** - Редактируемые system prompts для каждого канала

## 📋 Структура проекта

```
smm_bot/
├── config/
│   └── config.js              # Конфиг + system prompts для каналов
├── services/
│   ├── ai-generator.js        # Генерация контента через Claude
│   ├── publisher.js           # Публикация в Telegram
│   ├── telegram-parser.js     # Парсинг контента
│   └── metrics-booster.js     # Бустинг метрик через SMM.media
├── handlers/
│   └── schedule.js            # Планировщик задач
├── utils/
│   └── logger.js              # Логирование
├── bot.js                     # Главный файл
├── .env                       # Переменные окружения
└── package.json
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Получение необходимых данных

#### Telegram Bot Token
1. Напиши боту @BotFather в Telegram
2. Используй команду `/newbot` и следуй инструкциям
3. Получишь токен в формате: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`

#### Telegram API Credentials (для парсинга)
1. Перейди на https://my.telegram.org/apps
2. Создай приложение и получи **API_ID** и **API_HASH**

#### Claude API Key
1. Перейди на https://console.anthropic.com
2. Создай API ключ в разделе "API Keys"

#### SMM.media API Key
1. Зарегистрируйся на https://smm.media
2. Получи API ключ в личном кабинете

### 3. Конфигурация

Создай файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Заполни в файле `.env`:

```env
TELEGRAM_BOT_TOKEN=твой_токен
TELEGRAM_API_ID=123456789
TELEGRAM_API_HASH=abc123...
TELEGRAM_PHONE=+380501234567

CLAUDE_API_KEY=sk-ant-...
SMM_MEDIA_API_KEY=твой_ключ

PUBLISH_TIME=23:15
```

### 4. Редактирование System Prompts

Открой файл `config/config.js` и редактируй `systemPrompt` для каждого канала:

```javascript
export const channels = {
  medicine: {
    name: '@sofismm22',
    systemPrompt: `Ты - профессиональный медицинский контент-райтер...` // ← РЕДАКТИРУЙ ЭТО
  },
  nutrition: {
    name: '@sofiesmm',
    systemPrompt: `Ты - профессиональный нутрициолог...` // ← И ЭТО
  }
};
```

### 5. Запуск

```bash
npm start
```

## 📖 Использование

### Автоматическая публикация

Бот запускает цикл публикации в указанное время (по Кипру). По умолчанию: **23:15**

### Ручная публикация

Для тестирования отредактируй `bot.js` и добавь:

```javascript
// Вместо setTimeout(publishNow, 5000) измени на:
await publishNow(); // Запустится сразу
```

## 🔧 API Сервисов

### AI Generator (`services/ai-generator.js`)

```javascript
import { generateContent, generateFromIdea } from './services/ai-generator.js';

// Генерировать на основе исходного текста
const content = await generateContent(sourceText, systemPrompt);

// Генерировать на основе идеи
const content = await generateFromIdea(idea, systemPrompt);
```

### Publisher (`services/publisher.js`)

```javascript
import { initPublisher, publishToMultiple } from './services/publisher.js';

await initPublisher();
const results = await publishToMultiple(['@channel1', '@channel2'], message);
```

### Metrics Booster (`services/metrics-booster.js`)

```javascript
import { boostMetrics, getBalance } from './services/metrics-booster.js';

const result = await boostMetrics('https://t.me/@channel/123', 'tg_post_views', 100);
const balance = await getBalance();
```

### Parser (`services/telegram-parser.js`)

```javascript
import { initParser, getChannelPosts } from './services/telegram-parser.js';

await initParser();
const posts = await getChannelPosts('@channel_name', 5);
```

## ⚙️ Расширение

### Добавить новый канал

В файле `config/config.js` добавь:

```javascript
export const channels = {
  // ... существующие каналы
  myChannel: {
    name: '@my_channel',
    type: 'topic', // тип контента
    enabled: true,
    systemPrompt: `Ты - ..., создавай контент о ...`
  }
};
```

### Изменить время публикации

В файле `.env`:

```env
PUBLISH_TIME=14:30  # Новое время в формате HH:MM
```

## 🐛 Troubleshooting

### "Failed to generate content"
- Проверь Claude API ключ в `.env`
- Убедись что у аккаунта есть баланс

### "Failed to publish"
- Убедись что ты администратор в каналах
- Проверь правильность username канала
- Попробуй получить Telegram API credentials заново

### "Parser not connected"
- Первый запуск требует подтверждения кода верификации
- Убедись что `TELEGRAM_PHONE` указан правильно

## 📝 Лицензия

MIT

## 🤝 Поддержка

Вопросы? Проверь документацию выше или посмотри логи при запуске бота.
