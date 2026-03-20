import { Router } from 'express';
import { PrismaClient, SCENARIO_CATEGORY } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const recommendationIdSchema = z.object({
  id: z.string().uuid('Invalid recommendation ID'),
});

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

router.use(authenticate);

router.get('/overview', async (req: AuthRequest, res, next) => {
  try {
    const [
      totalSessions,
      completedSessions,
      totalTimeSpent,
      avgScore,
      userProgress,
      recentSessions,
    ] = await Promise.all([
      prisma.learningSession.count({ where: { userId: req.userId } }),
      prisma.learningSession.count({
        where: { userId: req.userId, completedAt: { not: null } },
      }),
      prisma.learningSession.aggregate({
        where: { userId: req.userId, completedAt: { not: null } },
        _sum: { durationSec: true },
      }),
      prisma.userProgress.aggregate({
        where: { userId: req.userId, bestScore: { not: null } },
        _avg: { bestScore: true },
      }),
      prisma.userProgress.findMany({
        where: { userId: req.userId },
        select: { bestScore: true, completedAt: true },
      }),
      prisma.learningSession.findMany({
        where: { userId: req.userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 30,
        select: { completedAt: true },
      }),
    ]);

    const uniqueDays = new Set<string>();
    recentSessions.forEach((s) => {
      if (s.completedAt) {
        const day = new Date(s.completedAt);
        day.setHours(0, 0, 0, 0);
        uniqueDays.add(day.toISOString());
      }
    });

    const sortedDays = Array.from(uniqueDays).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      const sessionDate = new Date(sortedDays[i]);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        tempStreak++;
        if (i === 0) currentStreak = 1;
      } else {
        break;
      }
    }

    currentStreak = Math.max(currentStreak, tempStreak);

    const completedScenarios = userProgress.filter(
      (p) => p.completedAt !== null
    ).length;

    const totalMinutes = Math.round((totalTimeSpent._sum.durationSec || 0) / 60);

    res.json({
      status: 'success',
      data: {
        totalSessions,
        completedSessions,
        averageScore: Math.round(avgScore._avg.bestScore || 0),
        currentStreak,
        longestStreak: sortedDays.length,
        totalTimeSpentMinutes: totalMinutes,
        completedScenarios,
        totalScenariosStarted: userProgress.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/performance', async (req: AuthRequest, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: req.userId,
        completedAt: { not: null },
        completedAt: { gte: startDate },
      },
      orderBy: { completedAt: 'asc' },
      include: {
        scenario: {
          select: { category: true, difficulty: true },
        },
      },
    });

    const progress = await prisma.userProgress.findMany({
      where: {
        userId: req.userId,
        lastPracticedAt: { gte: startDate },
      },
      orderBy: { lastPracticedAt: 'asc' },
    });

    const dailyMetrics: Record<
      string,
      { sessions: number; avgScore: number; totalMinutes: number; scores: number[] }
    > = {};

    sessions.forEach((session) => {
      if (!session.completedAt) return;
      const dateKey = session.completedAt.toISOString().split('T')[0];
      if (!dailyMetrics[dateKey]) {
        dailyMetrics[dateKey] = { sessions: 0, avgScore: 0, totalMinutes: 0, scores: [] };
      }
      dailyMetrics[dateKey].sessions++;
      dailyMetrics[dateKey].totalMinutes += Math.round(
        (session.durationSec || 0) / 60
      );
    });

    progress.forEach((p) => {
      if (!p.lastPracticedAt || p.bestScore === null) return;
      const dateKey = p.lastPracticedAt.toISOString().split('T')[0];
      if (!dailyMetrics[dateKey]) {
        dailyMetrics[dateKey] = { sessions: 0, avgScore: 0, totalMinutes: 0, scores: [] };
      }
      dailyMetrics[dateKey].scores.push(p.bestScore);
    });

    const result = Object.entries(dailyMetrics)
      .map(([date, metrics]) => ({
        date,
        sessions: metrics.sessions,
        totalMinutes: metrics.totalMinutes,
        averageScore:
          metrics.scores.length > 0
            ? Math.round(
                metrics.scores.reduce((a, b) => a + b, 0) / metrics.scores.length
              )
            : null,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const [totalSessions, avgScore, improvement] = await Promise.all([
      prisma.learningSession.count({
        where: { userId: req.userId, completedAt: { not: null } },
      }),
      prisma.userProgress.aggregate({
        where: { userId: req.userId, bestScore: { not: null } },
        _avg: { bestScore: true },
      }),
      getPerformanceImprovement(req.userId!, days),
    ]);

    res.json({
      status: 'success',
      data: {
        period: days,
        dailyMetrics: result,
        overall: {
          totalSessions,
          averageScore: Math.round(avgScore._avg.bestScore || 0),
          improvement,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/strengths-weaknesses', async (req: AuthRequest, res, next) => {
  try {
    const progress = await prisma.userProgress.findMany({
      where: { userId: req.userId },
      include: {
        scenario: {
          select: { category: true, difficulty: true },
        },
      },
    });

    const recordings = await prisma.voiceRecording.findMany({
      where: { userId: req.userId, score: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const categoryScores: Record<string, { total: number; count: number; scores: number[] }> =
      {};

    progress.forEach((p) => {
      const cat = p.scenario.category;
      if (!categoryScores[cat]) {
        categoryScores[cat] = { total: 0, count: 0, scores: [] };
      }
      if (p.bestScore !== null) {
        categoryScores[cat].total += p.bestScore;
        categoryScores[cat].count++;
        categoryScores[cat].scores.push(p.bestScore);
      }
    });

    const difficultyScores: Record<string, { total: number; count: number }> = {};

    progress.forEach((p) => {
      const diff = p.scenario.difficulty;
      if (!difficultyScores[diff]) {
        difficultyScores[diff] = { total: 0, count: 0 };
      }
      if (p.bestScore !== null) {
        difficultyScores[diff].total += p.bestScore;
        difficultyScores[diff].count++;
      }
    });

    const categoryMetrics = Object.entries(categoryScores).map(([category, data]) => ({
      category,
      averageScore: data.count > 0 ? Math.round(data.total / data.count) : null,
      sessionsCompleted: data.count,
    }));

    const difficultyMetrics = Object.entries(difficultyScores).map(([difficulty, data]) => ({
      difficulty,
      averageScore: data.count > 0 ? Math.round(data.total / data.count) : null,
      sessionsCompleted: data.count,
    }));

    const validScores = categoryMetrics.filter((c) => c.averageScore !== null);
    const avgScore =
      validScores.length > 0
        ? validScores.reduce((a, b) => a + (b.averageScore || 0), 0) / validScores.length
        : 0;

    const strengths = categoryMetrics
      .filter((c) => c.averageScore !== null && c.averageScore >= avgScore + 10)
      .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

    const weaknesses = categoryMetrics
      .filter((c) => c.averageScore !== null && c.averageScore <= avgScore - 10)
      .sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0));

    const voiceAvgScore =
      recordings.length > 0
        ? Math.round(recordings.reduce((a, r) => a + (r.score || 0), 0) / recordings.length)
        : null;

    res.json({
      status: 'success',
      data: {
        byCategory: categoryMetrics,
        byDifficulty: difficultyMetrics,
        strengths: strengths.map((s) => ({
          category: s.category,
          averageScore: s.averageScore,
        })),
        weaknesses: weaknesses.map((w) => ({
          category: w.category,
          averageScore: w.averageScore,
        })),
        voiceAnalysis: {
          totalRecordings: recordings.length,
          averageScore: voiceAvgScore,
        },
        overallAverage: Math.round(avgScore),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/recommendations', async (req: AuthRequest, res, next) => {
  try {
    const { limit = '10' } = req.query;
    const take = parseInt(limit as string, 10);

    const progress = await prisma.userProgress.findMany({
      where: { userId: req.userId },
      include: {
        scenario: {
          select: { id: true, title: true, category: true, difficulty: true },
        },
      },
    });

    const categoryScores: Record<string, number[]> = {};
    progress.forEach((p) => {
      if (p.bestScore !== null) {
        const cat = p.scenario.category;
        if (!categoryScores[cat]) {
          categoryScores[cat] = [];
        }
        categoryScores[cat].push(p.bestScore);
      }
    });

    const categoryAvgs: Record<string, number> = {};
    Object.entries(categoryScores).forEach(([cat, scores]) => {
      categoryAvgs[cat] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    const recommendations: Array<{
      id: string;
      type: string;
      priority: string;
      title: string;
      description: string;
      scenarioId?: string;
      isRead: boolean;
    }> = [];

    const weakCategories = Object.entries(categoryAvgs)
      .filter(([, avg]) => avg < 70)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 2);

    for (const [cat] of weakCategories) {
      const scenario = await prisma.scenario.findFirst({
        where: { category: cat as SCENARIO_CATEGORY, isActive: true },
        orderBy: { difficulty: 'asc' },
      });

      if (scenario) {
        recommendations.push({
          id: `rec-weak-${cat}`,
          type: 'practice',
          priority: 'high',
          title: `Improve your ${cat.replace('_', ' ')} skills`,
          description: `You've scored below average in ${cat.replace('_', ' ')}. Practice to improve!`,
          scenarioId: scenario.id,
          isRead: false,
        });
      }
    }

    const highScoreCategories = Object.entries(categoryAvgs)
      .filter(([, avg]) => avg >= 85)
      .sort(([, a], [, b]) => b - a);

    if (highScoreCategories.length > 0) {
      const [strongCat] = highScoreCategories[0];
      const challengeScenario = await prisma.scenario.findFirst({
        where: {
          category: strongCat as any,
          isActive: true,
          difficulty: { in: ['B1', 'B2', 'C1'] },
        },
        orderBy: { difficulty: 'desc' },
      });

      if (challengeScenario) {
        recommendations.push({
          id: `rec-challenge-${challengeScenario.id}`,
          type: 'challenge',
          priority: 'low',
          title: `Challenge yourself with "${challengeScenario.title}"`,
          description: `You're strong in ${strongCat.replace('_', ' ')}. Try this harder scenario!`,
          scenarioId: challengeScenario.id,
          isRead: false,
        });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySessions = await prisma.learningSession.count({
      where: {
        userId: req.userId,
        completedAt: { gte: today },
      },
    });

    if (todaySessions === 0) {
      recommendations.push({
        id: 'rec-daily-practice',
        type: 'reminder',
        priority: 'urgent',
        title: 'Practice today!',
        description: "You haven't practiced today. Complete a session to maintain your streak!",
        isRead: false,
      });
    }

    res.json({
      status: 'success',
      data: {
        recommendations: recommendations.slice(0, take),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/recommendations/:id/read',
  async (req: AuthRequest, res, next) => {
    try {
      const data = recommendationIdSchema.parse({ id: req.params.id });

      res.json({
        status: 'success',
        data: {
          id: data.id,
          isRead: true,
          message: 'Recommendation marked as read',
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError(formatZodError(err), 400));
      } else {
        next(err);
      }
    }
  }
);

router.get('/learning-pattern', async (req: AuthRequest, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: req.userId,
        startedAt: { gte: startDate },
      },
      orderBy: { startedAt: 'asc' },
      include: {
        scenario: {
          select: { category: true, difficulty: true },
        },
      },
    });

    const hourlyDistribution: Record<number, number> = {};
    const dayOfWeekDistribution: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    sessions.forEach((session) => {
      if (!session.startedAt) return;

      const hour = session.startedAt.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

      const dayName = dayNames[session.startedAt.getDay()];
      dayOfWeekDistribution[dayName] = (dayOfWeekDistribution[dayName] || 0) + 1;

      const dateKey = session.startedAt.toISOString().split('T')[0];
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
    });

    const durationStats = sessions
      .filter((s) => s.durationSec !== null)
      .map((s) => ({
        duration: s.durationSec || 0,
        date: s.startedAt?.toISOString().split('T')[0],
      }));

    const avgDuration =
      durationStats.length > 0
        ? Math.round(
            durationStats.reduce((a, b) => a + b.duration, 0) / durationStats.length
          )
        : 0;

    const uniqueDays = Object.keys(dailyActivity).length;
    const consistencyScore = Math.min(
      100,
      Math.round((uniqueDays / days) * 100)
    );

    const peakHours = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour, 10));

    const preferredDays = Object.entries(dayOfWeekDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    const categoryPreferences: Record<string, number> = {};
    sessions.forEach((session) => {
      if (session.scenario) {
        const cat = session.scenario.category;
        categoryPreferences[cat] = (categoryPreferences[cat] || 0) + 1;
      }
    });

    const topCategories = Object.entries(categoryPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    const improvementTrend = await getLearningTrend(req.userId!, days);

    res.json({
      status: 'success',
      data: {
        period: days,
        summary: {
          totalSessions: sessions.length,
          averageSessionDuration: Math.round(avgDuration / 60),
          consistencyScore,
          improvementTrend,
        },
        timePatterns: {
          hourlyDistribution,
          dayOfWeekDistribution,
          peakHours,
          preferredDays,
        },
        categoryPreferences: topCategories,
        dailyActivity: Object.entries(dailyActivity)
          .map(([date, count]) => ({ date, sessions: count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      },
    });
  } catch (err) {
    next(err);
  }
});

async function getPerformanceImprovement(
  userId: string,
  days: number
): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - Math.floor(days / 2));
  startDate.setHours(0, 0, 0, 0);

  const midDate = new Date();
  midDate.setDate(midDate.getDate() - days);
  midDate.setHours(0, 0, 0, 0);

  const [firstHalf, secondHalf] = await Promise.all([
    prisma.userProgress.findMany({
      where: {
        userId,
        lastPracticedAt: { gte: midDate, lt: startDate },
        bestScore: { not: null },
      },
      select: { bestScore: true },
    }),
    prisma.userProgress.findMany({
      where: {
        userId,
        lastPracticedAt: { gte: startDate },
        bestScore: { not: null },
      },
      select: { bestScore: true },
    }),
  ]);

  const firstAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + (b.bestScore || 0), 0) / firstHalf.length
      : 0;

  const secondAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + (b.bestScore || 0), 0) / secondHalf.length
      : 0;

  return Math.round(secondAvg - firstAvg);
}

async function getLearningTrend(userId: string, days: number): Promise<string> {
  const improvement = await getPerformanceImprovement(userId, days);

  if (improvement > 5) return 'improving';
  if (improvement < -5) return 'declining';
  return 'stable';
}

export { router as analyticsRouter };
