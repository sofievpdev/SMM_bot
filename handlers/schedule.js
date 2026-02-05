import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { generateContent, generateFromIdea } from '../services/ai-generator.js';
import { publishToMultiple } from '../services/publisher.js';
import { boostMetrics } from '../services/metrics-booster.js';
import { channels } from '../config/config.js';

let jobs = [];

/**
 * Инициализирует расписание публикаций
 * @param {string} publishTime - Время публикации (HH:MM формат)
 * @returns {void}
 */
export function initSchedule(publishTime = '23:15') {
  try {
    logger.info(`Initializing schedule for ${publishTime}...`);

    // Парсим время (HH:MM)
    const [hours, minutes] = publishTime.split(':').map(Number);

    // Создаём cron выражение (минута часыMichael * * * - каждый день)
    const cronExpression = `${minutes} ${hours} * * *`;

    // Отключаем предыдущие задачи
    stopSchedule();

    // Создаём основную задачу публикации
    const publishJob = cron.schedule(cronExpression, async () => {
      logger.info('⏰ Scheduled publish time reached');
      await runPublishCycle();
    });

    jobs.push(publishJob);
    logger.info(`✓ Schedule initialized: ${cronExpression} (Cyprus timezone)`);

    // Для отладки: выводим info о следующих запусках
    logger.info(`Next run: Daily at ${publishTime} Cyprus time`);
  } catch (error) {
    logger.error(`Failed to initialize schedule: ${error.message}`);
  }
}

/**
 * Запускает цикл публикации и бустинга
 * Основной рабочий процесс бота
 */
export async function runPublishCycle() {
  try {
    logger.info('Starting publish cycle...');

    // Обрабатываем каждый включённый канал
    for (const channelKey of Object.keys(channels)) {
      const channel = channels[channelKey];

      if (!channel.enabled) {
        logger.info(`⊘ Channel ${channel.name} is disabled`);
        continue;
      }

      try {
        logger.info(`\n📢 Processing channel: ${channel.name}`);

        // Генерируем контент
        // TODO: Замени на реальную генерацию из парсера когда API_ID и API_HASH будут добавлены
        const idea = getRandomIdea(channel.type);
        const generatedContent = await generateFromIdea(idea, channel.systemPrompt);

        if (!generatedContent) {
          logger.warn(`Failed to generate content for ${channel.name}`);
          continue;
        }

        // Публикуем
        logger.info(`Publishing to ${channel.name}...`);
        const publishResult = await publishToMultiple([channel.name], generatedContent);

        // Бустим метрики (опционально)
        if (publishResult[0]?.messageId) {
          await boostPostMetrics(channel.name, publishResult[0].messageId);
        }

        logger.info(`✓ ${channel.name} processed successfully\n`);
      } catch (error) {
        logger.error(`Error processing ${channel.name}: ${error.message}`);
      }
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
  logger.info('Manual publish triggered');
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
  logger.info('Schedule stopped');
}

/**
 * Получает случайную идею для контента (для демонстрации)
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
 * Бустит метрики поста
 */
async function boostPostMetrics(channel, messageId) {
  try {
    const postUrl = `https://t.me/${channel.replace('@', '')}/${messageId}`;
    logger.info(`Boosting metrics for: ${postUrl}`);

    const result = await boostMetrics(postUrl, 'tg_post_views', 100);

    if (result.success) {
      logger.info(`✓ Boost order created: ${result.orderId}`);
    }
  } catch (error) {
    logger.warn(`Could not boost metrics: ${error.message}`);
  }
}

export default {
  initSchedule,
  publishNow,
  stopSchedule,
  runPublishCycle,
};
