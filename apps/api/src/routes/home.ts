import { Router } from 'express';
import { PrismaClient, CEFR_LEVEL } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/feed', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        learningProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const [continueLearning, recentProgress, completedScenarios, stats] = await Promise.all([
      prisma.userProgress.findMany({
        where: {
          userId: req.userId,
          completedAt: null,
        },
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
        take: 5,
      }),

      prisma.learningSession.findMany({
        where: {
          userId: req.userId,
          completedAt: { not: null },
        },
        include: {
          scenario: {
            select: {
              id: true,
              title: true,
              difficulty: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 3,
      }),

      prisma.userProgress.count({
        where: {
          userId: req.userId,
          completedAt: { not: null },
        },
      }),

      (async () => {
        const totalMinutes = await prisma.learningSession.aggregate({
          where: { userId: req.userId, completedAt: { not: null } },
          _sum: { durationSec: true },
        });
        return Math.round((totalMinutes._sum.durationSec || 0) / 60);
      })(),
    ]);

    const dailyGoalMinutes = user.learningProfile?.dailyGoalMinutes || 15;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySessions = await prisma.learningSession.findMany({
      where: {
        userId: req.userId,
        startedAt: { gte: todayStart },
        completedAt: { not: null },
      },
    });

    const todayMinutes = Math.round(
      todaySessions.reduce((acc, s) => acc + (s.durationSec || 0), 0) / 60
    );

    const dailyGoalProgress = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));

    const recommendedScenarios = await prisma.scenario.findMany({
      where: {
        isActive: true,
        difficulty: user.currentProficiency,
      },
      include: {
        _count: { select: { dialogues: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const continueLearningData = continueLearning.map((p) => ({
      scenarioId: p.scenarioId,
      scenario: p.scenario,
      progressPercent:
        p.totalDialogues > 0
          ? Math.round((p.completedDialogues / p.totalDialogues) * 100)
          : 0,
      lastPracticedAt: p.lastPracticedAt,
    }));

    res.json({
      status: 'success',
      data: {
        user: {
          displayName: user.displayName,
          currentProficiency: user.currentProficiency,
        },
        dailyGoal: {
          target: dailyGoalMinutes,
          current: todayMinutes,
          progress: dailyGoalProgress,
          completed: todayMinutes >= dailyGoalMinutes,
        },
        continueLearning: continueLearningData,
        recentActivity: recentProgress.map((s) => ({
          scenarioId: s.scenarioId,
          scenario: s.scenario,
          completedAt: s.completedAt,
        })),
        stats: {
          scenariosCompleted: completedScenarios,
          totalPracticeMinutes: stats,
        },
        recommendedScenarios: recommendedScenarios.map((s) => ({
          id: s.id,
          title: s.title,
          difficulty: s.difficulty,
          category: s.category,
          thumbnailUrl: s.thumbnailUrl,
          estimatedMinutes: s.estimatedMinutes,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/daily', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );

    const scenarios = await prisma.scenario.findMany({
      where: { isActive: true },
      select: { id: true, title: true, difficulty: true },
    });

    const dailyScenario = scenarios[dayOfYear % scenarios.length];

    const vocabulary = await prisma.vocabulary.findMany({
      where: {
        difficulty: user.currentProficiency,
      },
      select: { id: true, word: true, phonetic: true, translation: true },
    });

    const dailyWord = vocabulary[dayOfYear % Math.max(1, vocabulary.length)];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCompleted = await prisma.learningSession.count({
      where: {
        userId: req.userId,
        startedAt: { gte: todayStart },
        completedAt: { not: null },
      },
    });

    res.json({
      status: 'success',
      data: {
        date: today.toISOString().split('T')[0],
        scenario: dailyScenario || null,
        vocabularyWord: dailyWord
          ? {
              word: dailyWord.word,
              phonetic: dailyWord.phonetic,
              translation: dailyWord.translation,
            }
          : null,
        todayCompleted,
        streak: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/recommendations', async (req: AuthRequest, res, next) => {
  try {
    const { category, difficulty, limit = '10' } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { currentProficiency: true },
    });

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const startedScenarioIds = await prisma.userProgress.findMany({
      where: { userId: req.userId },
      select: { scenarioId: true },
    });
    const startedIds = startedScenarioIds.map((p) => p.scenarioId);

    const where: any = {
      isActive: true,
      id: { notIn: startedIds },
    };

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    } else {
      const levels: CEFR_LEVEL[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const userLevelIndex = levels.indexOf(user.currentProficiency);
      where.difficulty = {
        in: levels.slice(Math.max(0, userLevelIndex - 1), userLevelIndex + 2),
      };
    }

    const scenarios = await prisma.scenario.findMany({
      where,
      include: {
        _count: { select: { dialogues: true, vocabulary: true } },
      },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: {
        recommendations: scenarios.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          category: s.category,
          difficulty: s.difficulty,
          thumbnailUrl: s.thumbnailUrl,
          estimatedMinutes: s.estimatedMinutes,
          dialogueCount: s._count.dialogues,
          vocabularyCount: s._count.vocabulary,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/categories', async (req: AuthRequest, res, next) => {
  try {
    const categories = await prisma.scenario.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true },
    });

    const userProgress = await prisma.userProgress.findMany({
      where: { userId: req.userId },
      include: {
        scenario: {
          select: { category: true },
        },
      },
    });

    const categoryProgress = userProgress.reduce((acc: any, p) => {
      const cat = p.scenario.category;
      if (!acc[cat]) acc[cat] = { total: 0, completed: 0 };
      acc[cat].total++;
      if (p.completedAt) acc[cat].completed++;
      return acc;
    }, {});

    res.json({
      status: 'success',
      data: categories.map((c) => ({
        category: c.category,
        scenarioCount: c._count.category,
        userProgress: categoryProgress[c.category] || { total: 0, completed: 0 },
      })),
    });
  } catch (err) {
    next(err);
  }
});

export { router as homeRouter };
