import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY,
  coingeckoBaseUrl: process.env.COINGECKO_BASE_URL,
  exchangeBaseUrl: process.env.EXCHANGE_BASE_URL,
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'qwen/qwen3-32b',
  groqChatModel: process.env.GROQ_CHAT_MODEL || 'groq/compound-mini',
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

