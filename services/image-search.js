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
    case_study: 'doctor patient health consultation medical professional',
    weight_loss: 'weight loss fitness exercise health',
    qa_inspiration: 'health inspiration motivation wellness',
  };

  return queryMap[dayTheme] || 'health medical wellness';
}

/**
 * Извлекает ключевые слова из текста поста для поиска картинки
 * @param {string} postText - Текст поста на русском
 * @returns {string} - Английские ключевые слова для поиска
 */
export function extractKeywordsFromPost(postText) {
  // Словарь для перевода ключевых слов RU → EN
  const keywordTranslations = {
    // Питание
    'овсянка': 'oatmeal',
    'овсяная каша': 'oatmeal breakfast',
    'рецепт': 'healthy food recipe',
    'завтрак': 'breakfast healthy',
    'ягоды': 'berries',
    'орехи': 'nuts',
    'питание': 'nutrition healthy food',
    'диета': 'healthy diet food',
    'еда': 'healthy food',
    'продукты': 'healthy food',
    'овощи': 'vegetables',
    'фрукты': 'fruits',

    // Здоровье и медицина
    'здоровье': 'health wellness',
    'долголетие': 'longevity aging health',
    'сон': 'sleep rest wellness',
    'стресс': 'stress management wellness',
    'воспаление': 'inflammation health',
    'иммунитет': 'immunity health',
    'микробиом': 'gut health microbiome',
    'метаболизм': 'metabolism health',
    'энергия': 'energy fitness health',
    'профилактика': 'prevention health medical',
    'исследование': 'research medical science',
    'онкология': 'cancer prevention health',

    // Фитнес
    'похудение': 'weight loss fitness',
    'фитнес': 'fitness exercise',
    'тренировка': 'workout exercise fitness',
    'упражнения': 'exercise fitness',
    'йога': 'yoga wellness',
    'медитация': 'meditation mindfulness',

    // Wellness
    'биохакинг': 'biohacking health optimization',
    'самочувствие': 'wellness health',
    'мотивация': 'motivation inspiration wellness',
  };

  const postLower = postText.toLowerCase();

  // Ищем первое совпадение ключевого слова
  for (const [ruWord, enTranslation] of Object.entries(keywordTranslations)) {
    if (postLower.includes(ruWord)) {
      logger.info(`🔑 Found keyword: "${ruWord}" → "${enTranslation}"`);
      return enTranslation;
    }
  }

  // Если не нашли ничего специфичного, используем общие слова
  return 'health wellness lifestyle';
}

/**
 * Ищет картинку для поста на основе содержания текста
 * @param {string} dayTheme - Тема дня (резервный вариант)
 * @param {string} postText - Текст поста для извлечения ключевых слов
 * @returns {Promise<object>} - Объект картинки
 */
export async function findImageForPost(dayTheme, postText = '') {
  try {
    let query;

    // Если есть текст поста - извлекаем из него ключевые слова
    if (postText && postText.length > 50) {
      query = extractKeywordsFromPost(postText);
      logger.info(`📸 Using keywords from post content: "${query}"`);
    } else {
      // Fallback: используем тему дня
      query = getImageSearchQuery(dayTheme);
      logger.info(`📸 Using day theme: ${dayTheme} (query: "${query}")`);
    }

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
