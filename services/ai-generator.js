import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const client = new Anthropic({
  apiKey: config.claudeApiKey,
});

/**
 * Строит полный системный промпт из расширенной конфигурации канала
 * Объединяет все секции: промпт, источники, стили, правила, структуру
 * @param {object} channel - Конфигурация канала с расширенными полями
 * @returns {string} - Полный системный промпт
 */
export function buildFullSystemPrompt(channel) {
  let prompt = channel.systemPrompt + '\n\n';

  // Добавляем источники информации
  if (channel.sources?.inspirationChannels?.length) {
    prompt += 'КАНАЛЫ ДЛЯ ВДОХНОВЕНИЯ:\n';
    prompt += channel.sources.inspirationChannels.map(c => `- ${c}`).join('\n');
    prompt += '\n\n';
  }

  if (channel.sources?.referenceUrls?.length) {
    prompt += 'ССЫЛКИ ДЛЯ СПРАВОК:\n';
    prompt += channel.sources.referenceUrls.map(u => `- ${u}`).join('\n');
    prompt += '\n\n';
  }

  if (channel.sources?.notes) {
    prompt += `ПРИМЕЧАНИЕ О ИСТОЧНИКАХ:\n${channel.sources.notes}\n\n`;
  }

  // Добавляем темы контента
  if (channel.contentStyle?.topics?.length) {
    prompt += 'ТЕМЫ ДЛЯ ПОСТОВ:\n';
    prompt += channel.contentStyle.topics.map(t => `- ${t}`).join('\n');
    prompt += '\n\n';
  }

  // Добавляем форматы контента
  if (channel.contentStyle?.formats?.length) {
    prompt += 'ФОРМАТЫ КОНТЕНТА:\n';
    prompt += channel.contentStyle.formats.map(f => `- ${f}`).join('\n');
    prompt += '\n\n';
  }

  // Добавляем параметры стиля
  if (channel.contentStyle?.writingGuidelines) {
    const wg = channel.contentStyle.writingGuidelines;
    prompt += 'ПАРАМЕТРЫ СТИЛЯ:\n';
    prompt += `- Тон: ${wg.tone}\n`;
    prompt += `- Длина: ${wg.length.min}-${wg.length.max} символов\n`;
    if (wg.useEmoji) prompt += '- Использовать эмодзи: да\n';
    if (wg.includeCTA) prompt += '- Добавлять CTA: да\n';
    prompt += '\n';
  }

  // Добавляем правила написания
  if (channel.contentRules?.doWrite?.length) {
    prompt += 'ЧТО ПИСАТЬ:\n';
    prompt += channel.contentRules.doWrite.map(r => `✅ ${r}`).join('\n');
    prompt += '\n\n';
  }

  if (channel.contentRules?.dontWrite?.length) {
    prompt += 'ЧЕГО ИЗБЕГАТЬ:\n';
    prompt += channel.contentRules.dontWrite.map(r => `❌ ${r}`).join('\n');
    prompt += '\n\n';
  }

  // Добавляем структуру поста
  if (channel.postStructure?.length) {
    prompt += 'СТРУКТУРА ПОСТА:\n';
    prompt += channel.postStructure.map((s, i) => `${i + 1}. ${s}`).join('\n');
    prompt += '\n\n';
  }

  // Добавляем правила профессионализма
  if (channel.contentStyle?.writingGuidelines?.professionalism) {
    prompt += 'ПРАВИЛА ПРОФЕССИОНАЛЬНОГО ПИСЬМА:\n';
    prompt += '✅ Используй правильные медицинские и диетологические термины\n';
    prompt += '✅ Объясняй доступно, но НЕ упрощай до неправды\n';
    prompt += '✅ Пиши как опытный специалист (диетолог/врач), а не как обычный человек\n';
    prompt += '✅ Сохраняй профессиональный уровень и "вкус"\n';
    prompt += '✅ Баланс: доказательная медицина + функциональная/превентивная медицина\n';
    prompt += '✅ Статьи должны быть полноценные (900-1200 символов), не короткие тизеры\n';
    prompt += '✅ Включай ссылки на исследования, если упоминаешь их\n\n';
    prompt += '❌ Избегай сленга и дружеского тона ("дружбан")\n';
    prompt += '❌ Не пиши как простой обыватель\n';
    prompt += '❌ Не упрощай медицинские термины до потери смысла\n';
    prompt += '❌ Не создавай короткие тизеры\n';
  }

  return prompt;
}

