// backend/src/shared/utils/logger.ts
const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  info: (message: string, meta?: object) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  error: (message: string, meta?: object) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  warn: (message: string, meta?: object) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  debug: (message: string, meta?: object) => {
    if (!isProd) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  },
};