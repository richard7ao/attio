import { z } from 'zod';

/** A customer account imported from Attio CRM. */
export const accountSchema = z.object({
  id: z.string().uuid(),
  /** Owning CSM — FK to users.id. */
  ownerId: z.string().uuid(),
  /** External id in Attio, used for sync/dedupe. */
  attioRecordId: z.string().nullable(),
  name: z.string().min(1),
  domain: z.string().nullable(),
  mrr: z.number().nonnegative().default(0),
  seats: z.number().int().nonnegative().default(0),
  seatsUsed: z.number().int().nonnegative().default(0),
  renewalDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Account = z.infer<typeof accountSchema>;
