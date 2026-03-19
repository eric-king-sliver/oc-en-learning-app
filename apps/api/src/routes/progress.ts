import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

router.use(authenticate);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20', category, difficulty } = req.query;

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
            estimatedMinutes: true,
          },
        },
      },
      orderBy: { lastPracticedAt: 'desc' },
    });

    let filtered = progress;
    if (category) {
      filtered = filtered.filter((p) => p.scenario.category === category);
    }
    if (difficulty) {
      filtered = filtered.filter((p) => p.scenario.difficulty === difficulty);
    }

    const total = filtered.length;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const paginated = filtered.slice(skip, skip + parseInt(limit as string));

    res.json({
      status: 'success',
      data: {
        progress: paginated.map((p) => ({
          scenarioId: p.scenarioId,
          scenario: p.scenario,
          completedDialogues: p.completedDialogues,
          totalDialogues: p.totalDialogues,
          bestScore: p.bestScore,
          attempts: p.attempts,
          lastPracticedAt: p.lastPracticedAt,
          completedAt: p.completedAt,
          progressPercent: p.totalDialogues > 0
            ? Math.round((p.completedDialogues / p.totalDialogues) * 100)
            : 0,
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
        summary: {
          totalScenariosStarted: progress.length,
          totalScenariosCompleted: progress.filter((p) => p.completedAt).length,
          totalPracticeMinutes: Math.round(
            progress.reduce((acc, p) => acc + (p.lastPracticedAt ? 1 : 0), 0) * 15
          ),
        },
      },
    });
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

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDays = new Set<string>();
    sessions.forEach((s) => {
      const day = new Date(s.completedAt!);
      day.setHours(0, 0, 0, 0);
      uniqueDays.add(day.toISOString());
    });

    const sortedDays = Array.from(uniqueDays).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    for (let i = 0; i < sortedDays.length; i++) {
      const sessionDate = new Date(sortedDays[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        tempStreak++;
        if (i === 0) currentStreak = 1;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) longestStreak = tempStreak;

    const totalDays = sortedDays.length;

    res.json({
      status: 'success',
      data: {
        currentStreak: Math.max(currentStreak, tempStreak),
        longestStreak,
        totalActiveDays: totalDays,
        todayCompleted: sortedDays.length > 0 &&
          new Date(sortedDays[0]).getTime() === today.getTime(),
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
            dialogues: {
              orderBy: { displayOrder: 'asc' },
            },
            _count: {
              select: { dialogues: true, vocabulary: true },
            },
          },
        },
      },
    });

    if (!progress) {
      const scenario = await prisma.scenario.findUnique({
        where: { id: req.params.id },
        include: {
          _count: { select: { dialogues: true, vocabulary: true } },
        },
      });

      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }

      res.json({
        status: 'success',
        data: {
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          completedDialogues: 0,
          totalDialogues: scenario._count.dialogues,
          bestScore: null,
          attempts: 0,
          lastPracticedAt: null,
          completedAt: null,
          progressPercent: 0,
          isStarted: false,
          isCompleted: false,
        },
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        scenarioId: progress.scenarioId,
        scenarioTitle: progress.scenario.title,
        completedDialogues: progress.completedDialogues,
        totalDialogues: progress.totalDialogues,
        bestScore: progress.bestScore,
        attempts: progress.attempts,
        lastPracticedAt: progress.lastPracticedAt,
        completedAt: progress.completedAt,
        progressPercent: progress.totalDialogues > 0
          ? Math.round((progress.completedDialogues / progress.totalDialogues) * 100)
          : 0,
        isStarted: progress.attempts > 0,
        isCompleted: !!progress.completedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const [
      totalProgress,
      completedProgress,
      totalSessions,
      completedSessions,
      totalRecordings,
      totalAchievements,
      totalMinutes,
    ] = await Promise.all([
      prisma.userProgress.count({ where: { userId: req.userId } }),
      prisma.userProgress.count({
        where: { userId: req.userId, completedAt: { not: null } },
      }),
      prisma.learningSession.count({ where: { userId: req.userId } }),
      prisma.learningSession.count({
        where: { userId: req.userId, completedAt: { not: null } },
      }),
      prisma.voiceRecording.count({ where: { userId: req.userId } }),
      prisma.userAchievement.count({ where: { userId: req.userId } }),
      prisma.learningSession.aggregate({
        where: { userId: req.userId, completedAt: { not: null } },
        _sum: { durationSec: true },
      }),
    ]);

    const categoryBreakdown = await prisma.userProgress.findMany({
      where: { userId: req.userId },
      include: {
        scenario: {
          select: { category: true },
        },
      },
    });

    const categoryStats = categoryBreakdown.reduce((acc: any, p) => {
      const cat = p.scenario.category;
      if (!acc[cat]) {
        acc[cat] = { total: 0, completed: 0 };
      }
      acc[cat].total++;
      if (p.completedAt) acc[cat].completed++;
      return acc;
    }, {});

    res.json({
      status: 'success',
      data: {
        scenarios: {
          started: totalProgress,
          completed: completedProgress,
          completionRate: totalProgress > 0
            ? Math.round((completedProgress / totalProgress) * 100)
            : 0,
        },
        sessions: {
          total: totalSessions,
          completed: completedSessions,
        },
        recordings: totalRecordings,
        achievements: totalAchievements,
        totalPracticeMinutes: Math.round((totalMinutes._sum.durationSec || 0) / 60),
        categoryBreakdown: Object.entries(categoryStats).map(([category, stats]: [string, any]) => ({
          category,
          total: stats.total,
          completed: stats.completed,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as progressRouter };
