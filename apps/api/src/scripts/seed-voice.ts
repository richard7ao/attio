/* eslint-disable no-console */
/**
 * Seed a few voice_calls + voice_transcript_segments rows into Supabase so the
 * /calls page has something to show before any real calls are placed.
 *
 *   pnpm --filter @attio/api seed:voice
 *
 * Idempotent-ish: it always inserts new rows (calls are append-only by design).
 * Run once for a demo; re-run to add more.
 */
import { config as loadEnv } from 'dotenv';
import { sql } from 'drizzle-orm';
import { createDb, getDatabaseDriver, type PostgresDb } from '@attio/db';

loadEnv({ path: ['../../.env', '.env'] });

interface Seg {
  speaker: 'agent' | 'customer' | 'system';
  text: string;
}

interface SeedCall {
  accountName: string;
  contactName: string;
  toNumber: string;
  goal: string;
  status: 'completed' | 'in_progress' | 'no_answer';
  disposition?: string;
  summary?: string;
  nextAction?: string;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
  segments: Seg[];
}

const now = Date.now();
const mins = (m: number) => new Date(now - m * 60_000);

const SEED: SeedCall[] = [
  {
    accountName: 'Northwind Logistics',
    contactName: 'Priya',
    toNumber: '+14155550142',
    goal: 'Secure the annual renewal and pitch the Scale tier (adds SSO + advanced analytics).',
    status: 'completed',
    disposition: 'upsell_agreed',
    summary:
      'Priya confirmed renewal interest and agreed to move to the Scale tier for SSO. Sending a quote today and a Tuesday demo invite for her team.',
    nextAction: 'Send Scale-tier quote + calendar invite for Tuesday walkthrough.',
    startedAt: mins(180),
    endedAt: mins(178),
    durationMs: 132_000,
    segments: [
      { speaker: 'agent', text: 'Hi, is this Priya? This is Alex from Attio — do you have a quick minute?' },
      { speaker: 'customer', text: 'Sure, I’ve got a couple of minutes. What’s this about?' },
      { speaker: 'agent', text: 'I’m reaching out about your Northwind Logistics account — your renewal is coming up and I noticed your team’s usage has been climbing. Wanted to check in before it lapses.' },
      { speaker: 'customer', text: 'Yeah, we’ve added a bunch of people recently. Honestly I wasn’t sure we were on the right plan anymore.' },
      { speaker: 'agent', text: 'That’s exactly why I called. Let me pull up your current numbers so I give you accurate info.' },
      { speaker: 'agent', text: 'Okay — you’re on Growth annual with 45 seats, renewal July 15. You’ve added 12 users in May, so you’re actually over your seat band.' },
      { speaker: 'customer', text: 'That makes sense. The Scale tier with SSO would actually solve a problem we’ve been having.' },
      { speaker: 'agent', text: 'Great — I’ll send over a quote for the annual Scale plan today and hold your current pricing. Does it make sense to grab 20 minutes with your team next week to walk through it?' },
      { speaker: 'customer', text: 'Yeah, let’s do Tuesday. Send the quote and a calendar invite.' },
      { speaker: 'agent', text: 'Done. I’ll get that over within the hour. Thanks for the time, Priya — talk Tuesday.' },
    ],
  },
  {
    accountName: 'Acme Robotics',
    contactName: 'Daniel',
    toNumber: '+14155550188',
    goal: 'Re-engage a cooling account before renewal; understand blockers, offer a success review.',
    status: 'completed',
    disposition: 'callback_scheduled',
    summary:
      'Daniel flagged two unresolved support escalations as the main blocker. Scheduled a success review for Thursday and promised to chase the open tickets internally.',
    nextAction: 'Confirm Thursday success review + loop in support on the two open tickets.',
    startedAt: mins(320),
    endedAt: mins(317),
    durationMs: 198_000,
    segments: [
      { speaker: 'agent', text: 'Hi Daniel, Alex from Attio. I’m reaching out ahead of your July 2 renewal — how are things going?' },
      { speaker: 'customer', text: 'Honestly, not great. We’ve had two support tickets open for weeks and nobody’s gotten back to us.' },
      { speaker: 'agent', text: 'That’s on us — I’m sorry. Let me get those escalated today. Walk me through what’s blocking you?' },
      { speaker: 'customer', text: 'The SSO mapping keeps breaking for new hires, and our export job has been failing intermittently.' },
      { speaker: 'agent', text: 'Got it. I’ll file both as P1 with our support lead and loop you in. Would a 30-minute success review Thursday help us get ahead of the renewal?' },
      { speaker: 'customer', text: 'Yeah, Thursday works. If those tickets get unstuck I’m comfortable renewing.' },
      { speaker: 'agent', text: 'Perfect — I’ll send the invite and a status update on both tickets by EOD. Thanks, Daniel.' },
    ],
  },
  {
    accountName: 'Globex Corp',
    contactName: 'Sara',
    toNumber: '+14155550203',
    goal: 'Renewal confirmation + introduce the new analytics package.',
    status: 'no_answer',
    disposition: 'no_answer',
    summary: 'No answer after 6 rings; left a voicemail referencing the upcoming renewal.',
    nextAction: 'Retry Thursday morning; send a follow-up email with renewal link.',
    startedAt: mins(60),
    endedAt: mins(59),
    durationMs: 24_000,
    segments: [
      { speaker: 'agent', text: 'Hi Sara, this is Alex from Attio following up on your upcoming renewal. Give me a call back when you have a moment — I also sent the details over email. Thanks!' },
    ],
  },
  {
    accountName: 'Initech',
    contactName: 'Bill',
    toNumber: '+14155550310',
    goal: 'Live renewal call — confirm terms and capture expansion needs.',
    status: 'in_progress',
    startedAt: mins(2),
    segments: [
      { speaker: 'agent', text: 'Hi Bill, Alex from Attio. Do you have a few minutes to talk through your renewal?' },
      { speaker: 'customer', text: 'Sure — we’re mostly happy, just want to make sure pricing holds for another year.' },
      { speaker: 'agent', text: 'Completely understand. Your current pricing is locked through the renewal — let me confirm the terms on my end…' },
    ],
  },
];

