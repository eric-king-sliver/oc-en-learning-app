import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const startSessionSchema = z.object({
  scenarioId: z.string().uuid('Invalid scenario ID'),
  sessionType: z.enum(['guided', 'free', 'challenge']).default('guided'),
});

const turnCompletionSchema = z.object({
  dialogueTurnId: z.string().uuid('Invalid turn ID'),
  timeSpentMs: z.number().int().min(0),
  score: z.number().int().min(0).max(100).optional(),
  hintsUsed: z.number().int().min(0).default(0),
});

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

router.use(authenticate);

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = startSessionSchema.parse(req.body);

    const scenario = await prisma.scenario.findUnique({
      where: { id: data.scenarioId },
      include: {
        _count: { select: { dialogues: true } },
      },
    });

    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    const session = await prisma.learningSession.create({
      data: {
        userId: req.userId!,
        scenarioId: data.scenarioId,
        turnsCount: 0,
      },
    });

    const firstDialogue = await prisma.dialogue.findFirst({
      where: { scenarioId: data.scenarioId },
      orderBy: { displayOrder: 'asc' },
      include: {
        turns: {
          orderBy: { turnOrder: 'asc' },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        sessionId: session.id,
        scenarioId: data.scenarioId,
        scenarioTitle: scenario.title,
        totalDialogues: scenario._count.dialogues,
        sessionType: data.sessionType,
        firstDialogue: firstDialogue
          ? {
              id: firstDialogue.id,
              title: firstDialogue.title,
              totalTurns: firstDialogue.turns.length,
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

router.post('/:id/turns', async (req: AuthRequest, res, next) => {
  try {
    const data = turnCompletionSchema.parse(req.body);

    const session = await prisma.learningSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session || session.userId !== req.userId) {
      throw new AppError('Session not found', 404);
    }

    if (session.completedAt) {
      throw new AppError('Session already completed', 400);
    }

    const turn = await prisma.dialogueTurn.findUnique({
      where: { id: data.dialogueTurnId },
      include: { dialogue: true },
    });

    if (!turn) {
      throw new AppError('Turn not found', 404);
    }

    const updatedSession = await prisma.learningSession.update({
      where: { id: req.params.id },
      data: {
        turnsCount: { increment: 1 },
      },
    });

    const isLastTurn = await prisma.dialogueTurn.count({
      where: {
        dialogueId: turn.dialogueId,
        turnOrder: { gt: turn.turnOrder },
      },
    });

    const nextTurn = await prisma.dialogueTurn.findFirst({
      where: {
        dialogueId: turn.dialogueId,
        turnOrder: { gt: turn.turnOrder },
      },
      orderBy: { turnOrder: 'asc' },
    });

    let nextDialogue = null;
    if (!nextTurn) {
      const nextDialogueRecord = await prisma.dialogue.findFirst({
        where: {
          scenarioId: session.scenarioId!,
          displayOrder: { gt: turn.dialogue.displayOrder },
        },
        orderBy: { displayOrder: 'asc' },
        include: {
          turns: {
            orderBy: { turnOrder: 'asc' },
          },
        },
      });

      if (nextDialogueRecord) {
        nextDialogue = {
          id: nextDialogueRecord.id,
          title: nextDialogueRecord.title,
          nextTurn: nextDialogueRecord.turns[0]
            ? {
                id: nextDialogueRecord.turns[0].id,
                turnOrder: nextDialogueRecord.turns[0].turnOrder,
                speakerType: nextDialogueRecord.turns[0].speakerType,
              }
            : null,
        };
      }
    }

    res.json({
      status: 'success',
      data: {
        sessionId: session.id,
        completedTurnId: data.dialogueTurnId,
        totalTurnsCompleted: updatedSession.turnsCount,
        isLastTurn: !nextTurn && !nextDialogue,
        score: data.score,
        nextTurn: nextTurn
          ? {
              id: nextTurn.id,
              turnOrder: nextTurn.turnOrder,
              speakerType: nextTurn.speakerType,
              content: nextTurn.speakerType === 'ai' ? nextTurn.content : null,
              hints: nextTurn.hints,
            }
          : null,
        nextDialogue,
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

router.post('/:id/complete', async (req: AuthRequest, res, next) => {
  try {
    const session = await prisma.learningSession.findUnique({
      where: { id: req.params.id },
      include: {
        scenario: {
          include: {
            _count: { select: { dialogues: true } },
          },
        },
      },
    });

    if (!session || session.userId !== req.userId) {
      throw new AppError('Session not found', 404);
    }

    if (session.completedAt) {
      throw new AppError('Session already completed', 400);
    }

    const durationSec = session.startedAt
      ? Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
      : 0;

    const completedDialogues = await prisma.dialogue.count({
      where: {
        scenarioId: session.scenarioId!,
      },
    });

    const updatedSession = await prisma.learningSession.update({
      where: { id: req.params.id },
      data: {
        completedAt: new Date(),
        durationSec,
      },
    });

    await prisma.userProgress.update({
      where: {
        userId_scenarioId: {
          userId: req.userId!,
          scenarioId: session.scenarioId!,
        },
      },
      data: {
        completedDialogues,
        lastPracticedAt: new Date(),
        completedAt: new Date(),
      },
    });

    res.json({
      status: 'success',
      data: {
        sessionId: session.id,
        scenarioId: session.scenarioId,
        scenarioTitle: session.scenario?.title,
        durationSec,
        turnsCompleted: session.turnsCount,
        dialoguesCompleted: completedDialogues,
        completedAt: updatedSession.completedAt,
        isCompleted: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const session = await prisma.learningSession.findUnique({
      where: { id: req.params.id },
      include: {
        scenario: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            category: true,
          },
        },
      },
    });

    if (!session || session.userId !== req.userId) {
      throw new AppError('Session not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        id: session.id,
        scenarioId: session.scenarioId,
        scenario: session.scenario,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        durationSec: session.durationSec,
        turnsCount: session.turnsCount,
        isCompleted: !!session.completedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20', scenarioId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { userId: req.userId };
    if (scenarioId) {
      where.scenarioId = scenarioId;
    }

    const [sessions, total] = await Promise.all([
      prisma.learningSession.findMany({
        where,
        include: {
          scenario: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              category: true,
            },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { startedAt: 'desc' },
      }),
      prisma.learningSession.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          scenarioId: s.scenarioId,
          scenario: s.scenario,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          durationSec: s.durationSec,
          turnsCount: s.turnsCount,
          isCompleted: !!s.completedAt,
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as sessionRouter };
