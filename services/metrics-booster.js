import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const API_BASE = 'https://api.smm.media/api';

/**
 * Получает список доступных сервисов для повышения метрик
 * @returns {Promise<object[]>} - Список сервисов
 */
export async function getServices() {
  try {
    logger.info('Fetching SMM.media services...');

    const response = await axios.get(`${API_BASE}/services`, {
      params: {
        key: config.smmMediaKey,
      },
    });

    const telegramServices = response.data.filter(
      (s) =>
        s.service.toLowerCase().includes('telegram') ||
        s.service.toLowerCase().includes('views') ||
        s.service.toLowerCase().includes('like')
    );

    logger.info(`✓ Found ${telegramServices.length} Telegram services`);
    return telegramServices;
  } catch (error) {
    logger.error(`Failed to fetch services: ${error.message}`);
    return [];
  }
}

/**
 * Создаёт заказ на повышение метрик
 * @param {string} postUrl - Ссылка на пост
 * @param {string} serviceType - Тип сервиса (views, likes и т.д.)
 * @param {number} quantity - Количество
 * @returns {Promise<object>} - Информация о заказе
 */
export async function boostMetrics(postUrl, serviceType = 'tg_post_views', quantity = 100) {
  try {
    logger.info(`Boosting metrics: ${serviceType}, quantity: ${quantity}`);

    const response = await axios.post(`${API_BASE}/order`, {
      key: config.smmMediaKey,
      service: serviceType,
      link: postUrl,
      quantity: quantity,
    });

    if (response.data.status === 'success') {
      logger.info(`✓ Boost order created: ${response.data.order_id}`);
      return {
        success: true,
        orderId: response.data.order_id,
        charge: response.data.charge,
      };
    } else {
      logger.warn(`Boost failed: ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    logger.error(`Failed to boost metrics: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Проверяет статус заказа
 * @param {string} orderId - ID заказа
 * @returns {Promise<object>} - Статус заказа
 */
export async function getOrderStatus(orderId) {
  try {
    logger.info(`Checking order status: ${orderId}`);

    const response = await axios.get(`${API_BASE}/order/status`, {
      params: {
        key: config.smmMediaKey,
        order_id: orderId,
      },
    });

    logger.info(`Order ${orderId} status: ${response.data.status}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to get order status: ${error.message}`);
    return null;
  }
}

/**
 * Получает баланс аккаунта
 * @returns {Promise<number>} - Баланс
 */
export async function getBalance() {
  try {
    const response = await axios.get(`${API_BASE}/balance`, {
      params: {
        key: config.smmMediaKey,
      },
    });

    const balance = response.data.balance || 0;
    logger.info(`✓ SMM.media balance: $${balance.toFixed(2)}`);
    return balance;
  } catch (error) {
    logger.error(`Failed to get balance: ${error.message}`);
    return 0;
  }
}

export default {
  getServices,
  boostMetrics,
  getOrderStatus,
  getBalance,
};
