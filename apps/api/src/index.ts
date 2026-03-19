import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
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
import { recordingRouter } from './routes/recordings';
import { homeRouter } from './routes/home';

const app = express();
const httpServer = createServer(app);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

app.set('upload', upload);

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
app.use('/api/v1/recordings', recordingRouter);
app.use('/api/v1/home', homeRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, httpServer };
