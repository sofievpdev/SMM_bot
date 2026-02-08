import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const API_BASE = 'https://smm.media/api/reseller';

/**
 * Добавляет подписчиков-ботов в канал
 * Service ID 10045 = Боты | Держатся ~ до 30 дней
 * Цена: 0.12 руб/шт (116 руб/1000)
 *
 * @param {string} channelUrl - URL канала (например: https://t.me/sofismm22)
 * @param {number} quantity - Количество подписчиков (мин: 10, макс: 100000)
 * @returns {Promise<object>} - Результат заказа
 */
export async function boostSubscribers(channelUrl, quantity = 100) {
  try {
    logger.info(`👥 Добавляю ${quantity} подписчиков-ботов...`);
    logger.info(`📍 Канал: ${channelUrl}`);

    const apiToken = process.env.SMM_MEDIA_API_KEY || config.smmMediaKey;

    if (!apiToken) {
      logger.error('SMM_MEDIA_API_KEY не конфигурирован');
      return { success: false, error: 'API key not configured' };
    }

    // Service ID 10045 = Боты | Держатся ~ до 30 дней
    const payload = {
      api_token: apiToken,
      service_id: 10045,
      link: channelUrl,
      count: quantity,
    };

    logger.info(`📤 Отправляю в SMM.media API:`);
    logger.info(`   URL: ${API_BASE}/create_order`);
    logger.info(`   Service ID: 10045 (Боты ~30 дней)`);
    logger.info(`   Channel: ${channelUrl}`);
    logger.info(`   Count: ${quantity}`);
    logger.info(`   Примерная стоимость: ${(quantity * 0.12).toFixed(2)} руб`);

    const response = await axios.post(`${API_BASE}/create_order`, payload);

    logger.info(`📥 Ответ от SMM.media: ${JSON.stringify(response.data)}`);

    if (response.data.order_id) {
      logger.success(`✅ Подписчики заказаны! Order #${response.data.order_id}`);
      logger.info(`   Подписчиков: ${quantity}`);
      logger.info(`   Service: Боты | Держатся ~30 дней`);
      logger.info(`   Status: ${response.data.status}`);

      return {
        success: true,
        orderId: response.data.order_id,
        status: response.data.status,
        subscribers: quantity,
        type: 'bot-subscribers'
      };
    } else if (response.data.error) {
      logger.error(`❌ Ошибка SMM.media: ${response.data.error}`);
      return { success: false, error: response.data.error };
    } else {
      logger.warn(`⚠️ Неожиданный ответ: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'Unexpected response' };
    }

  } catch (error) {
    logger.error(`❌ Ошибка при добавлении подписчиков: ${error.message}`);

    if (error.response) {
      logger.error(`HTTP Status: ${error.response.status}`);
      logger.error(`Response: ${JSON.stringify(error.response.data)}`);

      if (error.response.data?.error) {
        logger.error(`SMM.media Error: ${error.response.data.error}`);
      }
    }

    return { success: false, error: error.message };
  }
}

/**
 * Проверяет статус заказа подписчиков
 * @param {string} orderId - ID заказа
 * @returns {Promise<object>} - Статус заказа
 */
export async function checkSubscriberOrder(orderId) {
  try {
    const apiToken = process.env.SMM_MEDIA_API_KEY || config.smmMediaKey;

    const response = await axios.post(`${API_BASE}/order_status`, {
      api_token: apiToken,
      order_id: orderId,
    });

    return response.data;
  } catch (error) {
    logger.error(`Ошибка проверки заказа: ${error.message}`);
    return { error: error.message };
  }
}

export default {
  boostSubscribers,
  checkSubscriberOrder,
};
