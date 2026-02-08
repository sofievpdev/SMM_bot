import { findImageForPost, getImageSearchQuery } from './services/image-search.js';
import { logger } from './utils/logger.js';

logger.info('🧪 TESTING IMAGE SEARCH PIPELINE\n');

const themes = ['oncology', 'nutrition', 'longevity', 'wellness', 'case_study', 'weight_loss', 'qa_inspiration'];

logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
logger.info('1️⃣ Testing theme → query mapping:');
logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

themes.forEach(theme => {
  const query = getImageSearchQuery(theme);
  logger.info(`${theme.toUpperCase()}: "${query}"`);
});

logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
logger.info('2️⃣ Testing Unsplash image search:');
logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

(async () => {
  for (const theme of themes) {
    try {
      logger.info(`🔍 Searching for ${theme}...`);
      const image = await findImageForPost(theme);

      if (image) {
        logger.success(`✓ Found: ${image.description}`);
        logger.info(`  📸 URL: ${image.url.substring(0, 80)}...`);
        logger.info(`  👤 Photo by: ${image.photographer}\n`);
      } else {
        logger.warn(`⚠️ No image found for ${theme}\n`);
      }
    } catch (error) {
      logger.error(`❌ Error searching for ${theme}: ${error.message}\n`);
    }
  }

  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.success('✓ TEST COMPLETED');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
})();