async function main(): Promise<void> {
  if (getDatabaseDriver() !== 'postgres') {
    console.error('Seed requires DATABASE_DRIVER=postgres (Supabase).');
    process.exit(1);
  }
  const db = (await createDb()) as unknown as PostgresDb;

  // Use the demo user that voice.sql guarantees exists.
  const userId = process.env.DEMO_USER_ID ?? '00000000-0000-0000-0000-000000000001';

  let inserted = 0;
  for (const c of SEED) {
    const [row] = (await db.execute(sql`
      insert into public.voice_calls
        (user_id, account_name, contact_name, to_number, goal,
         status, disposition, summary, next_action,
         started_at, ended_at, duration_ms, call_end_reason, provider)
      values
        (${userId}, ${c.accountName}, ${c.contactName}, ${c.toNumber}, ${c.goal},
         ${c.status}::public.voice_call_status,
         ${c.disposition ?? null}::public.voice_disposition,
         ${c.summary ?? null}, ${c.nextAction ?? null},
         ${c.startedAt.toISOString()}, ${c.endedAt?.toISOString() ?? null},
         ${c.durationMs ?? null},
         ${c.status === 'no_answer' ? 'no_answer' : c.status === 'completed' ? 'normal' : null},
         'slng')
      returning id
    `)) as Array<{ id: string }>;
    const callId = row!.id;

    for (let i = 0; i < c.segments.length; i++) {
      const s = c.segments[i]!;
      await db.execute(sql`
        insert into public.voice_transcript_segments
          (call_id, seq, speaker, text, is_final, ts_ms)
        values
          (${callId}, ${i}, ${s.speaker}::public.voice_speaker, ${s.text}, true,
           ${i * 4000})
      `);
    }
    inserted++;
    console.log(`  ✓ ${c.accountName} — ${c.status} (${c.segments.length} segments) → ${callId}`);
  }

  console.log(`\nSeeded ${inserted} voice calls.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
