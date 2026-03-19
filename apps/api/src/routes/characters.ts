import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const { role } = req.query;

    const where: any = {};
    if (role) {
      where.role = role;
    }

    const characters = await prisma.character.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      status: 'success',
      data: characters,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: {
        turns: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found',
      });
    }

    res.json({
      status: 'success',
      data: character,
    });
  } catch (err) {
    next(err);
  }
});

export { router as characterRouter };
