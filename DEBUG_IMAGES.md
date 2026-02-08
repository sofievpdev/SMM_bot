# 🖼️ Отладка публикации картинок

## Полный workflow публикации с картинкой

```
schedule.js:
1. findImageForPost(theme) → ищет картинку
   ↓
2. if (image) → imageUrl = image.url
   ↓
publishToMultiple(channels, post, imageUrl):
3. if (imageUrl) → используем sendPhoto
   ↓
publisher.js publishPhoto():
4. axios.post(/sendPhoto, {photo: imageUrl, caption: post})
   ↓
5. Telegram API возвращает результат
```

## Как отладить если картинок нет

### 1. Посмотри логи и ищи эту последовательность:

```bash
curl https://your-app.onrender.com/api/logs | grep "image\|Image\|sendPhoto"
```

**Должно быть:**
```
[INFO] 🔍 Searching for image (theme: oncology)...
[SUCCESS] ✓ Found image: man in white dress shirt
[INFO] 📸 URL: https://images.unsplash.com/...
[INFO] 📢 Publishing to 1 channel(s) WITH IMAGE 📸
[INFO] ✨ Using sendPhoto endpoint
[INFO] 📸 Publishing photo to @sofismm22...
[INFO] 📥 Response: {"ok":true,"result":{"message_id":123}}
[SUCCESS] ✓ Photo published to @sofismm22 (ID: 123)
```

### 2. Если логов нет, это может быть:

**❌ Сценарий 1: Image search fails**
```
[ERROR] ❌ Image search error: ...
⚠️ No image found for theme: oncology
```
**Решение:** Проверь Unsplash API key и интернет

**❌ Сценарий 2: Image найдена, но не публикуется**
```
[SUCCESS] ✓ Found image: ...
[INFO] ⚠️ No image URL provided - publishing text only
```
**Решение:** Проблема в переходе imageUrl между функциями - проверь код

**❌ Сценарий 3: sendPhoto ошибка**
```
[ERROR] ❌ Failed to publish photo: Bad Request
[ERROR] HTTP Status: 400
[ERROR] Response: {"ok":false,"error_code":400,"description":"Bad Request: ..."}
```
**Решение:** 
- Проверь что Telegram bot имеет права на публикацию в канал
- Проверь что канал публичный (@sofismm22, а не приватный)
- Проверь что imageUrl валидный URL

## Команды отладки

### Получить последние логи по картинкам
```bash
curl https://your-app.onrender.com/api/logs?limit=500 | grep -i "image\|photo\|sendphoto"
```

### Получить только ошибки
```bash
curl https://your-app.onrender.com/api/logs/errors | grep -i "image"
```

### Получить логи за конкретный день
```bash
curl https://your-app.onrender.com/api/logs/2026-02-08 | grep "image"
```

### Полный лог одного цикла публикации
```bash
curl https://your-app.onrender.com/api/logs?limit=200 | grep -A50 "Starting publish cycle"
```

## Возможные проблемы и решения

### 1. Картинки НЕ публикуются вообще

**Шаг 1:** Проверь есть ли вообще попытки поиска картинок
```bash
curl https://your-app.onrender.com/api/logs | grep "Searching for image" | wc -l
```

Если 0 → публикация не запускается вообще

**Шаг 2:** Проверь код schedule.js
- Есть ли вызов `findImageForPost()`?
- Передается ли `imageUrl` в `publishToMultiple()`?

### 2. Картинки ищутся, но "not found"

```
[INFO] 🔍 Searching for image (theme: oncology)...
[WARNING] ⚠️ No image found for theme: oncology
```

**Решение:**
1. Проверь Unsplash API key в .env:
   ```bash
   echo $UNSPLASH_ACCESS_KEY
   ```

2. Тестируй поиск вручную:
   ```bash
   curl "https://api.unsplash.com/search/photos?query=cancer+prevention&client_id=YOUR_KEY"
   ```

3. Проверь что Unsplash API key не заблокирован

### 3. sendPhoto ошибка 400

Скорее всего проблема в Telegram:
1. Проверь что канал публичный (начинается с @)
2. Проверь что бот админ канала и может постить
3. Проверь что imageUrl имеет протокол https://

### 4. sendPhoto ошибка 401/403

Обычно это проблема с токеном:
1. Проверь что TELEGRAM_BOT_TOKEN правильный
2. Проверь что не истек срок токена
3. Попробуй получить новый токен от @BotFather

## Тестирование вручную

Если хочешь протестировать без полного запуска бота:

```bash
# Откройся на сервере и запусти Node REPL
node

# Импортируем функцию
import { findImageForPost } from './services/image-search.js';

# Ищем картинку
const img = await findImageForPost('oncology');
console.log(img);

# Если вернул результат → Unsplash работает
# Если null → проблема с API key
```

## Что должно быть в логах при успешной публикации

```
[INFO] 🚀 Starting publish cycle with web scraping...
[INFO] 📅 Current day: monday
[INFO] 📋 Daily plan: theme=oncology, monetize=false
[INFO] 📢 Processing channel: @sofismm22
[INFO] 🌐 Scraping content for theme: oncology...
[SUCCESS] ✅ Scraped 2 articles
[INFO] 🔄 Translating articles...
[SUCCESS] ✅ Translated 2 articles
[INFO] ✨ Generating posts from articles...
[SUCCESS] ✅ Post generated (950 chars)

[INFO] 🔍 Searching for image (theme: oncology)...
[SUCCESS] ✓ Found image: man in white dress...
[INFO] 📸 URL: https://images.unsplash.com/...

[INFO] 📢 Publishing to 1 channel(s) WITH IMAGE 📸
[INFO] ✨ Using sendPhoto endpoint
[INFO] 📸 Publishing photo to @sofismm22...
[INFO] 📥 Response: {"ok":true...}
[SUCCESS] ✓ Photo published to @sofismm22 (ID: 456)

[INFO] 📊 Boosting post metrics...
[SUCCESS] ✓ Reactions boost order created: #1234567
[SUCCESS] ✓ Views boost order created: #1234568
```

