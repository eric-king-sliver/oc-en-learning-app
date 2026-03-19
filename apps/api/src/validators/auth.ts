import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase and number'
    ),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Display name can only contain letters, numbers and underscores'),
  nativeLanguage: z.string().max(10).optional().default('zh-CN'),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase and number'
    ),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  nativeLanguage: z.string().max(10).optional(),
  preferredSessionDuration: z.number().int().min(5).max(60).optional(),
  dailyGoalMinutes: z.number().int().min(5).max(120).optional(),
  notificationEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  learningGoals: z.array(z.string()).optional(),
  targetProficiency: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
