import { TelegramClient } from 'gramjs';
import { StringSession } from 'gramjs/sessions';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

let client = null;

/**
 * Инициализирует Telegram Client для публикации
 * @returns {Promise<TelegramClient>}
 */
export async function initPublisher() {
  try {
    if (client?.connected) {
      logger.info('Publisher already connected');
      return client;
    }

    logger.info('Initializing Telegram Publisher...');

    const stringSession = new StringSession('');
    client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
      connectionRetries: 5,
    });

    await client.connect();
    logger.info('✓ Publisher initialized');

    return client;
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
    if (!client || !client.connected) {
      await initPublisher();
    }

    logger.info(`Publishing to ${channelUsername}...`);

    const entity = await client.getEntity(channelUsername);
    const result = await client.sendMessage(entity, {
      message: message,
      parseMode: 'html',
    });

    logger.info(`✓ Message published to ${channelUsername} (ID: ${result.id})`);
    return { success: true, messageId: result.id, channel: channelUsername };
  } catch (error) {
    logger.error(`Failed to publish to ${channelUsername}: ${error.message}`);
    throw error;
  }
}

/**
 * Публикует сообщение в несколько каналов параллельно
 * @param {string[]} channels - Массив username каналов
 * @param {string} message - Текст сообщения
 * @returns {Promise<object[]>} - Массив результатов
 */
export async function publishToMultiple(channels, message) {
  try {
    logger.info(`Publishing to ${channels.length} channels...`);

    const promises = channels.map((channel) => publishMessage(channel, message));
    const results = await Promise.all(promises);

    logger.info(`✓ Published to ${channels.length} channels`);
    return results;
  } catch (error) {
    logger.error(`Failed to publish to multiple channels: ${error.message}`);
    throw error;
  }
}

/**
 * Отключает Telegram Client
 * @returns {Promise<void>}
 */
export async function disconnectPublisher() {
  try {
    if (client && client.connected) {
      await client.disconnect();
      logger.info('✓ Publisher disconnected');
    }
  } catch (error) {
    logger.error(`Failed to disconnect publisher: ${error.message}`);
  }
}

export default {
  initPublisher,
  publishMessage,
  publishToMultiple,
  disconnectPublisher,
};
