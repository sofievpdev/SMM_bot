import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Бустинг просмотров для Telegram постов
 * Service #821 = Мир | Живые просмотры
 */

const API_BASE = 'https://smm.media/api/reseller';

/**
 * Добавляет просмотры к посту
 * @param {string} postUrl - URL поста (https://t.me/channel/messageId)
 * @param {number} quantity - Количество просмотров (по умолчанию 300)
 * @returns {Promise<object>} - Результат заказа
 */
export async function boostViews(postUrl, quantity = 300) {
  try {
    logger.info(`📊 Добавляю просмотры к посту...`);
    logger.info(`📍 URL: ${postUrl}`);
    logger.info(`👀 Просмотров: ${quantity}`);

    const apiToken = process.env.SMM_MEDIA_API_KEY || config.smmMediaKey;

    if (!apiToken) {
      logger.error('SMM_MEDIA_API_KEY не конфигурирован');
      return { success: false, error: 'API key not configured' };
    }

    // Service ID 821 = Мир | Живые просмотры
    const response = await axios.post(`${API_BASE}/create_order`, {
      api_token: apiToken,
      service_id: 821, // Живые просмотры
      link: postUrl,
      count: quantity,
    });

    if (response.data.order_id) {
      logger.success(`✅ Просмотры заказаны! Order #${response.data.order_id}`);
      logger.info(`   Просмотров добавлено: ${quantity}`);
      logger.info(`   Service: Мир | Живые просмотры`);

      return {
        success: true,
        orderId: response.data.order_id,
        status: response.data.status,
        views: quantity,
        type: 'live-views'
      };
    } else {
      const errorMsg = response.data.error || 'Unknown error';
      logger.warn(`⚠️  Не удалось добавить просмотры: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error(`Ошибка при добавлении просмотров: ${error.message}`);

    if (error.response) {
      logger.error(`Статус: ${error.response.status}`);
      logger.error(`Ответ: ${JSON.stringify(error.response.data)}`);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Массовый бустинг просмотров (батчами)
 * @param {string} postUrl - URL поста
 * @param {number} totalViews - Общее количество просмотров
 * @param {number} batchSize - Размер батча (по умолчанию 300)
 * @returns {Promise<object[]>} - Массив результатов
 */
export async function boostViewsInBatches(postUrl, totalViews = 1000, batchSize = 300) {
  try {
    logger.info(`🚀 Массовый бустинг просмотров...`);
    logger.info(`   Всего просмотров: ${totalViews}`);
    logger.info(`   Размер батча: ${batchSize}\n`);

    const batches = Math.ceil(totalViews / batchSize);
    const results = [];

    for (let i = 0; i < batches; i++) {
      const count = Math.min(batchSize, totalViews - i * batchSize);

      logger.info(`Батч ${i + 1}/${batches}: добавляю ${count} просмотров...`);

      const result = await boostViews(postUrl, count);
      results.push(result);

      // Задержка между батчами
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.success(`\n✅ Бустинг просмотров завершён!`);
    logger.info(`Успешных батчей: ${results.filter(r => r.success).length}/${batches}`);

    return results;

  } catch (error) {
    logger.error(`Ошибка при массовом бустинге: ${error.message}`);
    return [];
  }
}

export default {
  boostViews,
  boostViewsInBatches,
};
