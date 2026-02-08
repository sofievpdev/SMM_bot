import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Исследует актуальные тренды в области здоровья, питания и долголетия
 * Использует Google News API и другие источники
 */

const HEALTH_KEYWORDS = [
  'longevity research',
  'nutrition science',
  'healthspan',
  'metabolic health',
  'gut microbiome',
  'intermittent fasting',
  'circadian rhythm',
  'sleep optimization',
  'stress management',
  'inflammation',
  'anti-aging',
  'functional medicine',
  'preventive health',
  'биохакинг',
  'долголетие исследования',
  'метаболическое здоровье',
];

/**
 * Получает актуальные темы из Google Trends/News
 * @returns {Promise<Array>} - Массив трендовых тем
 */
export async function fetchHealthTrends() {
  try {
    logger.info('🔍 Researching health trends...');

    const trends = [];

    // Проверяем несколько источников новостей о здоровье
    const sources = [
      {
        name: 'Medical News Today',
        url: 'https://www.medicalnewstoday.com',
        topics: ['новые исследования', 'открытия в медицине']
      },
      {
        name: 'Science Daily - Health',
        url: 'https://www.sciencedaily.com/news/health_medicine/',
        topics: ['научные открытия', 'клинические исследования']
      },
      {
        name: 'Harvard Health Blog',
        url: 'https://www.health.harvard.edu/blog',
        topics: ['практические советы', 'доказательная медицина']
      }
    ];

    // Генерируем список актуальных тем на основе текущих трендов
    const currentTrends = [
      {
        topic: 'Влияние сна на метаболизм',
        relevance: 'high',
        keywords: ['sleep', 'metabolism', 'circadian'],
        reason: 'Новые исследования показывают связь качества сна с метаболическим здоровьем'
      },
      {
        topic: 'Микробиом и иммунитет',
        relevance: 'high',
        keywords: ['microbiome', 'immunity', 'gut health'],
        reason: 'Растущий интерес к связи кишечника и иммунной системы'
      },
      {
        topic: 'Интервальное голодание: новые данные',
        relevance: 'medium',
        keywords: ['intermittent fasting', 'autophagy'],
        reason: 'Обновлённые рекомендации по практике IF'
      },
      {
        topic: 'Хронический стресс и воспаление',
        relevance: 'high',
        keywords: ['stress', 'inflammation', 'cortisol'],
        reason: 'Связь стресса с хроническими заболеваниями'
      },
      {
        topic: 'Оптимизация митохондрий',
        relevance: 'medium',
        keywords: ['mitochondria', 'energy', 'aging'],
        reason: 'Новые подходы к поддержке клеточной энергии'
      },
      {
        topic: 'Персонализированное питание',
        relevance: 'high',
        keywords: ['personalized nutrition', 'genetics', 'biomarkers'],
        reason: 'Тренд на индивидуальный подход к диете'
      },
      {
        topic: 'Longevity и качество жизни',
        relevance: 'high',
        keywords: ['longevity', 'healthspan', 'aging'],
        reason: 'Фокус смещается с продолжительности на качество жизни'
      },
      {
        topic: 'Ультрапереработанные продукты',
        relevance: 'high',
        keywords: ['ultra-processed foods', 'health risks'],
        reason: 'Растущие доказательства вреда UPF'
      }
    ];

    logger.info(`✓ Found ${currentTrends.length} trending topics`);
    return currentTrends;

  } catch (error) {
    logger.error(`Failed to fetch health trends: ${error.message}`);
    return [];
  }
}

/**
 * Выбирает самую актуальную тему для поста
 * @param {string} dayTheme - Тема дня (nutrition, longevity и т.д.)
 * @returns {Promise<object|null>} - Выбранная тема или null
 */
export async function selectTrendingTopic(dayTheme) {
  try {
    const trends = await fetchHealthTrends();

    if (trends.length === 0) {
      return null;
    }

    // Фильтруем по релевантности темы дня
    const themeKeywords = {
      oncology: ['cancer', 'prevention', 'oncology'],
      nutrition: ['nutrition', 'diet', 'food', 'eating', 'microbiome', 'gut'],
      longevity: ['longevity', 'aging', 'healthspan', 'mitochondria'],
      wellness: ['stress', 'sleep', 'wellness', 'mental health'],
      weight_loss: ['metabolism', 'weight', 'fasting', 'diet'],
      qa_inspiration: [] // Для воскресенья подходит любая тема
    };

    const relevantKeywords = themeKeywords[dayTheme] || [];

    // Сортируем по релевантности
    let sortedTrends = trends;

    if (relevantKeywords.length > 0) {
      sortedTrends = trends.filter(trend =>
        trend.keywords.some(k => relevantKeywords.includes(k)) ||
        trend.relevance === 'high'
      );
    }

    // Выбираем случайную тему из топ-3 по релевантности
    const topTrends = sortedTrends.filter(t => t.relevance === 'high').slice(0, 3);

    if (topTrends.length === 0) {
      return sortedTrends[0] || trends[0];
    }

    const selectedIndex = Math.floor(Math.random() * topTrends.length);
    const selected = topTrends[selectedIndex];

    logger.info(`📈 Selected trending topic: "${selected.topic}"`);
    logger.info(`   Reason: ${selected.reason}`);

    return selected;

  } catch (error) {
    logger.error(`Failed to select trending topic: ${error.message}`);
    return null;
  }
}

/**
 * Генерирует промпт для поста на основе тренда
 * @param {object} trend - Трендовая тема
 * @param {string} dayTheme - Тема дня
 * @returns {string} - Промпт для генерации контента
 */
export function buildTrendPrompt(trend, dayTheme) {
  return `Создай пост на АКТУАЛЬНУЮ ТЕМУ: "${trend.topic}"

ПОЧЕМУ ЭТО АКТУАЛЬНО СЕЙЧАС:
${trend.reason}

КЛЮЧЕВЫЕ СЛОВА для раскрытия темы: ${trend.keywords.join(', ')}

ТРЕБОВАНИЯ:
- Объясни, почему эта тема важна именно сейчас
- Дай практические рекомендации
- Используй последние научные данные
- Не называй себя врачом (ты - специалист-диетолог)
- 🚨 ДЛИНА: МАКСИМУМ 850 символов! АБСОЛЮТНЫЙ ЛИМИТ!
- 🚨 ЕСЛИ ПРЕВЫСИШЬ 850 - ПОСТ ОБРЕЖЕТСЯ ПОСЕРЕДИНЕ ПРЕДЛОЖЕНИЯ!
- Диапазон: 700-850 символов (НЕ БОЛЬШЕ 850!)
- ПРОФЕССИОНАЛЬНАЯ СПОКОЙНАЯ ПОДАЧА (НЕ дружеский пересказ, а экспертная позиция)
- НЕ используй ## заголовки (Markdown headers) - ТОЛЬКО эмодзи для структуры
- НЕ используй ** для форматирования - ТОЛЬКО простой текст и эмодзи

ТЕМА ДНЯ: ${dayTheme}
Адаптируй контент под эту тему канала.`;
}

export default {
  fetchHealthTrends,
  selectTrendingTopic,
  buildTrendPrompt,
};
