import { Router } from 'express';
import { PrismaClient, AR_OBJECT_CATEGORY } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const scanEventSchema = z.object({
  objectId: z.string().uuid(),
  vocabularyItemId: z.string().uuid().optional(),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const objectsQuerySchema = z.object({
  category: z.nativeEnum(AR_OBJECT_CATEGORY).optional(),
  difficulty: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

router.get('/objects', async (req, res, next) => {
  try {
    const query = objectsQuerySchema.parse(req.query);

    const where: Record<string, unknown> = {};

    if (query.category) {
      where.category = query.category;
    }
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }
    if (query.search) {
      where.objectName = { contains: query.search, mode: 'insensitive' };
    }

    const [objects, total] = await Promise.all([
      prisma.aRObject.findMany({
        where,
        include: {
          vocabularyItems: {
            select: {
              id: true,
              word: true,
              phonetic: true,
              partOfSpeech: true,
              definition: true,
              difficulty: true,
            },
          },
        },
        take: query.limit,
        skip: query.offset,
        orderBy: { objectName: 'asc' },
      }),
      prisma.aRObject.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: objects,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/objects/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const object = await prisma.aRObject.findUnique({
      where: { id },
      include: {
        vocabularyItems: true,
      },
    });

    if (!object) {
      return res.status(404).json({
        status: 'error',
        message: 'AR object not found',
      });
    }

    res.json({
      status: 'success',
      data: object,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/vocabulary/:word', async (req, res, next) => {
  try {
    const { word } = req.params;

    const vocabularyItems = await prisma.vocabularyItem.findMany({
      where: {
        word: {
          contains: word,
          mode: 'insensitive',
        },
      },
      include: {
        object: {
          select: {
            id: true,
            objectName: true,
            category: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { word: 'asc' },
    });

    res.json({
      status: 'success',
      data: vocabularyItems,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/scan', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = scanEventSchema.parse(req.body);
    const userId = req.userId!;

    const arObject = await prisma.aRObject.findUnique({
      where: { id: body.objectId },
    });

    if (!arObject) {
      return res.status(404).json({
        status: 'error',
        message: 'AR object not found',
      });
    }

    if (body.vocabularyItemId) {
      const vocabularyItem = await prisma.vocabularyItem.findUnique({
        where: { id: body.vocabularyItemId },
      });

      if (!vocabularyItem || vocabularyItem.objectId !== body.objectId) {
        return res.status(404).json({
          status: 'error',
          message: 'Vocabulary item not found for this object',
        });
      }
    }

    const scannedObject = await prisma.scannedObject.upsert({
      where: {
        userId_objectId: {
          userId,
          objectId: body.objectId,
        },
      },
      update: {
        timesScanned: { increment: 1 },
      },
      create: {
        userId,
        objectId: body.objectId,
      },
    });

    const scanHistory = await prisma.scanHistory.create({
      data: {
        userId,
        objectId: body.objectId,
        vocabularyItemId: body.vocabularyItemId,
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        scannedObject,
        scanHistory,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    const userId = req.userId!;

    const [history, total] = await Promise.all([
      prisma.scanHistory.findMany({
        where: { userId },
        include: {
          object: {
            select: {
              id: true,
              objectName: true,
              category: true,
              imageUrl: true,
            },
          },
          vocabularyItem: {
            select: {
              id: true,
              word: true,
              definition: true,
            },
          },
        },
        take: query.limit,
        skip: query.offset,
        orderBy: { scannedAt: 'desc' },
      }),
      prisma.scanHistory.count({ where: { userId } }),
    ]);

    res.json({
      status: 'success',
      data: history,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/categories', (_req, res, next) => {
  try {
    const categories = Object.values(AR_OBJECT_CATEGORY).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    }));

    res.json({
      status: 'success',
      data: categories,
    });
  } catch (err) {
    next(err);
  }
});

export { router as arScannerRouter };
