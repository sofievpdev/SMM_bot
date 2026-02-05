import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const client = new Anthropic({
  apiKey: config.claudeApiKey,
});

/**
 * Генерирует контент через Claude AI
 * @param {string} sourceText - Исходный текст для трансформации
 * @param {string} systemPrompt - System prompt для направления AI
 * @returns {Promise<string>} - Сгенерированный контент
 */
export async function generateContent(sourceText, systemPrompt) {
  try {
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
 * @param {string} systemPrompt - System prompt
 * @returns {Promise<string>} - Сгенерированный контент
 */
export async function generateFromIdea(idea, systemPrompt) {
  try {
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
};
