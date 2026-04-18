import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY,
  coingeckoBaseUrl: process.env.COINGECKO_BASE_URL,
  exchangeBaseUrl: process.env.EXCHANGE_BASE_URL,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
  cacheTtlSeconds: 10,
  maxRequestRetries: 3,
  postgresUrl: process.env.POSTGRES_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpirationTime: process.env.JWT_EXPIRATION_TIME,
  jwtRefreshExpirationTime: process.env.JWT_REFRESH_EXPIRATION_TIME,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
} as const;

