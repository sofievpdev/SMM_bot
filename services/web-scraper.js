import axios from 'axios';
import * as cheerio from 'cheerio';
import { config, channels } from '../config/config.js';
import { logger } from '../utils/logger.js';

const client = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// Добавляем задержку между запросами для соблюдения rate limiting
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Извлекает ссылки на исследования/источники из HTML контента
 * @param {string} html - HTML контент
 * @returns {string[]} - Массив ссылок
 */
export function extractReferenceLinks(html) {
  const $ = cheerio.load(html);
  const links = [];

  // Ищем научные ссылки (pubmed, doi, research, study и т.д.)
  $('a[href*="pubmed"], a[href*="doi"], a[href*="ncbi"], a[href*="scholar"]').each((i, el) => {
    const url = $(el).attr('href');
    if (url && url.startsWith('http')) {
      links.push(url);
    }
  });

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Парсит peterattiamd.com
 */
async function scrapePeterAttia() {
  try {
    logger.info('Scraping peterattiamd.com');
    const response = await client.get('https://peterattiamd.com');
    const $ = cheerio.load(response.data);

    const articles = [];

    // Ищем статьи в основном контенте
    $('article, .post, [data-test="article"]').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('.content, p').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://peterattiamd.com${link}`,
          sourceUrl: 'https://peterattiamd.com',
          source: 'peterattiamd.com',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape peterattiamd.com: ${error.message}`);
    return [];
  }
}

/**
 * Парсит longevity.technology
 */
async function scrapeLongevityTech() {
  try {
    logger.info('Scraping longevity.technology');
    const response = await client.get('https://longevity.technology');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .article-card, .post').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .headline').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('p').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://longevity.technology${link}`,
          sourceUrl: 'https://longevity.technology',
          source: 'longevity.technology',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape longevity.technology: ${error.message}`);
    return [];
  }
}

/**
 * Парсит health.harvard.edu
 */
async function scrapeHarvardHealth() {
  try {
    logger.info('Scraping health.harvard.edu');
    const response = await client.get('https://www.health.harvard.edu');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .article, .story-card').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .headline').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('p').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://www.health.harvard.edu${link}`,
          sourceUrl: 'https://www.health.harvard.edu',
          source: 'health.harvard.edu',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape health.harvard.edu: ${error.message}`);
    return [];
  }
}

/**
 * Парсит nia.nih.gov
 */
async function scrapeNIA() {
  try {
    logger.info('Scraping nia.nih.gov');
    const response = await client.get('https://www.nia.nih.gov');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .news-item, .story').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('p').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://www.nia.nih.gov${link}`,
          sourceUrl: 'https://www.nia.nih.gov',
          source: 'nia.nih.gov',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape nia.nih.gov: ${error.message}`);
    return [];
  }
}

/**
 * Парсит oncodaily.com
 */
async function scrapeOncoDaily() {
  try {
    logger.info('Scraping oncodaily.com');
    const response = await client.get('https://oncodaily.com');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .post, .news-card').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('p').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://oncodaily.com${link}`,
          sourceUrl: 'https://oncodaily.com',
          source: 'oncodaily.com',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape oncodaily.com: ${error.message}`);
    return [];
  }
}

/**
 * Парсит frontiersin.org
 */
async function scrapeFrontiers() {
  try {
    logger.info('Scraping frontiersin.org');
    const response = await client.get('https://www.frontiersin.org/journals/aging/articles');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .article-item, [data-article]').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .title, a').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('p, .abstract').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://www.frontiersin.org${link}`,
          sourceUrl: 'https://www.frontiersin.org/journals/aging',
          source: 'frontiersin.org',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape frontiersin.org: ${error.message}`);
    return [];
  }
}

/**
 * Парсит ncbi.nlm.nih.gov/pubmed
 */
async function scrapePubMed() {
  try {
    logger.info('Scraping ncbi.nlm.nih.gov/pubmed');
    const response = await client.get('https://pubmed.ncbi.nlm.nih.gov/?term=longevity&sort=date');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .docsum-content, div[data-article-id]').slice(0, 2).each((i, el) => {
      const title = $(el).find('a[data-article-id], .docsum-title').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('p, .docsum-snippet').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://pubmed.ncbi.nlm.nih.gov${link}`,
          sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov',
          source: 'ncbi.nlm.nih.gov',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape ncbi.nlm.nih.gov: ${error.message}`);
    return [];
  }
}

/**
 * Парсит globalwellnessinstitute.org
 */
async function scrapeGlobalWellness() {
  try {
    logger.info('Scraping globalwellnessinstitute.org');
    const response = await client.get('https://globalwellnessinstitute.org');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .post, .resource, .blog-item').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .title').first().text().trim();
      const link = $(el).find('a').attr('href');
      const content = $(el).find('p').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://globalwellnessinstitute.org${link}`,
          sourceUrl: 'https://globalwellnessinstitute.org',
          source: 'globalwellnessinstitute.org',
          date: new Date().toISOString(),
          preview: content
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape globalwellnessinstitute.org: ${error.message}`);
    return [];
  }
}

/**
 * Парсит food.ru - рецепты с КБЖУ
 */
async function scrapeFoodRu() {
  try {
    logger.info('Scraping food.ru');
    const response = await client.get('https://www.food.ru/recipes');
    const $ = cheerio.load(response.data);

    const articles = [];

    $('article, .recipe-card, [data-recipe]').slice(0, 2).each((i, el) => {
      const title = $(el).find('h2, h3, .recipe-name').first().text().trim();
      const link = $(el).find('a').attr('href');
      const kbju = $(el).find('.kbju, [data-kbju]').text().trim();
      const content = $(el).find('p, .description').text().trim().slice(0, 500);

      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `https://www.food.ru${link}`,
          sourceUrl: 'https://www.food.ru',
          source: 'food.ru',
          date: new Date().toISOString(),
          preview: content,
          kbju,
          isRecipe: true
        });
      }
    });

    return articles;
  } catch (error) {
    logger.error(`Failed to scrape food.ru: ${error.message}`);
    return [];
  }
}

