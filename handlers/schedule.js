import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { generateContent, generateFromIdea, generateFromWebContent } from '../services/ai-generator.js';
import { publishToMultiple } from '../services/publisher.js';
import { boostReactions } from '../services/metrics-booster.js';
import { boostViews } from '../services/views-booster.js';
import { config, channels } from '../config/config.js';
import { scrapeDailyContent } from '../services/web-scraper.js';
import { translateArticles } from '../services/translator.js';
import { findImageForPost, getImageAttribution } from '../services/image-search.js';
import { selectTrendingTopic, buildTrendPrompt } from '../services/trend-research.js';

let jobs = [];

/**
 * Обрезает текст для подписи к фото (max 1024 символа в Telegram)
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина (по умолчанию 1024)
 * @returns {string} - Обрезанный текст
 */
function trimForCaption(text, maxLength = 1024) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Обрезаем до максимальной длины
  let trimmed = text.substring(0, maxLength);

  // Ищем последнюю полную пунктуацию
  const lastPeriodIndex = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf('!'),
    trimmed.lastIndexOf('?')
  );

  if (lastPeriodIndex > maxLength * 0.7) {
    // Если пунктуация достаточно близко к концу - обрезаем там
    trimmed = trimmed.substring(0, lastPeriodIndex + 1);
  } else {
    // Иначе обрезаем на последнем пробеле
    const lastSpaceIndex = trimmed.lastIndexOf(' ');
    if (lastSpaceIndex > 0) {
      trimmed = trimmed.substring(0, lastSpaceIndex) + '...';
    }
  }

  return trimmed.trim();
}

/**
 * Инициализирует расписание публикаций на несколько раз в день
 * Использует publishTimes из config (например: ['08:00', '19:00'])
 * @returns {void}
 */
export function initSchedule() {
  try {
    const publishTimes = config.publishTimes || ['08:00', '19:00'];
    logger.info(`Initializing schedule for ${publishTimes.length} times per day...`);

    // Отключаем предыдущие задачи
    stopSchedule();

    // Создаём cron задачу для каждого времени публикации
    for (const publishTime of publishTimes) {
      const [hours, minutes] = publishTime.split(':').map(Number);
      const cronExpression = `${minutes} ${hours} * * *`;

      const publishJob = cron.schedule(cronExpression, async () => {
        logger.info(`⏰ Scheduled publish time reached: ${publishTime}`);
        await runPublishCycle();
      });

      jobs.push(publishJob);
      logger.info(`✓ Schedule initialized: ${cronExpression} (Cyprus timezone - ${publishTime})`);
    }

    logger.info(`✓ Total jobs scheduled: ${jobs.length}`);
  } catch (error) {
    logger.error(`Failed to initialize schedule: ${error.message}`);
  }
}

/**
 * Получает текущий день недели
 * @returns {string} - День недели в нижнем регистре: 'monday', 'tuesday' и т.д.
 */
function getCurrentDayOfWeek() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

/**
 * Генерирует контент для Friday (кейс пациента с монетизацией)
 * @param {object} channel - Конфигурация канала
 * @param {number} postNumber - Номер поста (1 или 2) для разнообразия
 * @returns {Promise<string>} - Сгенерированный контент
 */
