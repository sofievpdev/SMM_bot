import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { Telegraf } from 'telegraf';

const API_BASE = 'https://smm.media/api/reseller';
const SMM_REACTIONS_API = 'https://smm.media/api/telegram/reactions';

// Инициализируем Telegram бота для добавления reactions
const tg = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

/**
 * Получает список доступных сервисов для повышения метрик
 * @returns {Promise<object[]>} - Список сервисов
 */
export async function getServices() {
  try {
    logger.info('Fetching SMM.media services...');

    const response = await axios.post(`${API_BASE}/services`, {
      api_token: config.smmMediaKey,
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

    const response = await axios.post(`${API_BASE}/create_order`, {
      api_token: config.smmMediaKey,
      service_id: serviceType,
      link: postUrl,
      count: quantity,
    });

    if (response.data.order_id) {
      logger.info(`✓ Boost order created: ${response.data.order_id}`);
      return {
        success: true,
        orderId: response.data.order_id,
        status: response.data.status,
      };
    } else {
      logger.warn(`Boost failed: ${response.data.error || 'Unknown error'}`);
      return { success: false, error: response.data.error || 'Unknown error' };
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

    const response = await axios.post(`${API_BASE}/order/status`, {
      api_token: config.smmMediaKey,
      order_id: orderId,
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
    const response = await axios.post(`${API_BASE}/balance`, {
      api_token: config.smmMediaKey,
    });

    const balance = response.data.balance || 0;
    logger.info(`✓ SMM.media balance: $${balance.toFixed(2)}`);
    return balance;
  } catch (error) {
    logger.error(`Failed to get balance: ${error.message}`);
    return 0;
  }
}

/**
 * Добавляет позитивные реакции (эмоции) к посту через SMM.media API
 * @param {string} postUrl - URL поста (например: https://t.me/sofismm22/8)
 * @param {number} quantity - Количество реакций (по умолчанию 20)
 * @returns {Promise<object>} - Результат заказа
 */
export async function boostReactions(postUrl, quantity = 20) {
  try {
    logger.info(`💚 Adding ${quantity} positive reactions to: ${postUrl}`);

    // Парсим URL поста
    const urlMatch = postUrl.match(/t\.me\/([^/]+)\/(\d+)/);
    if (!urlMatch) {
      logger.error('Invalid post URL format');
      return { success: false, error: 'Invalid post URL' };
    }

    const [_, channel, messageId] = urlMatch;

    // Создаём заказ через SMM.media API для добавления reactions
    const response = await axios.post(`${API_BASE}/create_order`, {
      api_token: process.env.SMM_MEDIA_API_KEY || config.smmMediaKey,
      service_id: 'tg_post_reactions', // Service ID для reactions
      link: postUrl,
      count: quantity,
      reaction: '👍', // Позитивная реакция - лайк
    });

    if (response.data.order_id) {
      logger.info(`✓ Reactions boost order created: ${response.data.order_id}`);
      return {
        success: true,
        orderId: response.data.order_id,
        status: response.data.status,
        reactions: quantity,
      };
    } else {
      // Если SMM.media не поддерживает reactions, попробуем альтернативный способ
      logger.warn(`SMM.media reactions service not available: ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    logger.error(`Failed to boost reactions: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Добавляет множество позитивных реакций через SMM.media (batch)
 * @param {string} postUrl - URL поста
 * @param {number} totalReactions - Общее количество реакций
 * @param {number} batchSize - Размер батча (по умолчанию 20)
 * @returns {Promise<object[]>} - Массив результатов заказов
 */
export async function boostReactionsBatch(postUrl, totalReactions = 100, batchSize = 20) {
  try {
    const results = [];
    const batches = Math.ceil(totalReactions / batchSize);

    logger.info(`🚀 Boosting ${totalReactions} reactions in ${batches} batches...`);

    for (let i = 0; i < batches; i++) {
      const count = Math.min(batchSize, totalReactions - i * batchSize);
      const result = await boostReactions(postUrl, count);
      results.push(result);

      // Небольшая задержка между батчами
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`✓ Reactions boost completed: ${results.length} orders`);
    return results;
  } catch (error) {
    logger.error(`Failed to boost reactions batch: ${error.message}`);
    return [];
  }
}

export default {
  getServices,
  boostMetrics,
  boostReactions,
  boostReactionsBatch,
  getOrderStatus,
  getBalance,
};
