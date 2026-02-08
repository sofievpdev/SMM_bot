import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../logs');

// Создаем директорию логов если её нет
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Получает путь к файлу логов на текущий день
 */
function getLogFilePath() {
  const today = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `bot-${today}.log`);
}

/**
 * Записывает лог в файл
 */
export function writeLog(message) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    const logFile = getLogFilePath();
    
    fs.appendFileSync(logFile, logEntry);
    
    // Удаляем старые логи (старше 7 дней)
    cleanOldLogs();
  } catch (error) {
    console.error('Error writing log:', error);
  }
}

/**
 * Получает последние N логов
 */
export function getRecentLogs(limit = 100) {
  try {
    const logFile = getLogFilePath();
    
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    return lines.slice(-limit);
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
}

/**
 * Получает логи за конкретный день
 */
export function getLogsByDate(date) {
  try {
    const logFile = path.join(logsDir, `bot-${date}.log`);
    
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const content = fs.readFileSync(logFile, 'utf8');
    return content.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
}

/**
 * Удаляет логи старше 7 дней
 */
function cleanOldLogs() {
  try {
    const files = fs.readdirSync(logsDir);
    const now = new Date();
    
    files.forEach(file => {
      const match = file.match(/bot-(\d{4}-\d{2}-\d{2})\.log/);
      if (match) {
        const logDate = new Date(match[1]);
        const daysDiff = (now - logDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 7) {
          fs.unlinkSync(path.join(logsDir, file));
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning old logs:', error);
  }
}

export default {
  writeLog,
  getRecentLogs,
  getLogsByDate,
};
