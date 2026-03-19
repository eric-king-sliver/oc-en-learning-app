import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.post('/start', async (req: AuthRequest, res, next) => {
  try {
    const { scenarioId } = req.body;

    const session = await prisma.learningSession.create({
      data: {
        userId: req.userId!,
        scenarioId,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { sessionId: session.id, scenarioId },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', async (req: AuthRequest, res, next) => {
  try {
    const session = await prisma.learningSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session || session.userId !== req.userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
    }

    const durationSec = session.startedAt
      ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
      : 0;

    const updated = await prisma.learningSession.update({
      where: { id: req.params.id },
      data: {
        completedAt: new Date(),
        durationSec,
      },
    });

    res.json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [sessions, total] = await Promise.all([
      prisma.learningSession.findMany({
        where: { userId: req.userId },
        include: {
          scenario: {
            select: { id: true, title: true, difficulty: true },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { startedAt: 'desc' },
      }),
      prisma.learningSession.count({ where: { userId: req.userId } }),
    ]);

    res.json({
      status: 'success',
      data: {
        sessions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as sessionRouter };
