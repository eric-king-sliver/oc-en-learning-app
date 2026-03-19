import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const videoFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  scenarioId: z.string().uuid().optional(),
});

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

router.get('/', async (req, res, next) => {
  try {
    const filters = videoFilterSchema.parse(req.query);
    const { page, limit, difficulty, scenarioId } = filters;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (difficulty) where.difficulty = difficulty;
    if (scenarioId) where.scenarioId = scenarioId;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.video.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: {
        videos,
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
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    res.json({
      status: 'success',
      data: video,
    });
  } catch (err) {
    next(err);
  }
});

export { router as videoRouter };
