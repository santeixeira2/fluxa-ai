import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'https://kuant.com.br',
  'https://www.kuant.com.br',
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(loggerMiddleware);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api', routes);

app.use(errorHandler);
export default app;