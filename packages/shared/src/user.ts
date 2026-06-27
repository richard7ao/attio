import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'csm', 'viewer']);
export type UserRole = z.infer<typeof userRoleSchema>;

/** App-level profile that mirrors the Supabase `auth.users` row. */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1).nullable(),
  avatarUrl: z.string().url().nullable(),
  role: userRoleSchema.default('csm'),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;