/**
 * Генерирует контент через Claude AI
 * @param {string} sourceText - Исходный текст для трансформации
 * @param {string|object} systemPromptOrChannel - System prompt строка или объект канала
 * @returns {Promise<string>} - Сгенерированный контент
 */
export async function generateContent(sourceText, systemPromptOrChannel) {
  try {
    const isChannel = typeof systemPromptOrChannel === 'object';
    const systemPrompt = isChannel
      ? buildFullSystemPrompt(systemPromptOrChannel)
      : systemPromptOrChannel;

    logger.info(`Generating content with system prompt: ${systemPrompt.substring(0, 50)}...`);

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Трансформируй этот контент:\n\n${sourceText}`,
        },
      ],
      system: systemPrompt,
    });

    const generatedText = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info('✓ Content generated successfully');
    return generatedText;
  } catch (error) {
    logger.error(`Failed to generate content: ${error.message}`);
    throw error;
  }
}

/**
 * Генерирует контент на основе идеи (без исходного текста)
 * @param {string} idea - Идея для контента
 * @param {string|object} systemPromptOrChannel - System prompt строка или объект канала
 * @returns {Promise<string>} - Сгенерированный контент
 */
export async function generateFromIdea(idea, systemPromptOrChannel) {
  try {
    const isChannel = typeof systemPromptOrChannel === 'object';
    const systemPrompt = isChannel
      ? buildFullSystemPrompt(systemPromptOrChannel)
      : systemPromptOrChannel;

    logger.info(`Generating content from idea: ${idea.substring(0, 50)}...`);

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Создай Telegram пост на основе этой идеи:\n\n${idea}`,
        },
      ],
      system: systemPrompt,
    });

    const generatedText = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info('✓ Content generated from idea successfully');
    return generatedText;
  } catch (error) {
    logger.error(`Failed to generate content from idea: ${error.message}`);
    throw error;
  }
}

/**
 * Генерирует Telegram пост на основе парсенной веб-статьи
 * @param {object} article - Объект статьи (title, content, preview, referenceLinks, source)
 * @param {object} channel - Объект канала с конфигурацией
 * @param {string} dayTheme - Тема дня (oncology, nutrition, longevity, wellness, case_study, weight_loss, qa_inspiration)
 * @returns {Promise<string>} - Сгенерированный пост (900-1200 символов)
 */
