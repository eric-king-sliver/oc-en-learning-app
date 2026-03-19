import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/friends', async (req: AuthRequest, res, next) => {
  try {
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { requesterId: req.userId },
          { addresseeId: req.userId },
        ],
        status: 'accepted',
      },
      include: {
        requester: {
          select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
        },
        addressee: {
          select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
        },
      },
    });

    const friends = friendships.map((f) =>
      f.requesterId === req.userId ? f.addressee : f.requester
    );

    res.json({
      status: 'success',
      data: friends,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/friends/requests', async (req: AuthRequest, res, next) => {
  try {
    const requests = await prisma.friend.findMany({
      where: {
        addresseeId: req.userId,
        status: 'pending',
      },
      include: {
        requester: {
          select: { id: true, displayName: true, avatarUrl: true, currentProficiency: true },
        },
      },
    });

    res.json({
      status: 'success',
      data: requests.map((r) => r.requester),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/request/:userId', async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.userId) {
      throw new AppError('Cannot send friend request to yourself', 400);
    }

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: userId },
          { requesterId: userId, addresseeId: req.userId },
        ],
      },
    });

    if (existing) {
      throw new AppError('Friend request already exists', 400);
    }

    const friend = await prisma.friend.create({
      data: {
        requesterId: req.userId!,
        addresseeId: userId,
        status: 'pending',
      },
    });

    res.status(201).json({
      status: 'success',
      data: friend,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/accept/:userId', async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    const request = await prisma.friend.findFirst({
      where: {
        requesterId: userId,
        addresseeId: req.userId,
        status: 'pending',
      },
    });

    if (!request) {
      throw new AppError('Friend request not found', 404);
    }

    await prisma.friend.update({
      where: { id: request.id },
      data: { status: 'accepted' },
    });

    res.json({
      status: 'success',
      message: 'Friend request accepted',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/friends/decline/:userId', async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    const request = await prisma.friend.findFirst({
      where: {
        requesterId: userId,
        addresseeId: req.userId,
        status: 'pending',
      },
    });

    if (!request) {
      throw new AppError('Friend request not found', 404);
    }

    await prisma.friend.delete({
      where: { id: request.id },
    });

    res.json({
      status: 'success',
      message: 'Friend request declined',
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/friends/:userId', async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;

    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: userId },
          { requesterId: userId, addresseeId: req.userId },
        ],
        status: 'accepted',
      },
    });

    if (!friendship) {
      throw new AppError('Friendship not found', 404);
    }

    await prisma.friend.delete({
      where: { id: friendship.id },
    });

    res.json({
      status: 'success',
      message: 'Friend removed',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', async (req: AuthRequest, res, next) => {
  try {
    const { limit = '10' } = req.query;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        currentProficiency: true,
        _count: {
          select: {
            sessions: { where: { completedAt: { not: null } } },
            achievements: true,
          },
        },
      },
      orderBy: {
        sessions: {
          _count: 'desc',
        },
      },
      take: parseInt(limit as string),
    });

    res.json({
      status: 'success',
      data: users.map((u, index) => ({
        rank: index + 1,
        userId: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        proficiency: u.currentProficiency,
        completedSessions: u._count.sessions,
        achievements: u._count.achievements,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/share/:scenarioId', async (req: AuthRequest, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { score, note } = req.body;

    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_scenarioId: {
          userId: req.userId!,
          scenarioId,
        },
      },
    });

    if (!progress) {
      throw new AppError('No progress found for this scenario', 404);
    }

    const shared = await prisma.sharedProgress.create({
      data: {
        userId: req.userId!,
        scenarioId,
        score: score || progress.bestScore || 0,
        note,
        isPublic: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: shared,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/share/:scenarioId', async (req: AuthRequest, res, next) => {
  try {
    const { scenarioId } = req.params;

    const shares = await prisma.sharedProgress.findMany({
      where: {
        scenarioId,
        isPublic: true,
      },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { score: 'desc' },
      take: 20,
    });

    res.json({
      status: 'success',
      data: shares,
    });
  } catch (err) {
    next(err);
  }
});

export { router as socialRouter };
