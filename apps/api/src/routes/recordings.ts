import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { uploadRecording, getPublicUrl } from '../services/storage';
import { analyzeSpeech } from '../services/speechAnalysis';

const router = Router();
const prisma = new PrismaClient();

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

const uploadRecordingSchema = z.object({
  sessionId: z.string().uuid().optional(),
  turnId: z.string().uuid(),
  transcript: z.string().optional(),
  expectedText: z.string().optional(),
});

const listRecordingsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  scenarioId: z.string().uuid().optional(),
});

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

router.use(authenticate);

router.post('/', upload.single('audio'), async (req: AuthRequest, res, next) => {
  try {
    const data = uploadRecordingSchema.parse(req.body);

    if (!req.file) {
      throw new AppError('Audio file is required', 400);
    }

    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype || 'audio/m4a';

    const audioKey = await uploadRecording(req.userId!, audioBuffer, mimeType);
    const audioUrl = getPublicUrl(audioKey);

    let score: number | null = null;
    let analysisResult: { score: number; feedback: string[]; problemWords: string[] } | null = null;

    if (data.expectedText && data.transcript) {
      analysisResult = analyzeSpeech(data.expectedText, data.transcript);
      score = analysisResult.score;
    }

    const recording = await prisma.voiceRecording.create({
      data: {
        userId: req.userId!,
        sessionId: data.sessionId,
        turnId: data.turnId,
        audioUrl,
        durationMs: 0,
        score,
        transcript: data.transcript,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        id: recording.id,
        audioUrl: recording.audioUrl,
        durationMs: recording.durationMs,
        score: recording.score,
        transcript: recording.transcript,
        analysis: analysisResult
          ? {
              score: analysisResult.score,
              feedback: analysisResult.feedback,
              problemWords: analysisResult.problemWords,
            }
          : null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page, limit, scenarioId } = listRecordingsSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: any = { userId: req.userId };
    if (scenarioId) {
      where.session = { scenarioId };
    }

    const [recordings, total] = await Promise.all([
      prisma.voiceRecording.findMany({
        where,
        include: {
          session: {
            include: {
              scenario: {
                select: { id: true, title: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.voiceRecording.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        recordings: recordings.map((r) => ({
          id: r.id,
          audioUrl: r.audioUrl,
          durationMs: r.durationMs,
          score: r.score,
          transcript: r.transcript,
          scenario: r.session?.scenario,
          createdAt: r.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const recording = await prisma.voiceRecording.findUnique({
      where: { id: req.params.id },
      include: {
        session: {
          include: {
            scenario: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    if (!recording || recording.userId !== req.userId) {
      throw new AppError('Recording not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        id: recording.id,
        audioUrl: recording.audioUrl,
        durationMs: recording.durationMs,
        score: recording.score,
        transcript: recording.transcript,
        scenario: recording.session?.scenario,
        createdAt: recording.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const recording = await prisma.voiceRecording.findUnique({
      where: { id: req.params.id },
    });

    if (!recording || recording.userId !== req.userId) {
      throw new AppError('Recording not found', 404);
    }

    await prisma.voiceRecording.delete({
      where: { id: req.params.id },
    });

    res.json({
      status: 'success',
      message: 'Recording deleted',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/analyze', async (req: AuthRequest, res, next) => {
  try {
    const { expectedText, transcript } = req.body;

    if (!expectedText || !transcript) {
      throw new AppError('expectedText and transcript are required', 400);
    }

    const result = analyzeSpeech(expectedText, transcript);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export { router as recordingRouter };
