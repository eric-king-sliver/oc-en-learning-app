import { Router } from 'express';
import { PrismaClient, CEFR_LEVEL, SCENARIO_CATEGORY } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const scenarioInclude = {
  dialogues: {
    include: {
      turns: {
        include: {
          character: true,
        },
        orderBy: { turnOrder: 'asc' },
      },
    },
  },
  vocabulary: true,
};

router.get('/', async (req, res, next) => {
  try {
    const { category, difficulty, locale, search, page = '1', limit = '10' } = req.query;

    const where: any = { isActive: true };

    if (category) {
      where.category = category as SCENARIO_CATEGORY;
    }
    if (difficulty) {
      where.difficulty = difficulty as CEFR_LEVEL;
    }
    if (locale) {
      where.locale = locale as string;
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [scenarios, total] = await Promise.all([
      prisma.scenario.findMany({
        where,
        include: {
          _count: {
            select: { dialogues: true, vocabulary: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.scenario.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        scenarios,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const scenario = await prisma.scenario.findUnique({
      where: { id: req.params.id },
      include: scenarioInclude,
    });

    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    res.json({ status: 'success', data: scenario });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/dialogues', async (req, res, next) => {
  try {
    const dialogues = await prisma.dialogue.findMany({
      where: { scenarioId: req.params.id },
      include: {
        turns: {
          include: { character: true },
          orderBy: { turnOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({ status: 'success', data: dialogues });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/vocabulary', async (req, res, next) => {
  try {
    const vocabulary = await prisma.vocabulary.findMany({
      where: { scenarioId: req.params.id },
      orderBy: { difficulty: 'asc' },
    });

    res.json({ status: 'success', data: vocabulary });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const scenario = await prisma.scenario.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { dialogues: true } } },
    });

    if (!scenario) {
      throw new AppError('Scenario not found', 404);
    }

    const session = await prisma.learningSession.create({
      data: {
        userId: req.userId!,
        scenarioId: scenario.id,
      },
    });

    await prisma.userProgress.upsert({
      where: {
        userId_scenarioId: {
          userId: req.userId!,
          scenarioId: scenario.id,
        },
      },
      update: {
        lastPracticedAt: new Date(),
        attempts: { increment: 1 },
      },
      create: {
        userId: req.userId!,
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
        totalDialogues: scenario._count.dialogues,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as scenarioRouter };
