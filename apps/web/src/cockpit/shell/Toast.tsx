import { useCockpit } from '../state/CockpitProvider.js';

export function Toast() {
  const { toast } = useCockpit();
  if (!toast) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 26,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 42,
        padding: '0 18px',
        borderRadius: 999,
        background: 'var(--surface-3)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'riseIn .18s var(--ease-out, ease)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--rag-green)' }} />
      <span style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)' }}>{toast}</span>
    </div>
  );
}
