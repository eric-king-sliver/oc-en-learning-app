import { Router, Response, NextFunction } from 'express';
import { PrismaClient, CEFR_LEVEL } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

const createSessionSchema = z.object({
  scenarioId: z.string().uuid('Invalid scenario ID').optional(),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(2000, 'Message too long'),
  audioUrl: z.string().url().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.use(authenticate);

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createSessionSchema.parse(req.body);

    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    let scenarioId = data.scenarioId;
    if (scenarioId) {
      const scenario = await prisma.scenario.findUnique({
        where: { id: scenarioId },
      });
      if (!scenario) {
        throw new AppError('Scenario not found', 404);
      }
    }

    const existingWaitingSession = await prisma.liveSession.findFirst({
      where: {
        status: 'waiting',
        userId2: null,
        difficulty: data.difficulty || 'B1',
        NOT: { userId1: req.userId },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existingWaitingSession) {
      const session = await prisma.liveSession.update({
        where: { id: existingWaitingSession.id },
        data: {
          userId2: req.userId,
          status: 'active',
        },
        include: {
          user1: {
            select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
          },
          user2: {
            select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
          },
          scenario: {
            select: { id: true, title: true, difficulty: true, category: true },
          },
        },
      });

      res.status(201).json({
        status: 'success',
        data: {
          sessionId: session.id,
          scenarioId: session.scenarioId,
          scenario: session.scenario,
          status: session.status,
          difficulty: session.difficulty,
          user1: session.user1,
          user2: session.user2,
          createdAt: session.createdAt,
          isMatched: true,
        },
      });
    } else {
      const session = await prisma.liveSession.create({
        data: {
          userId1: req.userId,
          userId2: null,
          scenarioId: scenarioId || null,
          difficulty: data.difficulty || 'B1',
          status: 'waiting',
        },
        include: {
          user1: {
            select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
          },
          scenario: {
            select: { id: true, title: true, difficulty: true, category: true },
          },
        },
      });

      res.status(201).json({
        status: 'success',
        data: {
          sessionId: session.id,
          scenarioId: session.scenarioId,
          scenario: session.scenario,
          status: session.status,
          difficulty: session.difficulty,
          user1: session.user1,
          user2: null,
          createdAt: session.createdAt,
          isMatched: false,
        },
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(formatZodError(err), 400));
    }
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid('Invalid session ID') }).parse(req.params);

    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const session = await prisma.liveSession.findUnique({
      where: { id },
      include: {
        user1: {
          select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
        },
        user2: {
          select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
        },
        scenario: {
          select: { id: true, title: true, difficulty: true, category: true, description: true },
        },
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 50,
          include: {
            sender: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.userId1 !== req.userId && session.userId2 !== req.userId) {
      throw new AppError('Not authorized to view this session', 403);
    }

    res.json({
      status: 'success',
      data: {
        id: session.id,
        scenarioId: session.scenarioId,
        scenario: session.scenario,
        status: session.status,
        difficulty: session.difficulty,
        user1: session.user1,
        user2: session.user2,
        duration: session.duration,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        messages: session.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          sender: m.sender,
          content: m.content,
          audioUrl: m.audioUrl,
          timestamp: m.timestamp,
          isRead: m.isRead,
        })),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(formatZodError(err), 400));
    }
    next(err);
  }
});

router.post('/:id/end', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid('Invalid session ID') }).parse(req.params);

    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const session = await prisma.liveSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.userId1 !== req.userId && session.userId2 !== req.userId) {
      throw new AppError('Not authorized to end this session', 403);
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new AppError('Session already ended', 400);
    }

    const endedAt = new Date();
    const duration = session.createdAt
      ? Math.floor((endedAt.getTime() - session.createdAt.getTime()) / 1000)
      : 0;

    const updatedSession = await prisma.liveSession.update({
      where: { id },
      data: {
        status: 'completed',
        endedAt,
        duration,
      },
      include: {
        user1: {
          select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
        },
        user2: {
          select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
        },
        scenario: {
          select: { id: true, title: true, difficulty: true, category: true },
        },
      },
    });

    await prisma.matchHistory.create({
      data: {
        userId1: session.userId1,
        userId2: session.userId2 || '',
        sessionId: session.id,
        outcome: 'draw',
        score1: 0,
        score2: 0,
      },
    });

    res.json({
      status: 'success',
      data: {
        sessionId: updatedSession.id,
        status: updatedSession.status,
        duration: updatedSession.duration,
        endedAt: updatedSession.endedAt,
        user1: updatedSession.user1,
        user2: updatedSession.user2,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(formatZodError(err), 400));
    }
    next(err);
  }
});

