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

export default {
  generateContent,
  generateFromIdea,
  buildFullSystemPrompt,
};
