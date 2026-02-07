import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { initSchedule, publishNow, stopSchedule } from './handlers/schedule.js';
import { disconnectPublisher } from './services/publisher.js';

// Проверка переменных окружения
function validateConfig() {
  const required = ['TELEGRAM_BOT_TOKEN', 'CLAUDE_API_KEY', 'SMM_MEDIA_API_KEY'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required env variables: ${missing.join(', ')}`);
    logger.info('Please create .env file with required variables');
    logger.info('Use .env.example as a template');
    process.exit(1);
  }

  logger.info('✓ All required env variables present');
}

/**
 * Инициализирует бота
 */
async function initBot() {
  try {
    logger.info('╔════════════════════════════════════════╗');
    logger.info('║     🤖 SMM BOT v1.0.0                ║');
    logger.info('║  Telegram Content Generator & Publisher║');
    logger.info('╚════════════════════════════════════════╝\n');

    validateConfig();

    logger.info(`Environment: ${config.isDev ? 'development' : 'production'}`);
    logger.info(`Publish times: ${config.publishTimes.join(', ')} (Cyprus TZ)\n`);

    // Инициализируем расписание (читает publishTimes из config)
    initSchedule();

    logger.success('✓ Bot initialized successfully\n');
    logger.info('Commands:');
    logger.info('  - Manual publish: Press Ctrl+Shift+P');
    logger.info('  - Stop bot: Press Ctrl+C\n');

    // Для демонстрации - публикуем сразу при запуске
    logger.info('Testing publish cycle in 5 seconds...\n');
    setTimeout(async () => {
      try {
        await publishNow();
      } catch (error) {
        logger.error(`Test publish failed: ${error.message}`);
      }
    }, 5000);
  } catch (error) {
    logger.error(`Failed to initialize bot: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('\nShutting down...');
  stopSchedule();

  try {
    await disconnectPublisher();
  } catch (error) {
    logger.warn(`Cleanup warning: ${error.message}`);
  }

  logger.success('Bot stopped gracefully');
  process.exit(0);
}

// Обработчики сигналов
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at:${promise}, reason:${reason}`);
});

// Запуск бота
initBot().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
