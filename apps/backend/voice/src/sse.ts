import type { Response } from "express";
import { log } from "./logger.js";

/**
 * In-memory pub/sub for live call updates. Keyed by call id. Good enough for a
 * single-instance hackathon demo; swap for Redis pub/sub if we ever scale out.
 */
type Client = { res: Response };
const channels = new Map<string, Set<Client>>();

export function subscribe(callId: string, res: Response): () => void {
  let set = channels.get(callId);
  if (!set) {
    set = new Set();
    channels.set(callId, set);
  }
  const client: Client = { res };
  set.add(client);
  log.debug({ callId, subscribers: set.size }, "sse subscribe");

  return () => {
    set?.delete(client);
    if (set && set.size === 0) channels.delete(callId);
  };
}

/** Push a named event to everyone watching a call. */
export function publish(callId: string, event: string, data: unknown): void {
  const set = channels.get(callId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const { res } of set) {
    try {
      res.write(payload);
    } catch (err) {
      log.warn({ err, callId }, "sse write failed");
    }
  }
}
