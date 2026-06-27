import { z } from 'zod';

/** Channel an outreach was sent through. */
export const outreachChannelSchema = z.enum(['email', 'voice', 'sms', 'n8n', 'attio']);
export type OutreachChannel = z.infer<typeof outreachChannelSchema>;

export const outreachDirectionSchema = z.enum(['inbound', 'outbound']);
export type OutreachDirection = z.infer<typeof outreachDirectionSchema>;

export const outreachStatusSchema = z.enum(['queued', 'sent', 'delivered', 'failed', 'replied']);
export type OutreachStatus = z.infer<typeof outreachStatusSchema>;

/** Was this reach-out handled by an AI agent or escalated to a human CSM? */
export const outreachActorSchema = z.enum(['agent', 'csm']);
export type OutreachActor = z.infer<typeof outreachActorSchema>;

/** All transactions & messaging, scoped to a user via userId. */
export const outreachSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  channel: outreachChannelSchema,
  direction: outreachDirectionSchema,
  actor: outreachActorSchema.default('agent'),
  status: outreachStatusSchema.default('queued'),
  subject: z.string().nullable(),
  body: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type Outreach = z.infer<typeof outreachSchema>;
