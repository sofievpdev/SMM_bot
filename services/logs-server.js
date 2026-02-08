import express from 'express';
import { getRecentLogs, getLogsByDate } from '../utils/file-logger.js';
import { logger } from '../utils/logger.js';

const app = express();

/**
 * GET /api/logs - Получить последние 200 логов
 */
app.get('/api/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const logs = getRecentLogs(limit);
    
    res.json({
      status: 'success',
      count: logs.length,
      logs: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/:date - Получить логи за конкретный день (YYYY-MM-DD)
 */
app.get('/api/logs/:date', (req, res) => {
  try {
    const { date } = req.params;
    const logs = getLogsByDate(date);
    
    res.json({
      status: 'success',
      date: date,
      count: logs.length,
      logs: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/logs/errors - Получить только ошибки
 */
app.get('/api/logs/errors', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = getRecentLogs(1000);
    const errors = logs.filter(log => log.includes('[ERROR]')).slice(-limit);
    
    res.json({
      status: 'success',
      count: errors.length,
      logs: errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Запускает веб-сервер для логов
 */
export function startLogsServer(port = 3000) {
  app.listen(port, () => {
    logger.info(`📊 Logs server started on port ${port}`);
    logger.info(`   📈 View logs: http://localhost:${port}/api/logs`);
    logger.info(`   ❌ View errors: http://localhost:${port}/api/logs/errors`);
  });
}

export default {
  startLogsServer,
  app
};
