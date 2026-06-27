import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountRow, Avatar, FilterChip, Icon, StatCard } from '../../design-system/index.js';
import { fmtArr, renewalColor } from '../domain/format.js';
import { signalDirection } from '../domain/health.js';
import { type BoardTier } from '../domain/health.js';
import { type AccountVM } from '../domain/types.js';
import { useCockpit } from '../state/CockpitProvider.js';
import { AgentPanel } from './AgentPanel.js';

type Filter = 'all' | BoardTier;

const COLUMN_META: Record<BoardTier, { title: string; dot: string; soft: string; border: string; text: string }> = {
  red: { title: 'Red - Churn Risk', dot: 'var(--rag-red)', soft: 'var(--rag-red-soft)', border: 'var(--rag-red-border)', text: 'var(--rag-red-text)' },
  amber: { title: 'Amber - Investigate', dot: 'var(--rag-amber)', soft: 'var(--rag-amber-soft)', border: 'var(--rag-amber-border)', text: 'var(--rag-amber-text)' },
  green: { title: 'Green - Healthy', dot: 'var(--rag-green)', soft: 'var(--rag-green-soft)', border: 'var(--rag-green-border)', text: 'var(--rag-green-text)' },
  pending: { title: 'Pending - Awaiting Renewal', dot: 'var(--accent)', soft: 'var(--accent-soft)', border: 'var(--accent-border)', text: 'var(--accent-text)' },
};
const TIERS: BoardTier[] = ['red', 'amber', 'green', 'pending'];

export function DashboardPage() {
  const { accounts, visibleAccounts, tierOf, moveTo, agentOpen, setAgentOpen, triageCount } = useCockpit();
  const [filter, setFilter] = useState<Filter>('all');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<BoardTier | null>(null);

  const inTier = (tier: BoardTier, list: AccountVM[]) => list.filter((a) => tierOf(a) === tier);
  const counts = {
    red: inTier('red', visibleAccounts).length,
    amber: inTier('amber', visibleAccounts).length,
    green: inTier('green', visibleAccounts).length,
    pending: inTier('pending', visibleAccounts).length,
  };
  const arrAtRisk = fmtArr(inTier('red', accounts).reduce((t, a) => t + a.arr, 0));
  const upsell = fmtArr(accounts.reduce((t, a) => t + a.expansion, 0));
  const oppCount = accounts.reduce((t, a) => t + a.signals.filter((s) => signalDirection(s.type) === 'opportunity').length, 0);

  const shownTiers = TIERS.filter((t) => filter === 'all' || filter === t);
  const cols = filter === 'all' ? 4 : 1;

  const onDrop = (tier: BoardTier) => {
    if (dragId) moveTo(dragId, tier);
    setDragId(null);
    setDragOver(null);
  };

  return (
    <div style={{ maxWidth: 1700, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="ARR at Risk" value={arrAtRisk} delta="12% from last cycle" deltaDir="up" tone="red" icon={<Icon name="shield-alert" size={14} />} />
        <StatCard label="Upsell Pipeline" value={upsell} sub={`${oppCount} high-intent signals`} tone="green" icon={<Icon name="trending-up" size={14} />} />
        <StatCard label="Active Triage" value={String(triageCount)} sub="AI + human queue" tone="accent" icon={<Icon name="radar" size={14} />} />
        <StatCard label="Calls Dispatched · 7d" value="37" sub="via Sling + Twilio" icon={<Icon name="phone-outgoing" size={14} />} />
      </div>

      <div>
        <h2 style={{ margin: 0, font: 'var(--type-h2)', color: 'var(--text-primary)' }}>Account Health Pipeline</h2>
        <p style={{ margin: '4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>
          RAG triage · {accounts.length} accounts imported from Attio
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: -4 }}>
        <FilterChip active={filter === 'all'} count={visibleAccounts.length} onClick={() => setFilter('all')}>All accounts</FilterChip>
        <FilterChip active={filter === 'red'} dot="red" count={counts.red} onClick={() => setFilter('red')}>Churn Risk</FilterChip>
        <FilterChip active={filter === 'amber'} dot="amber" count={counts.amber} onClick={() => setFilter('amber')}>Investigate</FilterChip>
        <FilterChip active={filter === 'green'} dot="green" count={counts.green} onClick={() => setFilter('green')}>Healthy</FilterChip>
        <FilterChip active={filter === 'pending'} count={counts.pending} onClick={() => setFilter('pending')}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
          Pending
        </FilterChip>
        <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 6, font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>
          <Icon name="grip-vertical" size={13} />
          DRAG TO RECLASSIFY
        </span>
      </div>

      <div style={{ display: 'flex', gap: agentOpen ? 14 : 18, alignItems: 'flex-start' }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'grid',
            // minmax(0, 1fr) lets all columns compress to share the row evenly, so the
            // Agent panel never forces a horizontal scrollbar or clips the Pending column.
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: agentOpen ? 10 : 12,
            alignItems: 'start',
          }}
        >
          {shownTiers.map((tier) => (
            <BoardColumn
              key={tier}
              tier={tier}
              accounts={inTier(tier, visibleAccounts)}
              over={dragOver === tier}
              onDragStart={(id) => setDragId(id)}
              onDragOver={() => setDragOver((t) => (t === tier ? t : tier))}
              onDrop={() => onDrop(tier)}
              onDragEnd={() => {
                setDragId(null);
                setDragOver(null);
              }}
            />
          ))}
        </div>

        {agentOpen ? <AgentPanel /> : null}
      </div>

      {!agentOpen ? (
        <button
          onClick={() => setAgentOpen(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 48,
            padding: '0 18px 0 14px',
            border: 'none',
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            boxShadow: '0 14px 34px -8px rgba(76,141,255,0.55)',
            cursor: 'pointer',
            font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)',
          }}
        >
          <Icon name="bot" size={20} />
          <span>Action Agent</span>
          <span style={{ minWidth: 20, height: 20, padding: '0 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'rgba(6,18,31,0.22)', font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-mono)' }}>
            {triageCount}
          </span>
        </button>
      ) : null}
    </div>
  );
}

