import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { updateProfileSchema } from '../validators/auth';
import { ZodError } from 'zod';

const router = Router();
const prisma = new PrismaClient();

function formatZodError(error: ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

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
        learningProfile: {
          select: {
            preferredSessionDuration: true,
            dailyGoalMinutes: true,
            notificationEnabled: true,
            reminderTime: true,
            learningGoals: true,
            targetProficiency: true,
            targetAchievementDate: true,
            accessibilityPreferences: true,
          },
        },
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
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        nativeLanguage: data.nativeLanguage,
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

    if (
      data.preferredSessionDuration !== undefined ||
      data.dailyGoalMinutes !== undefined
    ) {
      await prisma.userLearningProfile.upsert({
        where: { userId: req.userId },
        update: {
          preferredSessionDuration: data.preferredSessionDuration,
          dailyGoalMinutes: data.dailyGoalMinutes,
          notificationEnabled: data.notificationEnabled,
          reminderTime: data.reminderTime,
          learningGoals: data.learningGoals,
          targetProficiency: data.targetProficiency,
        },
        create: {
          userId: req.userId!,
          preferredSessionDuration: data.preferredSessionDuration || 15,
          dailyGoalMinutes: data.dailyGoalMinutes || 15,
          notificationEnabled: data.notificationEnabled ?? true,
          reminderTime: data.reminderTime,
          learningGoals: data.learningGoals || [],
          targetProficiency: data.targetProficiency,
        },
      });
    }

    res.json({ status: 'success', data: user });
  } catch (err) {
    if (err instanceof ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
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

    const totalMinutes = await prisma.learningSession.aggregate({
      where: { userId: req.userId, completedAt: { not: null } },
      _sum: { durationSec: true },
    });

    res.json({
      status: 'success',
      data: {
        scenariosCompleted: progressCount,
        recordingsCount: recordingCount,
        sessionsCount: sessionCount,
        achievementsEarned: achievementCount,
        totalPracticeMinutes: Math.round((totalMinutes._sum.durationSec || 0) / 60),
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

router.get('/learning-profile', async (req: AuthRequest, res, next) => {
  try {
    const profile = await prisma.userLearningProfile.findUnique({
      where: { userId: req.userId },
    });

    if (!profile) {
      throw new AppError('Learning profile not found', 404);
    }

    res.json({ status: 'success', data: profile });
  } catch (err) {
    next(err);
  }
});

router.put('/learning-profile', async (req: AuthRequest, res, next) => {
  try {
    const data = req.body;

    const profile = await prisma.userLearningProfile.upsert({
      where: { userId: req.userId },
      update: {
        preferredSessionDuration: data.preferredSessionDuration,
        dailyGoalMinutes: data.dailyGoalMinutes,
        notificationEnabled: data.notificationEnabled,
        reminderTime: data.reminderTime,
        learningGoals: data.learningGoals,
        targetProficiency: data.targetProficiency,
        targetAchievementDate: data.targetAchievementDate
          ? new Date(data.targetAchievementDate)
          : undefined,
        accessibilityPreferences: data.accessibilityPreferences,
      },
      create: {
        userId: req.userId!,
        preferredSessionDuration: data.preferredSessionDuration || 15,
        dailyGoalMinutes: data.dailyGoalMinutes || 15,
        notificationEnabled: data.notificationEnabled ?? true,
        reminderTime: data.reminderTime,
        learningGoals: data.learningGoals || [],
        targetProficiency: data.targetProficiency,
        targetAchievementDate: data.targetAchievementDate
          ? new Date(data.targetAchievementDate)
          : undefined,
        accessibilityPreferences: data.accessibilityPreferences || {},
      },
    });

    res.json({ status: 'success', data: profile });
  } catch (err) {
    next(err);
  }
});

export { router as userRouter };
