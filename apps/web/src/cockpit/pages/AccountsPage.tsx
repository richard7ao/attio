import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../design-system/index.js';
import { renewalColor } from '../domain/format.js';
import { type AccountVM } from '../domain/types.js';
import { useCockpit } from '../state/CockpitProvider.js';

type SortKey = 'name' | 'health' | 'arr' | 'seats' | 'renewalDays';
type SortDir = 'asc' | 'desc';
interface SortState {
  key: SortKey;
  dir: SortDir;
}

const HEALTH_RANK: Record<AccountVM['health'], number> = { red: 0, amber: 1, pending: 2, green: 3 };

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'ACCOUNT', align: 'left' },
  { key: 'health', label: 'HEALTH', align: 'left' },
  { key: 'arr', label: 'ARR', align: 'right' },
  { key: 'seats', label: 'SEATS', align: 'right' },
  { key: 'renewalDays', label: 'RENEWAL', align: 'right' },
];

function sortValue(a: AccountVM, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return a.name.toLowerCase();
    case 'health':
      return HEALTH_RANK[a.health];
    case 'arr':
      return a.arr;
    case 'seats':
      return a.seatPct;
    case 'renewalDays':
      return a.renewalDays;
  }
}

export function AccountsPage() {
  const { visibleAccounts } = useCockpit();
  const [sort, setSort] = useState<SortState>({ key: 'renewalDays', dir: 'asc' });

  const rows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const list = [...visibleAccounts];
    list.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
    return list;
  }, [visibleAccounts, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const arrowFor = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div style={{ maxWidth: 1320, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, font: 'var(--type-h2)' }}>All Accounts</h2>
        <p style={{ margin: '4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>
          {rows.length} accounts · sort any column
        </p>
      </div>

      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          background: 'var(--surface-1)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{
                    textAlign: col.align,
                    padding: '11px 16px',
                    cursor: 'pointer',
                    font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                    letterSpacing: 'var(--tracking-label)',
                    color: 'var(--text-tertiary)',
                    userSelect: 'none',
                  }}
                >
                  {col.label}
                  {arrowFor(col.key)}
                </th>
              ))}
              <th
                style={{
                  textAlign: 'left',
                  padding: '11px 16px',
                  font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                  letterSpacing: 'var(--tracking-label)',
                  color: 'var(--text-tertiary)',
                }}
              >
                OWNER
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <AccountTableRow key={a.id} account={a} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountTableRow({ account }: { account: AccountVM }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const barColor = `var(--rag-${account.health})`;
  const healthTextColor = `var(--rag-${account.health}-text)`;
  const healthSoft = `var(--rag-${account.health}-soft)`;

  return (
    <tr
      onClick={() => navigate(`/account/${account.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderTop: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        background: hover ? 'var(--surface-2)' : 'transparent',
      }}
    >
      <td style={{ padding: '13px 16px' }}>
        <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)' }}>{account.name}</div>
        <div
          style={{
            font: 'var(--weight-regular) var(--text-2xs)/1.2 var(--font-mono)',
            color: 'var(--text-tertiary)',
            marginTop: 3,
          }}
        >
          {account.domain}
        </div>
      </td>
      <td style={{ padding: '13px 16px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            font: 'var(--weight-medium) var(--text-xs)/1 var(--font-sans)',
            color: healthTextColor,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: barColor,
              boxShadow: `0 0 0 3px ${healthSoft}`,
            }}
          />
          {account.healthLabel}
        </span>
      </td>
      <td
        style={{
          padding: '13px 16px',
          textAlign: 'right',
          font: 'var(--type-mono-data)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {account.arrLabel}
      </td>
      <td
        style={{
          padding: '13px 16px',
          textAlign: 'right',
          font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-secondary)',
        }}
      >
        {account.seatLabel}
      </td>
      <td
        style={{
          padding: '13px 16px',
          textAlign: 'right',
          font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          color: renewalColor(account.renewalDays),
        }}
      >
        {account.renewalLabel}
      </td>
      <td style={{ padding: '13px 16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={account.owner} size={22} />
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)' }}>{account.owner}</span>
        </span>
      </td>
    </tr>
  );
}
