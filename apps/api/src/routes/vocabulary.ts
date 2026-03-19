import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const { difficulty, search, limit = '50' } = req.query;

    const where: any = {};

    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (search) {
      where.OR = [
        { word: { contains: search as string, mode: 'insensitive' } },
        { translation: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const vocabulary = await prisma.vocabulary.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: [{ difficulty: 'asc' }, { word: 'asc' }],
    });

    res.json({
      status: 'success',
      data: vocabulary,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const vocabulary = await prisma.vocabulary.findUnique({
      where: { id: req.params.id },
    });

    if (!vocabulary) {
      return res.status(404).json({
        status: 'error',
        message: 'Vocabulary not found',
      });
    }

    res.json({
      status: 'success',
      data: vocabulary,
    });
  } catch (err) {
    next(err);
  }
});

export { router as vocabularyRouter };
