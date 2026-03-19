import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const progress = await prisma.userProgress.findMany({
      where: { userId: req.userId },
      include: {
        scenario: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            category: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { lastPracticedAt: 'desc' },
    });

    res.json({ status: 'success', data: progress });
  } catch (err) {
    next(err);
  }
});

router.get('/streak', async (req: AuthRequest, res, next) => {
  try {
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: req.userId,
        completedAt: { not: null },
      },
      select: {
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].completedAt!);
      sessionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      status: 'success',
      data: {
        currentStreak: streak,
        longestStreak: streak,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/scenario/:id', async (req: AuthRequest, res, next) => {
  try {
    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_scenarioId: {
          userId: req.userId!,
          scenarioId: req.params.id,
        },
      },
      include: {
        scenario: {
          include: {
            _count: {
              select: { dialogues: true },
            },
          },
        },
      },
    });

    if (!progress) {
      throw new AppError('Progress not found', 404);
    }

    res.json({ status: 'success', data: progress });
  } catch (err) {
    next(err);
  }
});

export { router as progressRouter };