export async function generateFromWebContent(article, channel, dayTheme) {
  try {
    // Строим систем-промпт с профессиональными правилами
    let systemPrompt = buildFullSystemPrompt(channel);

    // Добавляем специализированные инструкции для каждой темы дня
    systemPrompt += '\n\nСПЕЦИАЛЬНЫЕ ИНСТРУКЦИИ ДЛЯ ТЕМЫ:\n';

    switch (dayTheme) {
      case 'oncology':
        systemPrompt += `Тема: ОНКОЛОГИЯ
- Деликатная, уважительная подача
- Фокус на профилактику, поддержку, надежду
- БЕЗ продажи услуг или программ
- CTA: только предложить обсудить в комментариях или задать вопросы
- Используй научные данные и исследования
- Сохраняй профессиональный и сочувственный тон`;
        break;

      case 'nutrition':
        systemPrompt += `Тема: ПИТАНИЕ И РАЗВЕНЧАНИЕ МИФОВ
- Баланс: доказательная медицина + функциональная/превентивная медицина
- Развенчивай распространённые мифы с научной базой
- Holistic подход, но с доказательством
- CTA: предложи попробовать совет, задай вопрос в комментариях
- Включай практические советы и примеры`;
        break;

      case 'longevity':
        systemPrompt += `Тема: ДОЛГОЛЕТИЕ И БИОХАКИНГ
- Cutting-edge исследования о долголетии
- Персонализированная медицина и science-based биохакинг
- Фокус на доказанные методы и исследования
- CTA: пригласи читателей узнать больше, задать вопросы
- Упор на качество жизни, а не просто длительность`;
        break;

      case 'wellness':
        systemPrompt += `Тема: WELLNESS И ГЛОБАЛЬНЫЕ ТРЕНДЫ
- Глобальные тренды здорового образа жизни
- Интеграция разных подходов: восточные и западные практики
- Фокус на целостный подход к здоровью
- CTA: поделитесь своим опытом, обсудим в комментариях`;
        break;

      case 'case_study':
        systemPrompt += `Тема: КЕЙС ПАЦИЕНТА (МОНЕТИЗАЦИЯ)
⚠️ ОЧЕНЬ ВАЖНО - СТРУКТУРА МОНЕТИЗАЦИИ:
1. Захватывающий кейс и результаты
2. Основные шаги решения проблемы
3. Практические выводы
4. CTA - ТРЁХУРОВНЕВОЕ ПРЕДЛОЖЕНИЕ:
   - Уровень 1: Базовая консультация (дешевле, для всех)
   - Уровень 2: 4-недельная поддержка (средняя цена, для более серьёзных)
   - Уровень 3: "Health as a Project" (ПРЕМИУМ, эксклюзиво, только для избранных, дорого)
   Подчеркни: "Health as a Project - это премиальная программа для тех, кто готов инвестировать в своё здоровье"
5. Сильный призыв записаться или узнать подробности`;
        break;

      case 'weight_loss':
        systemPrompt += `Тема: СНИЖЕНИЕ ВЕСА И ЗДОРОВОЕ ПОХУДЕНИЕ
- Научный подход к снижению веса
- Баланс: калории + метаболизм + психология + питание
- Не пугай диетами, предложи здоровый образ жизни
- CTA: предложи пошаговый план, вопросы в комментариях`;
        break;

      case 'qa_inspiration':
        systemPrompt += `Тема: Q&A / ВДОХНОВЕНИЕ / ЕЖЕНЕДЕЛЬНЫЙ ОБЗОР
- Ответь на частые вопросы или дай еженедельный обзор трендов
- Вдохновляй и мотивируй аудиторию
- Укрепляй доверие и авторитет
- CTA: что попробовать на этой неделе, ваши вопросы приветствуются`;
        break;
    }

    // Добавляем информацию об исходной статье
    systemPrompt += `\n\nИСХОДНАЯ СТАТЬЯ:
Источник: ${article.source || article.sourceUrl}
Заголовок: ${article.title}`;

    if (article.referenceLinks && article.referenceLinks.length > 0) {
      systemPrompt += `\nСсылки на исследования (СОХРАНИТЬ В ПОСТЕ):
${article.referenceLinks.map((link, i) => `${i + 1}. ${link}`).join('\n')}`;
    }

    logger.info(`Generating post for theme: ${dayTheme} from article: "${article.title}"`);

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1500,  // Для полноценных статей 900-1200 символов
      messages: [
        {
          role: 'user',
          content: `На основе следующей статьи создай полноценный авторский Telegram пост для канала о здоровье и медицине.

Требования:
- Длина: 900-1200 символов (время чтения ~1 минута)
- Это должна быть полноценная статья, а не тизер
- Используй информацию из статьи, но переформатируй её в авторский контент
- Включи ссылки на исследования (если они есть)
- Тон: профессиональный, как от опытного специалиста
- Избегай сленга
- Добавь уместный CTA для темы

СТАТЬЯ:
${article.preview || article.content || 'Нет доступного текста'}`,
        },
      ],
      system: systemPrompt,
    });

    const generatedText = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info(`✓ Post generated (${generatedText.length} characters) for theme: ${dayTheme}`);

    return generatedText;
  } catch (error) {
    logger.error(`Failed to generate content from web article: ${error.message}`);
    throw error;
  }
}

export default {
  generateContent,
  generateFromIdea,
  generateFromWebContent,
  buildFullSystemPrompt,
};
