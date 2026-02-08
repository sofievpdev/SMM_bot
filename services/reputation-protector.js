import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Защита репутации поста от негативных реакций
 * Добавляет позитивные реакции (микс 👍🤩🎉🔥❤️)
 * Автоматически срабатывает если обнаружены негативные эмоции
 */

const API_BASE = 'https://smm.media/api/reseller';

/**
 * Добавляет позитивные реакции для защиты от негатива
 * @param {string} postUrl - URL поста (https://t.me/channel/messageId)
 * @param {number} quantity - Количество позитивных реакций (по умолчанию 50)
 * @returns {Promise<object>} - Результат заказа
 */
export async function protectPostReputation(postUrl, quantity = 50) {
  try {
    logger.info(`🛡️  Защита репутации поста от негатива...`);
    logger.info(`📍 URL: ${postUrl}`);
    logger.info(`👍 Позитивных реакций: ${quantity}`);

    const apiToken = process.env.SMM_MEDIA_API_KEY || config.smmMediaKey;

    if (!apiToken) {
      logger.error('SMM_MEDIA_API_KEY не конфигурирован');
      return { success: false, error: 'API key not configured' };
    }

    // Service ID 4057 = Микс позитивных реакций 👍🤩🎉🔥❤️
    const response = await axios.post(`${API_BASE}/create_order`, {
      api_token: apiToken,
      service_id: 4057, // Позитивные реакции микс
      link: postUrl,
      count: quantity,
    });

    if (response.data.order_id) {
      logger.success(`✅ Репутация защищена! Order #${response.data.order_id}`);
      logger.info(`   Реакций добавлено: ${quantity}`);
      logger.info(`   Тип: 👍 🤩 🎉 🔥 ❤️ (позитивный микс)`);

      return {
        success: true,
        orderId: response.data.order_id,
        status: response.data.status,
        reactions: quantity,
        type: 'positive-mix'
      };
    } else {
      const errorMsg = response.data.error || 'Unknown error';
      logger.warn(`⚠️  Не удалось добавить реакции: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error(`Ошибка защиты репутации: ${error.message}`);

    if (error.response) {
      logger.error(`Статус: ${error.response.status}`);
      logger.error(`Ответ: ${JSON.stringify(error.response.data)}`);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Добавляет МНОГО позитивных реакций для ликвидации негатива
 * (мега-защита при массовом негативе)
 * @param {string} postUrl - URL поста
 * @param {number} totalReactions - Количество реакций (по умолчанию 200)
 * @returns {Promise<object[]>} - Массив результатов
 */
export async function emergencyRepairReputation(postUrl, totalReactions = 200) {
  try {
    logger.error(`🚨 ЧРЕЗВЫЧАЙНАЯ ЗАЩИТА РЕПУТАЦИИ!`);
    logger.info(`${totalReactions} позитивных реакций для нейтрализации негатива\n`);

    const batchSize = 50;
    const batches = Math.ceil(totalReactions / batchSize);
    const results = [];

    for (let i = 0; i < batches; i++) {
      const count = Math.min(batchSize, totalReactions - i * batchSize);

      logger.info(`Батч ${i + 1}/${batches}: добавляю ${count} реакций...`);

      const result = await protectPostReputation(postUrl, count);
      results.push(result);

      // Задержка между батчами
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.success(`\n✅ Чрезвычайная защита завершена!`);
    logger.info(`Всего реакций добавлено: ${results.filter(r => r.success).length * batchSize}`);

    return results;

  } catch (error) {
    logger.error(`Ошибка чрезвычайной защиты: ${error.message}`);
    return [];
  }
}

export default {
  protectPostReputation,
  emergencyRepairReputation,
};
