import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const TELEGRAM_API = `https://api.telegram.org/bot${config.botToken}`;

/**
 * Инициализирует publisher (проверяет токен)
 * @returns {Promise<boolean>}
 */
export async function initPublisher() {
  try {
    logger.info('Initializing Telegram Publisher...');

    const response = await axios.get(`${TELEGRAM_API}/getMe`);

    if (response.data.ok) {
      logger.info(`✓ Publisher initialized (Bot: @${response.data.result.username})`);
      return true;
    } else {
      throw new Error('Invalid bot token');
    }
  } catch (error) {
    logger.error(`Failed to initialize publisher: ${error.message}`);
    throw error;
  }
}

/**
 * Публикует сообщение в канал
 * @param {string} channelUsername - Username канала (например: @sofismm22)
 * @param {string} message - Текст сообщения
 * @returns {Promise<object>} - Результат публикации
 */
export async function publishMessage(channelUsername, message) {
  try {
    logger.info(`Publishing to ${channelUsername}...`);

    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: channelUsername,
      text: message,
      parse_mode: 'HTML',
    });

    if (response.data.ok) {
      const messageId = response.data.result.message_id;
      logger.info(`✓ Message published to ${channelUsername} (ID: ${messageId})`);
      return { success: true, messageId, channel: channelUsername };
    } else {
      throw new Error(response.data.description || 'Unknown error');
    }
  } catch (error) {
    logger.error(`Failed to publish to ${channelUsername}: ${error.message}`);
    throw error;
  }
}

/**
 * Публикует фото с подписью в канал
 * @param {string} channelUsername - Username канала (например: @sofismm22)
 * @param {string} imageUrl - URL картинки
 * @param {string} caption - Подпись (текст поста)
 * @returns {Promise<object>} - Результат публикации
 */
export async function publishPhoto(channelUsername, imageUrl, caption) {
  try {
    logger.info(`Publishing photo to ${channelUsername}...`);

    const response = await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: channelUsername,
      photo: imageUrl,
      caption: caption,
      parse_mode: 'HTML',
    });

    if (response.data.ok) {
      const messageId = response.data.result.message_id;
      logger.info(`✓ Photo published to ${channelUsername} (ID: ${messageId})`);
      return { success: true, messageId, channel: channelUsername };
    } else {
      throw new Error(response.data.description || 'Unknown error');
    }
  } catch (error) {
    logger.error(`Failed to publish photo to ${channelUsername}: ${error.message}`);
    throw error;
  }
}

/**
 * Публикует сообщение в несколько каналов параллельно
 * @param {string[]} channels - Массив username каналов
 * @param {string} message - Текст сообщения
 * @param {string} imageUrl - (опционально) URL картинки для публикации с фото
 * @returns {Promise<object[]>} - Массив результатов
 */
export async function publishToMultiple(channels, message, imageUrl = null) {
  try {
    logger.info(`Publishing to ${channels.length} channels${imageUrl ? ' with image' : ''}...`);

    let promises;
    if (imageUrl) {
      // Публикуем с фото
      promises = channels.map((channel) => publishPhoto(channel, imageUrl, message));
    } else {
      // Публикуем обычное текстовое сообщение
      promises = channels.map((channel) => publishMessage(channel, message));
    }

    const results = await Promise.all(promises);

    logger.info(`✓ Published to ${channels.length} channels`);
    return results;
  } catch (error) {
    logger.error(`Failed to publish to multiple channels: ${error.message}`);
    throw error;
  }
}

/**
 * Отключает publisher (заглушка для совместимости)
 * @returns {Promise<void>}
 */
export async function disconnectPublisher() {
  logger.info('✓ Publisher disconnected');
}

export default {
  initPublisher,
  publishMessage,
  publishPhoto,
  publishToMultiple,
  disconnectPublisher,
};
