import { STATUS_COLOR } from './status.js';

/** Small coloured dot for a churn status (red / amber / green). */
export function StatusDot({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: STATUS_COLOR[status] ?? '#9ca3af',
        marginRight: 8,
      }}
    />
  );
}
