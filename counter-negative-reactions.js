import dotenv from 'dotenv';
import axios from 'axios';
import { logger } from './utils/logger.js';

dotenv.config();

async function counterNegativeReactions() {
  logger.info('🛡️  ЗАЩИТА ОТ НЕГАТИВНЫХ РЕАКЦИЙ\n');
  logger.info('═'.repeat(60));

  // Запрос у пользователя параметров
  const args = process.argv.slice(2);

  if (args.length < 2) {
    logger.error('❌ Использование: node counter-negative-reactions.js <channel> <messageId> [количество]');
    logger.info('\nПримеры:');
    logger.info('  node counter-negative-reactions.js sofismm22 12345');
    logger.info('  node counter-negative-reactions.js sofismm22 12345 100');
    process.exit(1);
  }

  const channel = args[0].replace('@', '');
  const messageId = args[1];
  const quantity = parseInt(args[2]) || 50; // По умолчанию 50 реакций

  const postUrl = `https://t.me/${channel}/${messageId}`;

  logger.info('🎯 ПАРАМЕТРЫ:');
  logger.info(`📍 Канал: @${channel}`);
  logger.info(`📌 Пост ID: ${messageId}`);
  logger.info(`👍 Позитивных реакций: ${quantity}`);
  logger.info(`🔗 URL: ${postUrl}\n`);

  const apiToken = process.env.SMM_MEDIA_API_KEY;

  if (!apiToken) {
    logger.error('❌ SMM_MEDIA_API_KEY не установлен!');
    process.exit(1);
  }

  try {
    logger.info('📤 Отправляю заказ на SMM.media...');
    logger.info('   Service ID: 4057 (Реакции 👍🤩🎉🔥❤️)\n');

    const response = await axios.post('https://smm.media/api/reseller/create_order', {
      api_token: apiToken,
      service_id: 4057, // Микс позитивных реакций
      link: postUrl,
      count: quantity,
    });

    if (response.data.order_id) {
      logger.success('✅ УСПЕШНО!\n');
      logger.info('📋 Детали заказа:');
      logger.info(`   Order ID: ${response.data.order_id}`);
      logger.info(`   Статус: ${response.data.status}`);
      logger.info(`   Реакций заказано: ${quantity}`);
      logger.info(`   Тип: Микс 👍🤩🎉🔥❤️\n`);

      logger.info('⏱️  Реакции будут добавлены в течение 5-10 минут\n');

      logger.info('═'.repeat(60));
      logger.success('🛡️  Позитивные реакции защитят пост от негатива!');
      logger.info('═'.repeat(60));
    } else {
      logger.error('❌ Ошибка ответа:');
      logger.error(JSON.stringify(response.data));
    }

  } catch (error) {
    logger.error(`❌ Ошибка: ${error.message}`);
    if (error.response) {
      logger.error(`Статус: ${error.response.status}`);
      logger.error(`Ответ: ${JSON.stringify(error.response.data)}`);
    }
    process.exit(1);
  }
}

counterNegativeReactions();
