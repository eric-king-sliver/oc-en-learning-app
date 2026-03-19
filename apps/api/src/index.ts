import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { swaggerUi } from './utils/swagger';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/users';
import { scenarioRouter } from './routes/scenarios';
import { sessionRouter } from './routes/sessions';
import { progressRouter } from './routes/progress';
import { vocabularyRouter } from './routes/vocabulary';
import { characterRouter } from './routes/characters';

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/scenarios', scenarioRouter);
app.use('/api/v1/sessions', sessionRouter);
app.use('/api/v1/progress', progressRouter);
app.use('/api/v1/vocabulary', vocabularyRouter);
app.use('/api/v1/characters', characterRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, httpServer };
