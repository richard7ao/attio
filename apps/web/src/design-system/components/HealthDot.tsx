export type HealthStatus = 'red' | 'amber' | 'green';

export interface HealthDotProps {
  status?: HealthStatus;
  size?: number;
  pulse?: boolean;
  glow?: boolean;
  style?: React.CSSProperties;
}

/** The canonical health indicator: a filled dot in the tier color, with an optional pulse + glow ring. */
export function HealthDot({
  status = 'green',
  size = 9,
  pulse = false,
  glow = true,
  style = {},
}: HealthDotProps) {
  const color =
    ({ red: 'var(--rag-red)', amber: 'var(--rag-amber)', green: 'var(--rag-green)' } as const)[
      status
    ] || 'var(--rag-green)';
  const glowColor = ({
    red: 'var(--rag-red-glow)',
    amber: 'var(--rag-amber-glow)',
    green: 'var(--rag-green-glow)',
  } as const)[status];
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
        flex: 'none',
        ...style,
      }}
    >
      {pulse ? (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: color,
            animation: 'sentryPulse 2s var(--ease-out) infinite',
          }}
        />
      ) : null}
      <span
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          boxShadow: glow ? `0 0 0 3px ${glowColor}` : 'none',
        }}
      />
      <style>{`@keyframes sentryPulse{0%{transform:scale(1);opacity:.7}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}@media (prefers-reduced-motion: reduce){[style*="sentryPulse"]{animation:none!important}}`}</style>
    </span>
  );
}
