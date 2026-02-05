import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

/**
 * Инициализирует parser (заглушка)
 * Примечание: Для полного парсинга нужны user credentials
 * Текущая реализация использует mock данные
 */
export async function initParser() {
  try {
    logger.info('Initializing Telegram Parser...');
    logger.info('✓ Parser initialized (using mock mode)');
    logger.info('Note: For real parsing from channels, install Telethon (Python) client');
    return true;
  } catch (error) {
    logger.error(`Failed to initialize parser: ${error.message}`);
    throw error;
  }
}

/**
 * Получает последние посты из канала (mock)
 * @param {string} channelUsername - Username канала (например: @med_skill_com)
 * @param {number} limit - Количество постов для получения
 * @returns {Promise<object[]>} - Массив постов
 */
export async function getChannelPosts(channelUsername, limit = 5) {
  try {
    logger.info(`Fetching ${limit} posts from ${channelUsername}...`);

    // Mock данные для демонстрации
    const mockPosts = [
      {
        id: 1,
        text: 'Новое исследование показывает эффективность профилактики',
        date: new Date(),
        views: 2300,
        reactions: 45,
      },
      {
        id: 2,
        text: 'Здоровье начинается с правильного питания',
        date: new Date(),
        views: 1800,
        reactions: 32,
      },
      {
        id: 3,
        text: 'Медитация помогает укрепить психическое здоровье',
        date: new Date(),
        views: 2100,
        reactions: 51,
      },
    ];

    logger.info(`✓ Fetched ${mockPosts.slice(0, limit).length} mock posts from ${channelUsername}`);
    return mockPosts.slice(0, limit);
  } catch (error) {
    logger.error(`Failed to fetch posts from ${channelUsername}: ${error.message}`);
    return [];
  }
}

/**
 * Получает случайный пост для обработки
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
    logger.info(`Selected mock post`);

    return randomPost;
  } catch (error) {
    logger.error(`Failed to get random post: ${error.message}`);
    return null;
  }
}

/**
 * Отключает parser (заглушка)
 * @returns {Promise<void>}
 */
export async function disconnectParser() {
  logger.info('✓ Parser disconnected');
}

export default {
  initParser,
  getChannelPosts,
  getRandomPost,
  disconnectParser,
};