async function generateCaseStudyPost(channel, postNumber = 1) {
  // Разные типы кейсов для разных постов
  const caseTypes = [
    // Первый кейс - про снижение веса
    {
      focus: 'снижение веса и улучшение метаболизма',
      problem: 'лишний вес, медленный метаболизм, низкая энергия',
      results: 'снижение веса, улучшение энергии, нормализация пищевого поведения'
    },
    // Второй кейс - про здоровье и энергию
    {
      focus: 'восстановление энергии и улучшение здоровья',
      problem: 'хроническая усталость, проблемы с ЖКТ, плохой сон',
      results: 'стабильная энергия весь день, улучшение сна, нормализация пищеварения'
    }
  ];

  const caseType = caseTypes[(postNumber - 1) % caseTypes.length];

  const caseStudyPrompt = `Создай аутентичный кейс клиента с фокусом на: ${caseType.focus}

ТИПИЧНАЯ ПРОБЛЕМА КЛИЕНТА: ${caseType.problem}

СТРУКТУРА КЕЙСА:
1. Проблема: Конкретная ситуация клиента
2. Причины: Краткий анализ (питание, образ жизни, стресс)
3. Наш подход: Консультация + 4-недельная программа
4. Результаты: ${caseType.results}
5. Главный инсайт: Что помогло больше всего

МОНЕТИЗАЦИЯ (CTA):
- "Базовая консультация" - первый шаг
- "4-недельная программа поддержки" - для стабильных результатов
- "Health as a Project" - премиум (только упоминание)

ВАЖНО:
- Длина: СТРОГО 800-950 символов (лимит Telegram для фото!)
- Тон: профессиональная спокойная подача, экспертная позиция (НЕ дружеский пересказ)
- НЕ используй ## заголовки (Markdown headers) - ТОЛЬКО эмодзи для структуры
- НЕ используй ** для форматирования - ТОЛЬКО простой текст и эмодзи`;

  try {
    const message = await generateFromIdea(caseStudyPrompt, channel);
    return message;
  } catch (error) {
    logger.error(`Failed to generate case study post: ${error.message}`);
    return null;
  }
}

/**
 * Генерирует контент для Sunday (Q&A / Вдохновение)
 * @param {object} channel - Конфигурация канала
 * @param {number} postNumber - Номер поста (1 или 2) для разнообразия контента
 * @returns {Promise<string>} - Сгенерированный контент
 */
async function generateInspirationPost(channel, postNumber = 1) {
  // Разные промпты для разных постов (ОЧЕНЬ РАЗНЫЕ темы!)
  const prompts = [
    // Первый пост - Разбор мифа о питании
    `Создай пост-разоблачение популярного мифа о здоровье/питании.

Выбери ОДИН миф:
- "Молоко вымывает кальций"
- "Детокс-соки очищают организм"
- "Углеводы после 6 вечера превращаются в жир"
- "Суперфуды творят чудеса"
- "Витамины из аптеки бесполезны"

Структура:
1. МИФ: [что говорят]
2. ПРАВДА: [что показывает наука]
3. Почему этот миф живёт
4. Что делать на самом деле

Требования:
- Длина: СТРОГО 800-950 символов (лимит Telegram для фото!)
- Тон: профессиональная спокойная подача, экспертная позиция, разоблачающий но доброжелательный
- Научные ссылки на исследования
- НЕ используй ## заголовки (Markdown headers) - ТОЛЬКО эмодзи для структуры
- НЕ используй ** для форматирования - ТОЛЬКО простой текст и эмодзи
- CTA: "Какие мифы развенчать в следующий раз? Пишите в комментариях!"`,

    // Второй пост - Личный совет на основе работы с клиентами
    `Создай пост с ЛИЧНОЙ историей из практики работы диетологом.

Формат "Что я заметила за годы работы":
- Выбери ОДНУ частую ошибку клиентов (например: пропуск завтрака, мало белка, нерегулярное питание)
- Расскажи почему это происходит
- Объясни последствия для здоровья
- Дай простое решение из 3-5 шагов

Требования:
- Длина: СТРОГО 800-950 символов (лимит Telegram для фото!)
- Тон: профессиональная спокойная подача, экспертная позиция (НЕ дружеский пересказ)
- Пиши от первого лица: "Я вижу...", "В моей практике..." - но как специалист, не как подруга
- НЕ используй ## заголовки (Markdown headers) - ТОЛЬКО эмодзи для структуры
- НЕ используй ** для форматирования - ТОЛЬКО простой текст и эмодзи
- CTA: "Что из этого резонирует с вами? Делитесь в комментариях!"`,
  ];

  const promptIndex = (postNumber - 1) % prompts.length;
  const inspirationPrompt = prompts[promptIndex];

  try {
    const message = await generateFromIdea(inspirationPrompt, channel);
    return message;
  } catch (error) {
    logger.error(`Failed to generate inspiration post: ${error.message}`);
    return null;
  }
}