/**
 * Получает полный контент статьи с указанного URL
 * @param {string} url - URL статьи
 * @returns {Promise<string>} - Полный контент статьи
 */
export async function fetchArticleContent(url) {
  try {
    const response = await client.get(url);
    const $ = cheerio.load(response.data);

    // Удаляем ненужные элементы
    $('script, style, nav, footer, .sidebar, [role="complementary"]').remove();

    // Ищем основной контент
    const content = $('article, .article-content, .post-content, main, [role="main"]')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    return content || 'Unable to extract content';
  } catch (error) {
    logger.error(`Failed to fetch article content from ${url}: ${error.message}`);
    return '';
  }
}

/**
 * Парсит статьи для определённого дня недели на основе weeklyPlan
 * @param {string} dayOfWeek - День недели (monday, tuesday и т.д.)
 * @returns {Promise<object[]>} - Массив статей
 */
export async function scrapeDailyContent(dayOfWeek) {
  try {
    const dayPlan = config.weeklyPlan[dayOfWeek];
    if (!dayPlan) {
      logger.warn(`No plan found for day: ${dayOfWeek}`);
      return [];
    }

    logger.info(`Scraping content for ${dayOfWeek} (theme: ${dayPlan.theme})`);

    const articles = [];

    // Маршрутизация по дням и темам
    if (dayOfWeek === 'monday') {
      // Онкология
      articles.push(...(await scrapeOncoDaily()));
      articles.push(...(await scrapePubMed()));
    } else if (dayOfWeek === 'tuesday') {
      // Питание
      articles.push(...(await scrapeHarvardHealth()));
      articles.push(...(await scrapePeterAttia()));
      articles.push(...(await scrapeFoodRu()));
    } else if (dayOfWeek === 'wednesday') {
      // Долголетие
      articles.push(...(await scrapePeterAttia()));
      articles.push(...(await scrapeLongevityTech()));
      articles.push(...(await scrapeNIA()));
    } else if (dayOfWeek === 'thursday') {
      // Wellness
      articles.push(...(await scrapeGlobalWellness()));
      articles.push(...(await scrapePeterAttia()));
    } else if (dayOfWeek === 'saturday') {
      // Снижение веса
      articles.push(...(await scrapePeterAttia()));
      articles.push(...(await scrapeHarvardHealth()));
      articles.push(...(await scrapeFoodRu()));
    } else {
      // Friday, Sunday - используем генерированный контент, не парсим
      return [];
    }

    // Берём максимум 2 статьи для дневной публикации
    return articles.slice(0, 2);
  } catch (error) {
    logger.error(`Error in scrapeDailyContent: ${error.message}`);
    return [];
  }
}

/**
 * Парсит одну статью с URL
 * @param {string} url - URL статьи
 * @returns {Promise<object>} - Объект со статьёй
 */
export async function scrapeArticle(url) {
  try {
    const response = await client.get(url);
    const $ = cheerio.load(response.data);

    const title = $('h1, .title, [data-title]').first().text().trim();
    const content = $('article, .content, .post-content, main')
      .html() || response.data;

    const referenceLinks = extractReferenceLinks(content);

    return {
      title,
      url,
      content,
      referenceLinks,
      date: new Date().toISOString(),
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Failed to scrape article: ${error.message}`);
    return null;
  }
}

export default {
  scrapeDailyContent,
  scrapeArticle,
  fetchArticleContent,
  extractReferenceLinks,
  // Специализированные функции
  scrapePeterAttia,
  scrapeLongevityTech,
  scrapeHarvardHealth,
  scrapeNIA,
  scrapeOncoDaily,
  scrapeFrontiers,
  scrapePubMed,
  scrapeGlobalWellness,
  scrapeFoodRu,
};
