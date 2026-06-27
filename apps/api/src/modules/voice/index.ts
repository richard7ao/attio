import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDatabaseDriver, type PostgresDb } from '@attio/db';

/**
 * The voice tables are Postgres-only. The onRequest hook below rejects non-pg
 * drivers, so inside handlers we can safely narrow `app.db` to the Postgres
 * client (which exposes `execute` for raw SQL).
 */
function pg(app: FastifyInstance): PostgresDb {
  return app.db as unknown as PostgresDb;
}

/**
 * Voice call transcripts.
 *
 * The voice_calls + voice_transcript_segments tables are owned by the SLNG
 * voice service (see packages/db/supabase/voice.sql) and live in Supabase
 * alongside the Drizzle-managed core schema. They are intentionally NOT modelled
 * in the Drizzle schema (additive, voice-service-owned), so we read them with
 * raw SQL through the shared Drizzle client.
 *
 *   GET /api/voice/calls            — recent calls (newest first)
 *   GET /api/voice/calls/:id        — one call + full transcript
 *   GET /api/voice/calls/:id/stream — SSE: replay transcript, then poll the DB
 *                                     for new segments / status until the call
 *                                     reaches a terminal state (live observe)
 */
export async function voiceRoutes(app: FastifyInstance): Promise<void> {
  // The voice schema is Postgres-only (Supabase). Refuse on sqlite so the
  // caller gets a clear message instead of a missing-table error.
  app.addHook('onRequest', async (_req, reply) => {
    if (getDatabaseDriver() !== 'postgres') {
      return reply.badGateway('Voice transcripts require DATABASE_DRIVER=postgres (Supabase).');
    }
  });

  // --- GET /voice/calls -----------------------------------------------------
  app.get('/voice/calls', async () => {
    const rows = await pg(app).execute(sql`
      select
        c.id,
        c.account_id,
        c.account_name,
        c.contact_name,
        c.to_number,
        c.from_number,
        c.goal,
        c.provider,
        c.provider_call_id,
        c.status,
        c.disposition,
        c.summary,
        c.next_action,
        c.recording_url,
        c.started_at,
        c.ended_at,
        c.duration_ms,
        c.created_at,
        c.updated_at,
        ( select count(*)::int from public.voice_transcript_segments s
            where s.call_id = c.id ) as segment_count,
        ( select s2.text from public.voice_transcript_segments s2
            where s2.call_id = c.id
            order by s2.seq desc
            limit 1 ) as last_segment_text
      from public.voice_calls c
      order by c.created_at desc
      limit 100
    `);
    return { data: rows };
  });

  // --- GET /voice/calls/:id -------------------------------------------------
  app.get('/voice/calls/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [call] = await pg(app).execute(sql`
      select * from public.voice_calls where id = ${id}
    `);
    if (!call) return reply.notFound('Unknown call');
    const segments = await pg(app).execute(sql`
      select id, call_id, seq, speaker, text, is_final, ts_ms, created_at
      from public.voice_transcript_segments
      where call_id = ${id}
      order by seq asc
    `);
    return { call, transcript: segments };
  });

  // --- GET /voice/calls/:id/stream (SSE) ------------------------------------
  //
  // The voice service has an in-process pub/sub for live segments, but the API
  // doesn't share that process. Instead we poll the DB every 2s for new
  // segments / status changes and push them as SSE events. When the call
  // reaches a terminal state we emit a final `ended` event and close.
  app.get('/voice/calls/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string };
    const raw = reply.raw;

    const [call] = await pg(app).execute(sql`
      select id, status from public.voice_calls where id = ${id}
    `);
    if (!call) {
      raw.writeHead(404, { 'Content-Type': 'application/json' });
      raw.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': request.headers.origin ?? '*',
    });
    const write = (event: string, data: unknown) =>
      raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    const TERMINAL = new Set([
      'completed',
      'no_answer',
      'voicemail',
      'failed',
      'canceled',
    ]);

    let lastStatus = call.status as string;
    let maxSeq = -1;
    write('status', { status: lastStatus });

    // Replay existing transcript.
    const existing = (await pg(app).execute(sql`
      select id, call_id, seq, speaker, text, is_final, ts_ms, created_at
      from public.voice_transcript_segments
      where call_id = ${id}
      order by seq asc
    `)) as Array<{ seq: number }>;
    for (const seg of existing) {
      write('segment', seg);
      if (seg.seq > maxSeq) maxSeq = seg.seq;
    }

    let closed = false;
    request.raw.on('close', () => {
      closed = true;
    });

    const tick = async () => {
      if (closed) return;
      try {
        const [cur] = (await pg(app).execute(sql`
          select status, disposition, summary, next_action
          from public.voice_calls where id = ${id}
        `)) as Array<{ status: string; disposition?: string; summary?: string; next_action?: string }>;

        if (cur && cur.status !== lastStatus) {
          lastStatus = cur.status;
          write('status', { status: lastStatus });
        }

        const newSegs = (await pg(app).execute(sql`
          select id, call_id, seq, speaker, text, is_final, ts_ms, created_at
          from public.voice_transcript_segments
          where call_id = ${id} and seq > ${maxSeq}
          order by seq asc
        `)) as Array<{ seq: number }>;
        for (const seg of newSegs) {
          write('segment', seg);
          if (seg.seq > maxSeq) maxSeq = seg.seq;
        }

        if (cur && TERMINAL.has(cur.status)) {
          write('ended', {
            status: cur.status,
            disposition: cur.disposition,
            summary: cur.summary,
            nextAction: cur.next_action,
          });
          raw.end();
          return;
        }
      } catch {
        // transient db error — keep the stream open and retry next tick
      }
      setTimeout(tick, 2000);
    };

    setTimeout(tick, 2000);
    // Keep the reply open; Fastify should not auto-close it.
    return reply;
  });
}
