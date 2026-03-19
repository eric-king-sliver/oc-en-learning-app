import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const scenarioFilterSchema = z.object({
  category: z
    .enum(['daily_conversation', 'business', 'travel', 'social', 'interview', 'academic'])
    .optional(),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  locale: z.string().max(10).optional(),
  search: z.string().max(100).optional(),
});

export const startSessionSchema = z.object({
  scenarioId: z.string().uuid('Invalid scenario ID'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type ScenarioFilterInput = z.infer<typeof scenarioFilterSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
