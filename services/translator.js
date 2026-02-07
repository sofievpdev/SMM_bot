import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const client = new Anthropic({
  apiKey: config.claudeApiKey,
});

/**
 * Определяет язык текста (упрощённое определение)
 * @param {string} text - Текст для анализа
 * @returns {string} - 'en' или 'ru'
 */
export function detectLanguage(text) {
  // Простой способ - считаем кириллицу vs латиницу
  const cyrillicCount = (text.match(/[а-яё]/gi) || []).length;
  const latinCount = (text.match(/[a-z]/gi) || []).length;

  return cyrillicCount > latinCount ? 'ru' : 'en';
}

/**
 * Переводит текст с английского на русский через Claude API
 * Специализирован на медицинских текстах
 * @param {string} englishText - Текст на английском
 * @returns {Promise<string>} - Переведённый текст на русском
 */
export async function translateText(englishText) {
  try {
    // Пропускаем русский текст
    if (detectLanguage(englishText) === 'ru') {
      logger.info('Text is already in Russian, skipping translation');
      return englishText;
    }

    logger.info(`Translating ${englishText.length} characters from English to Russian`);

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Переведи следующий медицинский/диетологический текст с английского на русский.
Требования:
- Сохраняй медицинскую и научную терминологию
- Переводи точно, не упрощай
- Сохраняй чувство оригинального текста
- Если есть цифры и метрики - переведи единицы измерения (cups → чашки, oz → граммы и т.д.)

ОРИГИНАЛЬНЫЙ ТЕКСТ:
${englishText}

ПЕРЕВЕДЁННЫЙ ТЕКСТ:`,
        },
      ],
      system: `Ты - профессиональный медицинский переводчик с английского на русский.
Твоя задача - переводить точно и аккуратно, сохраняя медицинскую терминологию.
Переводи для аудитории русскоговорящих людей, интересующихся здоровьем.
Результат должен быть естественным и профессиональным.`,
    });

    const translatedText = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info(`✓ Translation completed (${translatedText.length} characters)`);
    return translatedText;
  } catch (error) {
    logger.error(`Translation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Переводит всю структуру статьи (title, content, preview)
 * Сохраняет referenceLinks без изменений
 * @param {object} article - Объект статьи
 * @returns {Promise<object>} - Переведённая статья
 */
export async function translateArticle(article) {
  try {
    const language = detectLanguage(article.title);

    if (language === 'ru') {
      logger.info(`Article "${article.title}" is already in Russian`);
      return article;
    }

    logger.info(`Translating article: "${article.title}"`);

    // Переводим заголовок
    const translatedTitle = await translateText(article.title);

    // Переводим preview (если есть)
    let translatedPreview = article.preview || '';
    if (translatedPreview) {
      translatedPreview = await translateText(translatedPreview);
    }

    const translatedArticle = {
      ...article,
      title: translatedTitle,
      preview: translatedPreview,
      originalLanguage: 'en',
      translatedAt: new Date().toISOString(),
      // referenceLinks остаются без изменений
      referenceLinks: article.referenceLinks || [],
    };

    logger.info(`✓ Article translated: "${translatedTitle}"`);
    return translatedArticle;
  } catch (error) {
    logger.error(`Failed to translate article: ${error.message}`);
    // Возвращаем оригинальную статью при ошибке
    return article;
  }
}

/**
 * Переводит массив статей
 * @param {object[]} articles - Массив статей
 * @returns {Promise<object[]>} - Переведённые статьи
 */
export async function translateArticles(articles) {
  try {
    const translated = [];

    for (const article of articles) {
      const translatedArticle = await translateArticle(article);
      translated.push(translatedArticle);

      // Добавляем задержку между запросами (2 секунды)
      if (articles.indexOf(article) < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return translated;
  } catch (error) {
    logger.error(`Failed to translate articles: ${error.message}`);
    return articles; // Возвращаем оригинальные статьи при ошибке
  }
}

/**
 * Переводит контент с сохранением и переводом ссылок на исследования
 * @param {string} content - Контент с ссылками
 * @param {string[]} referenceLinks - Массив ссылок на исследования
 * @returns {Promise<object>} - { translatedContent, referenceLinks }
 */
export async function translateWithReferences(content, referenceLinks = []) {
  try {
    const translatedContent = await translateText(content);

    return {
      translatedContent,
      referenceLinks: referenceLinks || [], // Ссылки остаются без изменений
      translatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to translate with references: ${error.message}`);
    return {
      translatedContent: content,
      referenceLinks: referenceLinks || [],
    };
  }
}

/**
 * Преобразует меры (cups, oz и т.д.) в метрические при переводе
 * @param {string} text - Текст с единицами измерения
 * @returns {string} - Текст с преобразованными мерами
 */
export function convertMeasurements(text) {
  // Простые преобразования для рецептов
  const conversions = {
    'cup': 'чашка (~240 мл)',
    'cups': 'чашки (~240 мл)',
    'tablespoon': 'столовая ложка (~15 мл)',
    'tablespoons': 'столовые ложки (~15 мл)',
    'teaspoon': 'чайная ложка (~5 мл)',
    'teaspoons': 'чайные ложки (~5 мл)',
    'oz': 'г (граммы)',
    'ounce': 'грамм',
    'ounces': 'граммов',
    'lb': 'кг',
    'pound': 'килограмм',
    'pounds': 'килограмма',
  };

  let result = text;
  for (const [en, ru] of Object.entries(conversions)) {
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    result = result.replace(regex, ru);
  }

  return result;
}

export default {
  translateText,
  translateArticle,
  translateArticles,
  translateWithReferences,
  detectLanguage,
  convertMeasurements,
};