interface BoardColumnProps {
  tier: BoardTier;
  accounts: AccountVM[];
  over: boolean;
  onDragStart: (id: string) => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function BoardColumn({ tier, accounts, over, onDragStart, onDragOver, onDrop, onDragEnd }: BoardColumnProps) {
  const meta = COLUMN_META[tier];
  const arr = accounts.length ? fmtArr(accounts.reduce((t, a) => t + a.arr, 0)) : '';
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      style={{
        borderRadius: 14,
        padding: 7,
        transition: 'background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        background: over ? meta.soft : 'transparent',
        boxShadow: `inset 0 0 0 1.5px ${over ? meta.border : 'transparent'}`,
      }}
    >
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.dot, boxShadow: `0 0 0 3px ${meta.soft}`, flex: 'none' }} />
          <h3 style={{ margin: 0, font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)', color: meta.text, letterSpacing: 'var(--tracking-snug)' }}>{meta.title}</h3>
          <span style={{ marginLeft: 'auto', font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            {accounts.length}
            {arr ? ` · ${arr}` : ''}
          </span>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accounts.map((a) => (
            <DraggableCard key={a.id} account={a} tier={tier} onDragStart={onDragStart} onDragEnd={onDragEnd} />
          ))}
          {accounts.length === 0 ? <EmptyDropZone tier={tier} /> : null}
        </div>
      </section>
    </div>
  );
}

function DraggableCard({ account, tier, onDragStart, onDragEnd }: { account: AccountVM; tier: BoardTier; onDragStart: (id: string) => void; onDragEnd: () => void }) {
  const navigate = useNavigate();
  const open = () => navigate(`/account/${account.id}`);
  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      try {
        e.dataTransfer.setData('text/plain', account.id);
        e.dataTransfer.effectAllowed = 'move';
      } catch {
        // ignore
      }
      onDragStart(account.id);
    },
    onDragEnd,
    style: { cursor: 'grab' as const },
  };

  if (tier === 'pending') {
    return (
      <div {...dragProps}>
        <div
          onClick={open}
          style={{ position: 'relative', background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--edge-light)', padding: '12px 13px 12px 15px', overflow: 'hidden', cursor: 'pointer' }}
        >
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>{account.name}</span>
            <span style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{account.arrLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)' }}>{account.signalLine}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
            <Avatar name={account.owner} size={20} />
            <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>{account.owner}</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: renewalColor(account.renewalDays), fontVariantNumeric: 'tabular-nums' }}>
              <Icon name="calendar-clock" size={12} />
              renew {account.renewalDays}d
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...dragProps}>
      <AccountRow
        status={tier}
        name={account.name}
        arr={account.arrLabel}
        signal={account.signalLine}
        owner={account.owner}
        renewalDays={account.renewalDays}
        onClick={open}
      />
    </div>
  );
}

function EmptyDropZone({ tier }: { tier: BoardTier }) {
  if (tier === 'pending') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, minHeight: 120, padding: 18, border: '1px dashed var(--accent-border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-tertiary)' }}>
        <Icon name="phone-outgoing" size={18} color="var(--accent-text)" />
        <span style={{ font: 'var(--type-body-sm)/1.5' }}>Drag an account here once you've reached out and are awaiting their renewal decision.</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 88, padding: 14, border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>
      Drop accounts here
    </div>
  );
}
