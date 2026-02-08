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

let jobs = [];

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
 * @returns {Promise<string>} - Сгенерированный контент
 */
async function generateCaseStudyPost(channel) {
  const caseStudyPrompt = `Создай аутентичный кейс пациента на основе типичных клиентов в области здоровья и питания.

СТРУКТУРА КЕЙСА:
1. Проблема: Опиши проблему клиента (вес, здоровье, питание, энергия)
2. Почему это произошло: Краткий анализ причин
3. Что мы сделали: Наш подход (консультация + 4-недельная программа)
4. Результаты: Конкретные результаты (вес, энергия, здоровье показатели)
5. Выводы: Что помогло больше всего

ВАЖНО - МОНЕТИЗАЦИЯ:
CTA должен быть трёхуровневый:
- "Базовая консультация" (доступна всем)
- "4-недельная программа поддержки" (для более серьёзных результатов)
- "Health as a Project" (ПРЕМИУМ - только упоминание, это эксклюзивная дорогая программа для избранных)

Длина: 900-1200 символов
Тон: профессиональный, вдохновляющий`;

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
 * @returns {Promise<string>} - Сгенерированный контент
 */
async function generateInspirationPost(channel) {
  const inspirationPrompt = `Создай еженедельный обзорный пост или вдохновляющий контент о здоровье.

Варианты:
1. Q&A: Ответь на 2-3 частых вопроса о здоровье
2. Еженедельный план: Что попробовать на этой неделе
3. Вдохновение: История успеха или мотивирующий факт

Требования:
- Длина: 900-1200 символов
- Тон: профессиональный, вдохновляющий
- Научная база
- CTA: предложи вопросы в комментариях или поделиться опытом`;

  try {
    const message = await generateFromIdea(inspirationPrompt, channel);
    return message;
  } catch (error) {
    logger.error(`Failed to generate inspiration post: ${error.message}`);
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
        const casePost1 = await generateCaseStudyPost(channel);
        const casePost2 = await generateCaseStudyPost(channel); // Два поста в пятницу
        if (casePost1) postsToPublish.push(casePost1);
        if (casePost2) postsToPublish.push(casePost2);
      } else if (dayOfWeek === 'sunday') {
        logger.info('💡 Sunday: Generating inspiration/Q&A post...');
        const inspPost1 = await generateInspirationPost(channel);
        const inspPost2 = await generateInspirationPost(channel); // Два поста в воскресенье
        if (inspPost1) postsToPublish.push(inspPost1);
        if (inspPost2) postsToPublish.push(inspPost2);
      } else {
        // ДЛЯ ОСТАЛЬНЫХ ДНЕЙ: web scraping → translation → generation
        logger.info(`🌐 Scraping content for theme: ${dayPlan.theme}...`);

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

          // 3. Генерируем посты из статей
          logger.info('✨ Generating posts from articles...');
          for (const article of translatedArticles.slice(0, 2)) {
            // Берём максимум 2 статьи
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

      // 4. Публикуем все сгенерированные посты
      if (postsToPublish.length === 0) {
        logger.warn('No posts were generated');
        return;
      }

      logger.info(`\n📤 Publishing ${postsToPublish.length} post(s) to ${channel.name}...`);

      for (let i = 0; i < postsToPublish.length; i++) {
        const post = postsToPublish[i];
        try {
          logger.info(`Publishing post ${i + 1}/${postsToPublish.length}...`);

          // Ищем релевантную картинку
          let imageUrl = null;
          try {
            const image = await findImageForPost(dayPlan.theme, post.substring(0, 100));
            if (image) {
              imageUrl = image.url;
              logger.info(`✓ Found image: ${image.description}`);
            }
          } catch (imageError) {
            logger.warn(`Could not find image: ${imageError.message}`);
            // Продолжаем публикацию без картинки если не смогли найти
          }

          // Публикуем пост (с картинкой если удалось найти)
          const publishResult = await publishToMultiple([channel.name], post, imageUrl);

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
