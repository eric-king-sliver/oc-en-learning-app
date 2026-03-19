import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        nativeLanguage: true,
        currentProficiency: true,
        accountStatus: true,
        emailVerified: true,
        lastActiveAt: true,
        createdAt: true,
        learningProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
});

router.put('/me', async (req: AuthRequest, res, next) => {
  try {
    const { displayName, avatarUrl, nativeLanguage } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        displayName,
        avatarUrl,
        nativeLanguage,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        nativeLanguage: true,
        currentProficiency: true,
      },
    });

    res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const [progressCount, recordingCount, sessionCount, achievementCount] =
      await Promise.all([
        prisma.userProgress.count({ where: { userId: req.userId } }),
        prisma.voiceRecording.count({ where: { userId: req.userId } }),
        prisma.learningSession.count({ where: { userId: req.userId } }),
        prisma.userAchievement.count({ where: { userId: req.userId } }),
      ]);

    res.json({
      status: 'success',
      data: {
        scenariosCompleted: progressCount,
        recordingsCount: recordingCount,
        sessionsCount: sessionCount,
        achievementsEarned: achievementCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/skills', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { currentProficiency: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        proficiency: user.currentProficiency,
        skills: {
          listening: user.currentProficiency,
          speaking: user.currentProficiency,
          reading: user.currentProficiency,
          writing: user.currentProficiency,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as userRouter };
