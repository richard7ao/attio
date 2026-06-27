import { deriveHealth, HEALTH_LABEL, signalDirection, signalSeverity, signalWeight, SIGNAL_TIMELINE, type HealthTier } from './health.js';
import { fmtArr, renewalDateLabel } from './format.js';
import { type AccountInput, type AccountSignal, type AccountVM, type TimelineEntry } from './types.js';

function classifySignals(input: AccountInput['signals']): AccountSignal[] {
  return input.map((s) => ({
    ...s,
    direction: signalDirection(s.type),
    severity: signalSeverity(s.type),
    weight: signalWeight(s.type),
  }));
}

/** Reconstruct the comms-history timeline for an account (agent action, signals, reminders, sync). */
function buildTimeline(account: {
  health: HealthTier;
  owner: string;
  signals: AccountSignal[];
  contact: { name: string };
  arrLabel: string;
  seats: number;
}): TimelineEntry[] {
  const firstName = account.contact.name.split(' ')[0];
  const items: TimelineEntry[] = [];

  if (account.health === 'red') {
    items.push({
      channel: 'voice',
      title: 'Outbound call · Action Agent',
      time: 'Today · 09:12',
      body: 'AI voice agent left a check-in voicemail and flagged the account for owner follow-up. Confidence 0.82.',
      actor: 'Action Agent',
    });
  } else if (account.health === 'green') {
    items.push({
      channel: 'email',
      title: 'Expansion proposal sent',
      time: 'Today · 08:40',
      body: `Generated upsell email dispatched via n8n. Awaiting reply from ${firstName}.`,
      actor: 'Action Agent',
    });
  } else {
    items.push({
      channel: 'note',
      title: 'Flagged for investigation',
      time: 'Today · 10:05',
      body: `Routed to ${account.owner} for a manual review of recent activity.`,
      actor: 'Action Agent',
    });
  }

  for (const s of account.signals) {
    const meta = SIGNAL_TIMELINE[s.type];
    items.push({ channel: meta.channel, title: meta.title, time: s.detected, body: `${s.note}.`, actor: meta.actor });
  }

  items.push({
    channel: 'sms',
    title: 'SMS reminder sent',
    time: '2d ago',
    body: `Renewal reminder texted to ${firstName}.`,
    actor: account.owner,
  });
  items.push({
    channel: 'attio',
    title: 'Imported from Attio',
    time: 'On sync',
    body: `Record flipped to customer · ${account.arrLabel} ARR · ${account.seats} seats.`,
    actor: 'System',
  });
  const lastEntry = items[items.length - 1];
  if (lastEntry) lastEntry.last = true;
  return items;
}

/**
 * Build a full account view model from raw input. `now` anchors the renewal
 * date math and `attioSeq` produces the synthetic Attio record id.
 */
export function buildAccountVM(input: AccountInput, now: Date, attioSeq: number): AccountVM {
  const signals = classifySignals(input.signals);
  const health = deriveHealth(signals.map((s) => s.type));
  const seatPct = input.seats > 0 ? Math.round((input.seatsUsed / input.seats) * 100) : 0;
  const first = input.usage[0] ?? 0;
  const last = input.usage[input.usage.length - 1] ?? 0;
  const growth = first ? Math.round(((last - first) / first) * 100) : 0;
  const arrLabel = fmtArr(input.arr);

  const base = {
    id: input.id,
    name: input.name,
    domain: input.domain,
    owner: input.owner,
    arr: input.arr,
    seats: input.seats,
    seatsUsed: input.seatsUsed,
    renewalDays: input.renewalDays,
    expansion: input.expansion,
    usage: input.usage,
    health,
    arrLabel,
    mrrSub: 'MRR $' + Math.round(input.arr / 12).toLocaleString(),
    seatPct,
    seatPctLabel: seatPct + '%',
    seatLabel: input.seatsUsed + ' / ' + input.seats,
    signals,
    signalLine: signals[0]?.note ?? 'No active signals',
    healthLabel: HEALTH_LABEL[health],
    renewalShort: input.renewalDays + 'd',
    renewalLabel: 'renew ' + input.renewalDays + 'd',
    renewalDate: renewalDateLabel(input.renewalDays, now),
    attio: 'ATT-' + (1042 + attioSeq),
    contact: input.contact,
    usageDelta: (growth >= 0 ? '+' : '') + growth + '%',
    usageDir: (growth > 1 ? 'up' : growth < -1 ? 'down' : 'flat') as AccountVM['usageDir'],
  };

  return { ...base, timeline: buildTimeline(base) };
}