/**
 * Генерирует пост на основе актуального тренда
 * @param {object} channel - Конфигурация канала
 * @param {string} dayTheme - Тема дня
 * @returns {Promise<string|null>} - Сгенерированный контент или null
 */
async function generateTrendingPost(channel, dayTheme) {
  try {
    logger.info('📈 Checking for trending health topics...');

    const trend = await selectTrendingTopic(dayTheme);

    if (!trend) {
      logger.info('No trending topic selected, using regular generation');
      return null;
    }

    logger.info(`🔥 Found hot topic: "${trend.topic}"`);

    const trendPrompt = buildTrendPrompt(trend, dayTheme);
    const message = await generateFromIdea(trendPrompt, channel);

    if (message) {
      logger.success(`✓ Generated trending post about: ${trend.topic}`);
    }

    return message;
  } catch (error) {
    logger.error(`Failed to generate trending post: ${error.message}`);
    return null;
  }
}

/**
 * Запускает цикл публикации и бустинга
 * Основной рабочий процесс бота с web scraping, переводом и AI генерацией
 */
export async function runPublishCycle() {
  try {
    logger.info('🚀 Starting publish cycle with web scraping...');

    const dayOfWeek = getCurrentDayOfWeek();
    logger.info(`📅 Current day: ${dayOfWeek}`);

    // Получаем план на день
    const dayPlan = config.weeklyPlan[dayOfWeek];
    if (!dayPlan) {
      logger.warn(`No plan found for day: ${dayOfWeek}`);
      return;
    }

    logger.info(`📋 Daily plan: theme=${dayPlan.theme}, monetize=${dayPlan.monetize}`);

    // Обрабатываем основной канал (medicine)
    const channel = channels.medicine;
    if (!channel || !channel.enabled) {
      logger.warn('Medicine channel is disabled');
      return;
    }

    logger.info(`\n📢 Processing channel: ${channel.name}`);

    // Массив для хранения сгенерированного контента
    const postsToPublish = [];

    try {
      // СПЕЦИАЛЬНЫЕ ДНИ: Friday и Sunday (генерируем без web scraping)
      if (dayOfWeek === 'friday') {
        logger.info('🎯 Friday: Generating case study post...');
        const casePost1 = await generateCaseStudyPost(channel, 1); // Кейс: снижение веса
        const casePost2 = await generateCaseStudyPost(channel, 2); // Кейс: энергия и здоровье
        if (casePost1) postsToPublish.push(casePost1);
        if (casePost2) postsToPublish.push(casePost2);
      } else if (dayOfWeek === 'sunday') {
        logger.info('💡 Sunday: Generating inspiration/Q&A post...');
        const inspPost1 = await generateInspirationPost(channel, 1); // Q&A формат
        const inspPost2 = await generateInspirationPost(channel, 2); // Вдохновение/План на неделю
        if (inspPost1) postsToPublish.push(inspPost1);
        if (inspPost2) postsToPublish.push(inspPost2);
      } else if (dayOfWeek === 'wednesday') {
        // СРЕДА: день трендов! Исследуем актуальные темы в longevity
        logger.info('📈 Wednesday: Trend research day! Looking for hot topics...');

        // Первый пост - из трендов
        const trendPost = await generateTrendingPost(channel, dayPlan.theme);
        if (trendPost) {
          postsToPublish.push(trendPost);
          logger.success('✓ Trending post generated!');
        }

        // Второй пост - из обычных источников
        logger.info('🌐 Scraping content for second post...');
        const articles = await scrapeDailyContent(dayOfWeek);
        if (articles && articles.length > 0) {
          const translatedArticles = await translateArticles(articles);
          if (translatedArticles.length > 0) {
            const post = await generateFromWebContent(translatedArticles[0], channel, dayPlan.theme);
            if (post) postsToPublish.push(post);
          }
        }

        // Если не получилось - fallback
        if (postsToPublish.length < 2) {
          const fallbackPost = await generateInspirationPost(channel);
          if (fallbackPost) postsToPublish.push(fallbackPost);
        }
      } else {
        // ДЛЯ ОСТАЛЬНЫХ ДНЕЙ: web scraping → translation → generation
        // + 30% шанс поста из актуальных трендов
        logger.info(`🌐 Scraping content for theme: ${dayPlan.theme}...`);

        // Проверяем тренды (30% шанс добавить пост из трендов)
        const shouldCheckTrends = Math.random() < 0.3;
        if (shouldCheckTrends) {
          logger.info('🎲 Checking for trending topics (random 30% trigger)...');
          const trendPost = await generateTrendingPost(channel, dayPlan.theme);
          if (trendPost) {
            postsToPublish.push(trendPost);
            logger.success('✓ Added trending topic post!');
          }
        }

        // 1. Парсим статьи
        let articles = await scrapeDailyContent(dayOfWeek);

        if (!articles || articles.length === 0) {
          logger.warn(`No articles scraped for ${dayOfWeek}, fallback to idea generation`);
          const idea = getRandomIdea(channel.type);
          const generatedContent = await generateFromIdea(idea, channel);
          if (generatedContent) postsToPublish.push(generatedContent);
        } else {
          logger.info(`✓ Scraped ${articles.length} articles`);

          // 2. Переводим (если на английском)
          logger.info('🔄 Translating articles...');
          const translatedArticles = await translateArticles(articles);
          logger.info(`✓ Translated ${translatedArticles.length} articles`);

          // 3. Генерируем посты из статей (учитываем уже добавленные из трендов)
          const postsNeeded = 2 - postsToPublish.length;
          logger.info(`✨ Generating ${postsNeeded} post(s) from articles...`);
          for (const article of translatedArticles.slice(0, postsNeeded)) {
            try {
              const post = await generateFromWebContent(article, channel, dayPlan.theme);
              if (post) {
                postsToPublish.push(post);
              }
            } catch (error) {
              logger.error(`Failed to generate post from article "${article.title}": ${error.message}`);
            }
          }
        }
      }

      // 4. Добавляем CTA на консультацию для определённых дней (вторник, четверг, суббота)
      const consultationDays = ['tuesday', 'thursday', 'saturday'];
      if (consultationDays.includes(dayOfWeek)) {
        logger.info(`📞 Adding consultation CTA for ${dayOfWeek}...`);
        const consultationCTA = '\n\n💬 Хотите персональную консультацию по диетологии? Пишите мне в личку!';

        // Добавляем CTA только к одному посту (случайному), чтобы не перебрать
        if (postsToPublish.length > 0) {
          const randomIndex = Math.floor(Math.random() * postsToPublish.length);
          postsToPublish[randomIndex] = postsToPublish[randomIndex] + consultationCTA;
          logger.info(`✓ Consultation CTA added to post #${randomIndex + 1}`);
        }
      }

      // 5. Публикуем все сгенерированные посты
      if (postsToPublish.length === 0) {
        logger.warn('No posts were generated');
        return;
      }

      logger.info(`\n📤 Publishing ${postsToPublish.length} post(s) to ${channel.name}...`);

      for (let i = 0; i < postsToPublish.length; i++) {
        const post = postsToPublish[i];
        try {
          logger.info(`Publishing post ${i + 1}/${postsToPublish.length}...`);

          // Ищем релевантную картинку на основе содержания поста
          let imageUrl = null;
          try {
            logger.info(`🔍 Searching for image based on post content...`);
            const image = await findImageForPost(dayPlan.theme, post);
            if (image) {
              imageUrl = image.url;
              logger.success(`✓ Found image: ${image.description}`);
              logger.info(`   📸 URL: ${imageUrl.substring(0, 80)}...`);
            } else {
              logger.warn(`⚠️ No image found for post content`);
            }
          } catch (imageError) {
            logger.error(`❌ Image search error: ${imageError.message}`);
            // Продолжаем публикацию без картинки если не смогли найти
          }

          // Публикуем пост (с картинкой если удалось найти)
          // Telegram ограничивает подписи к фото 1024 символами
          let postText = post;
          if (imageUrl && post.length > 1024) {
            logger.info(`⚠️ Post too long for caption (${post.length} chars), trimming to 1024...`);
            postText = trimForCaption(post, 1024);
            logger.info(`✓ Trimmed to ${postText.length} chars`);
          }
          const publishResult = await publishToMultiple([channel.name], postText, imageUrl);

          if (publishResult && publishResult[0]?.messageId) {
            logger.info(`✓ Post published: ${channel.name}/${publishResult[0].messageId}`);

            // Бустим метрики (опционально)
            await boostPostMetrics(channel.name, publishResult[0].messageId);
          }

          // Небольшая задержка между публикациями
          if (i < postsToPublish.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          logger.error(`Failed to publish post ${i + 1}: ${error.message}`);
        }
      }

      logger.info(`\n✓ ${postsToPublish.length} post(s) published to ${channel.name}`);
    } catch (error) {
      logger.error(`Error processing ${channel.name}: ${error.message}`);
    }

    logger.info('✓ Publish cycle completed');
  } catch (error) {
    logger.error(`Publish cycle failed: ${error.message}`);
  }
}

/**
 * Запускает публикацию немедленно (для тестирования)
 * @returns {Promise<void>}
 */
export async function publishNow() {
  logger.info('📢 Manual publish triggered');
  await runPublishCycle();
}

/**
 * Остановляет расписание
 */
export function stopSchedule() {
  jobs.forEach((job) => {
    if (job) job.stop();
  });
  jobs = [];
  logger.info('⏹️ Schedule stopped');
}

/**
 * Получает случайную идею для контента (для fallback генерации)
 */
function getRandomIdea(channelType) {
  const ideas = {
    medicine: [
      'Новое исследование о профилактике простуды',
      'Как правильно медитировать для здоровья',
      'Витамины которые реально помогают',
      'Техники дыхания для снятия стресса',
      'Как укрепить иммунитет осенью',
    ],
    nutrition: [
      'Полезные закуски вместо чипсов',
      'Как готовить овощи чтобы они были вкусными',
      'Легкие завтраки за 5 минут',
      'Белки растительного происхождения',
      'Как начать есть здоровее без диет',
    ],
  };

  const typeIdeas = ideas[channelType] || ideas.medicine;
  return typeIdeas[Math.floor(Math.random() * typeIdeas.length)];
}

/**
 * Добавляет метрики к посту через SMM.media API
 * - 20 позитивных реакций (service #4057)
 * - 300 просмотров (service #821)
 *
 * ⚠️ ВАЖНО: Для работы нужны переменные окружения:
 * - SMM_MEDIA_API_KEY - ключ API для SMM.media
 */
async function boostPostMetrics(channel, messageId) {
  try {
    const postUrl = `https://t.me/${channel.replace('@', '')}/${messageId}`;
    logger.info(`\n📊 Boosting post metrics...`);

    // 1. Добавляем 20 позитивных реакций (👍🤩🎉🔥❤️) через SMM.media API (service #4057)
    logger.info(`💚 Adding 20 positive reactions to: ${postUrl}`);
    const reactionsResult = await boostReactions(postUrl, 20);

    if (reactionsResult.success) {
      logger.success(`✓ Reactions boost order created: #${reactionsResult.orderId}`);
    } else {
      logger.warn(`⚠️ Could not add reactions: ${reactionsResult.error}`);
    }

    // 2. Добавляем 300+ просмотров (service #821)
    logger.info(`👀 Adding 300 live views to: ${postUrl}`);
    const viewsResult = await boostViews(postUrl, 300);

    if (viewsResult.success) {
      logger.success(`✓ Views boost order created: #${viewsResult.orderId}`);
    } else {
      logger.warn(`⚠️ Could not add views: ${viewsResult.error}`);
    }

  } catch (error) {
    logger.warn(`Could not boost post metrics: ${error.message}`);
  }
}

export default {
  initSchedule,
  publishNow,
  stopSchedule,
  runPublishCycle,
};