router.get('/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit } = validatedQuery;
    const skip = (page - 1) * limit;

    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const [sessions, total] = await Promise.all([
      prisma.liveSession.findMany({
        where: {
          OR: [{ userId1: req.userId }, { userId2: req.userId }],
        },
        include: {
          user1: {
            select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
          },
          user2: {
            select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
          },
          scenario: {
            select: { id: true, title: true, difficulty: true, category: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.liveSession.count({
        where: {
          OR: [{ userId1: req.userId }, { userId2: req.userId }],
        },
      }),
    ]);

    res.json({
      status: 'success',
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          scenarioId: s.scenarioId,
          scenario: s.scenario,
          status: s.status,
          difficulty: s.difficulty,
          user1: s.user1,
          user2: s.user2,
          duration: s.duration,
          createdAt: s.createdAt,
          endedAt: s.endedAt,
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
      return next(new AppError(formatZodError(err), 400));
    }
    next(err);
  }
});

router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const [totalSessions, completedSessions, totalDuration, recentSessions] = await Promise.all([
      prisma.liveSession.count({
        where: {
          OR: [{ userId1: req.userId }, { userId2: req.userId }],
        },
      }),
      prisma.liveSession.count({
        where: {
          OR: [{ userId1: req.userId }, { userId2: req.userId }],
          status: 'completed',
        },
      }),
      prisma.liveSession.aggregate({
        where: {
          OR: [{ userId1: req.userId }, { userId2: req.userId }],
          status: 'completed',
        },
        _sum: { duration: true },
      }),
      prisma.liveSession.findMany({
        where: {
          OR: [{ userId1: req.userId }, { userId2: req.userId }],
          status: 'completed',
        },
        orderBy: { endedAt: 'desc' },
        take: 7,
        include: {
          scenario: { select: { id: true, title: true } },
        },
      }),
    ]);

    const avgDuration = completedSessions > 0
      ? Math.round((totalDuration._sum.duration || 0) / completedSessions)
      : 0;

    const thisWeekSessions = await prisma.liveSession.count({
      where: {
        OR: [{ userId1: req.userId }, { userId2: req.userId }],
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const thisMonthSessions = await prisma.liveSession.count({
      where: {
        OR: [{ userId1: req.userId }, { userId2: req.userId }],
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    res.json({
      status: 'success',
      data: {
        totalSessions,
        completedSessions,
        totalDuration: totalDuration._sum.duration || 0,
        avgDuration,
        thisWeekSessions,
        thisMonthSessions,
        recentSessions: recentSessions.map((s) => ({
          id: s.id,
          scenarioTitle: s.scenario?.title,
          duration: s.duration,
          endedAt: s.endedAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = z.object({ id: z.string().uuid('Invalid session ID') }).parse(req.params);
    const data = sendMessageSchema.parse(req.body);

    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const session = await prisma.liveSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.userId1 !== req.userId && session.userId2 !== req.userId) {
      throw new AppError('Not authorized to send messages in this session', 403);
    }

    if (session.status !== 'active' && session.status !== 'waiting') {
      throw new AppError('Session is not active', 400);
    }

    const message = await prisma.sessionMessage.create({
      data: {
        sessionId: session.id,
        senderId: req.userId,
        content: data.content,
        audioUrl: data.audioUrl || null,
      },
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (session.status === 'waiting' && session.userId2) {
      await prisma.liveSession.update({
        where: { id: session.id },
        data: { status: 'active' },
      });
    }

    res.status(201).json({
      status: 'success',
      data: {
        id: message.id,
        sessionId: message.sessionId,
        senderId: message.senderId,
        sender: message.sender,
        content: message.content,
        audioUrl: message.audioUrl,
        timestamp: message.timestamp,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(formatZodError(err), 400));
    }
    next(err);
  }
});

export { router as liveSessionRouter };
