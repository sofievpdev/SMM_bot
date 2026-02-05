import { TelegramClient } from 'gramjs';
import { StringSession } from 'gramjs/sessions';
import { Api } from 'gramjs';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

let client = null;

/**
 * Инициализирует Telegram Client для парсинга
 * @returns {Promise<TelegramClient>}
 */
export async function initParser() {
  try {
    if (client?.connected) {
      logger.info('Parser already connected');
      return client;
    }

    logger.info('Initializing Telegram Parser...');

    const stringSession = new StringSession('');
    client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
      connectionRetries: 5,
    });

    // Для первого запуска нужна аутентификация
    if (!client.connected) {
      await client.connect();
      logger.info('Connected, starting authentication...');

      // Вход в аккаунт
      await client.start({
        phoneNumber: config.phone,
        password: async () => {
          logger.info('Enter 2FA password if you have one:');
          // Для автоматизации можно добавить логику обработки кода верификации
          return undefined;
        },
        onError: (err) => {
          logger.error(`Auth error: ${err.message}`);
        },
      });
    }

    logger.info('✓ Parser initialized');
    return client;
  } catch (error) {
    logger.error(`Failed to initialize parser: ${error.message}`);
    throw error;
  }
}

/**
 * Получает последние посты из канала
 * @param {string} channelUsername - Username канала (например: @med_skill_com)
 * @param {number} limit - Количество постов для получения
 * @returns {Promise<object[]>} - Массив постов
 */
export async function getChannelPosts(channelUsername, limit = 5) {
  try {
    if (!client || !client.connected) {
      await initParser();
    }

    logger.info(`Fetching ${limit} posts from ${channelUsername}...`);

    const entity = await client.getEntity(channelUsername);
    const messages = await client.getMessages(entity, { limit });

    const posts = messages.map((msg) => ({
      id: msg.id,
      text: msg.text || msg.message || '',
      date: msg.date,
      isForward: msg.fwdFrom !== null,
      views: msg.views || 0,
      reactions: msg.reactions ? msg.reactions.length : 0,
      hasMedia: msg.media !== null,
    }));

    logger.info(`✓ Fetched ${posts.length} posts from ${channelUsername}`);
    return posts;
  } catch (error) {
    logger.error(`Failed to fetch posts from ${channelUsername}: ${error.message}`);
    throw error;
  }
}

/**
 * Получает определённое количество постов для обработки
 * @param {string} channelUsername - Username канала
 * @returns {Promise<object>} - Случайный пост
 */
export async function getRandomPost(channelUsername) {
  try {
    const posts = await getChannelPosts(channelUsername, 10);

    if (posts.length === 0) {
      logger.warn(`No posts found in ${channelUsername}`);
      return null;
    }

    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    logger.info(`Selected post from ${randomPost.date}`);

    return randomPost;
  } catch (error) {
    logger.error(`Failed to get random post: ${error.message}`);
    throw error;
  }
}

/**
 * Отключает Telegram Client
 * @returns {Promise<void>}
 */
export async function disconnectParser() {
  try {
    if (client && client.connected) {
      await client.disconnect();
      logger.info('✓ Parser disconnected');
    }
  } catch (error) {
    logger.error(`Failed to disconnect parser: ${error.message}`);
  }
}

export default {
  initParser,
  getChannelPosts,
  getRandomPost,
  disconnectParser,
};
