import axios from 'axios';
import { logger } from '../utils/logger.js';

const UNSPLASH_API_BASE = 'https://api.unsplash.com';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

/**
 * Ищет релевантные картинки на Unsplash по ключевым словам
 * @param {string} query - Поисковый запрос (тема картинки)
 * @param {number} limit - Количество результатов (по умолчанию 1)
 * @returns {Promise<object>} - Объект картинки с URL
 */
export async function searchUnsplashImage(query, limit = 1) {
  try {
    if (!UNSPLASH_ACCESS_KEY) {
      logger.warn('⚠️ UNSPLASH_ACCESS_KEY not configured, skipping image search');
      return null;
    }

    logger.info(`🔍 Searching image on Unsplash: "${query}"`);

    const response = await axios.get(`${UNSPLASH_API_BASE}/search/photos`, {
      params: {
        query: query,
        per_page: limit,
        orientation: 'portrait',
        content_filter: 'high',
      },
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const photo = response.data.results[0];
      logger.info(`✓ Image found: ${photo.alt_description}`);

      return {
        url: photo.urls.regular,
        thumb: photo.urls.thumb,
        smallSquare: photo.urls.small,
        description: photo.alt_description,
        photographer: photo.user.name,
        photographerLink: photo.user.links.html,
        unsplashLink: photo.links.html,
      };
    } else {
      logger.warn(`No images found for query: "${query}"`);
      return null;
    }
  } catch (error) {
    logger.error(`Failed to search image on Unsplash: ${error.message}`);
    return null;
  }
}

/**
 * Получает релевантные ключевые слова для поиска картинки по теме дня
 * @param {string} dayTheme - Тема дня (oncology, nutrition, longevity и т.д.)
 * @returns {string} - Ключевое слово для поиска
 */
export function getImageSearchQuery(dayTheme) {
  const queryMap = {
    oncology: 'cancer prevention health medical research',
    nutrition: 'healthy food nutrition fruits vegetables',
    longevity: 'longevity aging research healthy lifestyle',
    wellness: 'wellness meditation yoga health',
    case_study: 'health success transformation fitness',
    weight_loss: 'weight loss fitness exercise health',
    qa_inspiration: 'health inspiration motivation wellness',
  };

  return queryMap[dayTheme] || 'health medical wellness';
}

/**
 * Ищет картинку для поста на основе темы дня
 * @param {string} dayTheme - Тема дня
 * @param {string} postTitle - Заголовок поста (опционально для улучшения поиска)
 * @returns {Promise<object>} - Объект картинки
 */
export async function findImageForPost(dayTheme, postTitle = '') {
  try {
    // ВСЕГДА используем английские ключевые слова для Unsplash
    // (Unsplash API работает только с английским языком)
    const query = getImageSearchQuery(dayTheme);

    logger.info(`📸 Searching image with theme: ${dayTheme} (query: "${query}")`);

    const image = await searchUnsplashImage(query, 1);
    return image;
  } catch (error) {
    logger.error(`Failed to find image for post: ${error.message}`);
    return null;
  }
}

/**
 * Получает лицензионную информацию картинки
 * @param {object} imageData - Объект картинки с информацией
 * @returns {string} - Форматированная строка с атрибуцией
 */
export function getImageAttribution(imageData) {
  if (!imageData) return '';

  return `📸 Photo by ${imageData.photographer} on Unsplash`;
}

export default {
  searchUnsplashImage,
  getImageSearchQuery,
  findImageForPost,
  getImageAttribution,
};
