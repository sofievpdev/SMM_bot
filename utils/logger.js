import { config } from '../config/config.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('ru-RU', { hour12: false });
}

export const logger = {
  info: (msg) => {
    console.log(`${colors.cyan}[${formatTime()}]${colors.reset} ℹ️  ${msg}`);
  },

  success: (msg) => {
    console.log(`${colors.green}[${formatTime()}]${colors.reset} ✅ ${msg}`);
  },

  warn: (msg) => {
    console.log(`${colors.yellow}[${formatTime()}]${colors.reset} ⚠️  ${msg}`);
  },

  error: (msg) => {
    console.error(`${colors.red}[${formatTime()}]${colors.reset} ❌ ${msg}`);
  },

  debug: (msg) => {
    if (config.isDev) {
      console.log(`${colors.blue}[${formatTime()}]${colors.reset} 🐛 ${msg}`);
    }
  },
};

export default logger;
