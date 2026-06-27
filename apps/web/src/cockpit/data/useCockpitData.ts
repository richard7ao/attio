import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { buildAccountVM } from '../domain/account.js';
import { type AccountVM, type FeedSeed } from '../domain/types.js';
import {
  mapEscalationsToFeed,
  mapLiveAccounts,
  type ChurnRow,
  type EscalationRow,
  type OpportunityRow,
} from './mappers.js';
import { SEED_ACCOUNTS, SEED_FEED, SEED_NOW } from './seed.js';

export type DataSource = 'live' | 'seed';

export interface CockpitData {
  accounts: AccountVM[];
  feed: FeedSeed[];
  source: DataSource;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Fetch wrapper that degrades to a fallback instead of throwing (gaps are expected). */
async function safe<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await api<{ data: T }>(path);
    return res.data ?? fallback;
  } catch {
    return fallback;
  }
}

const seedAccounts = (): AccountVM[] =>
  SEED_ACCOUNTS.map((input, i) => buildAccountVM(input, SEED_NOW, i));

/**
 * Loads the cockpit dataset. Prefers the live Fastify API
 * (companies/churn + triage/opportunity + escalations); when nothing is synced
 * yet it falls back to the seed dataset so the cockpit is always populated.
 */
export function useCockpitData(): CockpitData {
  const [state, setState] = useState<Omit<CockpitData, 'refresh'>>({
    accounts: seedAccounts(),
    feed: SEED_FEED,
    source: 'seed',
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [churn, opportunity, escalations] = await Promise.all([
        safe<ChurnRow[]>('/companies/churn', []),
        safe<OpportunityRow[]>('/triage/opportunity', []),
        safe<EscalationRow[]>('/escalations', []),
      ]);

      const inputs = mapLiveAccounts(churn, opportunity);
      if (inputs.length === 0) {
        setState({ accounts: seedAccounts(), feed: SEED_FEED, source: 'seed', loading: false, error: null });
        return;
      }

      const now = new Date();
      const accounts = inputs.map((input, i) => buildAccountVM(input, now, i));
      const nameById = new Map(accounts.map((a) => [a.id, a.name]));
      const liveFeed = mapEscalationsToFeed(escalations, nameById);
      setState({
        accounts,
        feed: liveFeed.length > 0 ? liveFeed : SEED_FEED,
        source: 'live',
        loading: false,
        error: null,
      });
    } catch (err) {
      // Total failure (e.g. API down) — keep the seed dataset, surface the error.
      setState({
        accounts: seedAccounts(),
        feed: SEED_FEED,
        source: 'seed',
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}

/** Acknowledge a live escalation (no-op for seed feed items). */
export async function ackEscalation(escalationId: string): Promise<void> {
  await api(`/escalations/${escalationId}/ack`, { method: 'POST' });
}

/**
 * Dispatch a voice call via the backend (placeholder route today).
 * Swallows errors so the optimistic UI/toast still flows.
 */
export async function placeVoiceCall(companyId: string): Promise<void> {
  try {
    await api('/voice/call', { method: 'POST', body: JSON.stringify({ companyId }) });
  } catch {
    // TODO(api): /voice/call is a stub; ignore until Twilio is wired server-side.
  }
}
