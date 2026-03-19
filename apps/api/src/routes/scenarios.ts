import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, CEFR_LEVEL, SCENARIO_CATEGORY } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { paginationSchema, scenarioFilterSchema } from '../validators/common';

const router = Router();
const prisma = new PrismaClient();

const listScenariosSchema = paginationSchema.merge(scenarioFilterSchema);
type ListScenariosQuery = z.infer<typeof listScenariosSchema>;

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid scenario ID'),
});

const dialoguesQuerySchema = paginationSchema;
type DialoguesQuery = z.infer<typeof dialoguesQuerySchema>;

const vocabularyQuerySchema = paginationSchema;
type VocabularyQuery = z.infer<typeof vocabularyQuerySchema>;

interface ScenarioWithStats {
  id: string;
  title: string;
  description: string;
  category: SCENARIO_CATEGORY;
  difficulty: CEFR_LEVEL;
  locale: string;
  thumbnailUrl: string | null;
  estimatedMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  statistics: {
    dialogueCount: number;
    vocabularyCount: number;
  };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedQuery = listScenariosSchema.parse(req.query);
    const { page, limit, category, difficulty, locale, search } = validatedQuery;

    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (locale) {
      where.locale = locale;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [scenarios, total] = await Promise.all([
      prisma.scenario.findMany({
        where,
        include: {
          _count: {
            select: { dialogues: true, vocabulary: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.scenario.count({ where }),
    ]);

    const scenariosWithStats = scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      category: scenario.category,
      difficulty: scenario.difficulty,
      locale: scenario.locale,
      thumbnailUrl: scenario.thumbnailUrl,
      estimatedMinutes: scenario.estimatedMinutes,
      isActive: scenario.isActive,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
      statistics: {
        dialogueCount: scenario._count.dialogues,
        vocabularyCount: scenario._count.vocabulary,
      },
    }));

    res.json({
      status: 'success',
      data: {
        scenarios: scenariosWithStats,
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
      return next(new AppError(err.errors.map((e) => e.message).join(', '), 400));
    }
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      include: {
        dialogues: {
          include: {
            turns: {
              include: {
                character: true,
              },
              orderBy: { turnOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
        vocabulary: true,
        _count: {
          select: { dialogues: true, vocabulary: true },
        },
      },
    });

    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    const response: ScenarioWithStats = {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      category: scenario.category,
      difficulty: scenario.difficulty,
      locale: scenario.locale,
      thumbnailUrl: scenario.thumbnailUrl,
      estimatedMinutes: scenario.estimatedMinutes,
      isActive: scenario.isActive,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
      statistics: {
        dialogueCount: scenario._count.dialogues,
        vocabularyCount: scenario._count.vocabulary,
      },
      dialogues: scenario.dialogues,
      vocabulary: scenario.vocabulary,
    } as ScenarioWithStats & { dialogues: typeof scenario.dialogues; vocabulary: typeof scenario.vocabulary };

    res.json({
      status: 'success',
      data: response,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors.map((e) => e.message).join(', '), 400));
    }
    next(err);
  }
});

router.get('/:id/dialogues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedQuery = dialoguesQuerySchema.parse(req.query);
    const { page, limit } = validatedQuery;

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    const skip = (page - 1) * limit;

    const [dialogues, total] = await Promise.all([
      prisma.dialogue.findMany({
        where: { scenarioId: id },
        include: {
          turns: {
            include: { character: true },
            orderBy: { turnOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.dialogue.count({ where: { scenarioId: id } }),
    ]);

    res.json({
      status: 'success',
      data: {
        dialogues,
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
      return next(new AppError(err.errors.map((e) => e.message).join(', '), 400));
    }
    next(err);
  }
});

router.get('/:id/vocabulary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const validatedQuery = vocabularyQuerySchema.parse(req.query);
    const { page, limit } = validatedQuery;

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    const skip = (page - 1) * limit;

    const [vocabulary, total] = await Promise.all([
      prisma.vocabulary.findMany({
        where: { scenarioId: id },
        orderBy: { difficulty: 'asc' },
        skip,
        take: limit,
      }),
      prisma.vocabulary.count({ where: { scenarioId: id } }),
    ]);

    res.json({
      status: 'success',
      data: {
        vocabulary,
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
      return next(new AppError(err.errors.map((e) => e.message).join(', '), 400));
    }
    next(err);
  }
});

router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params);

    if (!req.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      include: { _count: { select: { dialogues: true } } },
    });

    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    const session = await prisma.learningSession.create({
      data: {
        userId: req.userId,
        scenarioId: scenario.id,
      },
    });

    await prisma.userProgress.upsert({
      where: {
        userId_scenarioId: {
          userId: req.userId,
          scenarioId: scenario.id,
        },
      },
      update: {
        lastPracticedAt: new Date(),
        totalDialogues: scenario._count.dialogues,
        attempts: { increment: 1 },
      },
      create: {
        userId: req.userId,
        scenarioId: scenario.id,
        totalDialogues: scenario._count.dialogues,
        lastPracticedAt: new Date(),
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        sessionId: session.id,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        totalDialogues: scenario._count.dialogues,
        startedAt: session.startedAt,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors.map((e) => e.message).join(', '), 400));
    }
    next(err);
  }
});

export { router as scenarioRouter };
