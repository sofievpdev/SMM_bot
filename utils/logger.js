import { config } from '../config/config.js';
import { writeLog } from './file-logger.js';

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

function stripColors(msg) {
  return msg.replace(/\x1b\[[0-9;]*m/g, '');
}

export const logger = {
  info: (msg) => {
    const formatted = `${colors.cyan}[${formatTime()}]${colors.reset} ℹ️  ${msg}`;
    console.log(formatted);
    writeLog(`[INFO] ${msg}`);
  },

  success: (msg) => {
    const formatted = `${colors.green}[${formatTime()}]${colors.reset} ✅ ${msg}`;
    console.log(formatted);
    writeLog(`[SUCCESS] ${msg}`);
  },

  warn: (msg) => {
    const formatted = `${colors.yellow}[${formatTime()}]${colors.reset} ⚠️  ${msg}`;
    console.log(formatted);
    writeLog(`[WARN] ${msg}`);
  },

  error: (msg) => {
    const formatted = `${colors.red}[${formatTime()}]${colors.reset} ❌ ${msg}`;
    console.error(formatted);
    writeLog(`[ERROR] ${msg}`);
  },

  debug: (msg) => {
    if (config.isDev) {
      const formatted = `${colors.blue}[${formatTime()}]${colors.reset} 🐛 ${msg}`;
      console.log(formatted);
      writeLog(`[DEBUG] ${msg}`);
    }
  },
};

export default logger;
