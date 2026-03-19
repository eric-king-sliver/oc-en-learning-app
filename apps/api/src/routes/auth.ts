import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth';
import { AppError } from '../middleware/errorHandler';
import { ZodError } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

function formatZodError(error: ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new AppError('Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        nativeLanguage: data.nativeLanguage,
      },
    });

    const emailVerificationToken = uuidv4();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: emailVerificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    console.log(`[DEV] Email verification token for ${user.email}: ${emailVerificationToken}`);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          nativeLanguage: user.nativeLanguage,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
        emailVerificationToken,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new AppError('Invalid verification token', 400);
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new AppError('Verification token has expired', 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    res.json({
      status: 'success',
      message: 'Email verified successfully',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.accountStatus !== 'active') {
      throw new AppError('Account is suspended or deleted', 403);
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          nativeLanguage: user.nativeLanguage,
          currentProficiency: user.currentProficiency,
          emailVerified: user.emailVerified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const data = refreshTokenSchema.parse(req.body);

    const decoded = jwt.verify(data.refreshToken, JWT_SECRET) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, accountStatus: true },
    });

    if (!user || user.accountStatus !== 'active') {
      throw new AppError('User not found or inactive', 401);
    }

    const { accessToken, refreshToken } = generateTokens(decoded.userId);

    res.json({
      status: 'success',
      data: { accessToken, refreshToken },
    });
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid refresh token', 401));
    } else if (err instanceof ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.json({
        status: 'success',
        message: 'If the email exists, a reset link has been sent',
      });
    }

    const resetToken = uuidv4();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    console.log(`[DEV] Password reset token for ${user.email}: ${resetToken}`);

    res.json({
      status: 'success',
      message: 'If the email exists, a reset link has been sent',
    });
  } catch (err) {
    if (err instanceof ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: data.resetToken },
      include: { user: true },
    });

    if (!resetTokenRecord) {
      throw new AppError('Invalid reset token', 400);
    }

    if (resetTokenRecord.usedAt) {
      throw new AppError('Reset token has already been used', 400);
    }

    if (resetTokenRecord.expiresAt < new Date()) {
      throw new AppError('Reset token has expired', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({
      status: 'success',
      message: 'Password reset successfully',
    });
  } catch (err) {
    if (err instanceof ZodError) {
      next(new AppError(formatZodError(err), 400));
    } else {
      next(err);
    }
  }
});

router.post('/logout', (_req, res) => {
  res.json({ status: 'success', message: 'Logged out' });
});

export { router as authRouter };
