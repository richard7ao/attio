export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: number;
  style?: React.CSSProperties;
}

const TONES = [
  { bg: 'rgba(76,141,255,0.18)', fg: '#9CC0FF' },
  { bg: 'rgba(47,217,138,0.16)', fg: '#6FE7B2' },
  { bg: 'rgba(245,177,61,0.16)', fg: '#FBD28C' },
  { bg: 'rgba(185,139,255,0.18)', fg: '#D4BBFF' },
  { bg: 'rgba(54,197,192,0.16)', fg: '#7FE3DF' },
] as const;

const FALLBACK_TONE = TONES[0];

function initials(name = ''): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/** Monogram avatar (default) or image. Deterministic tone from the name. */
export function Avatar({ name = '', src = null, size = 28, style = {} }: AvatarProps) {
  const tone = TONES[(name.charCodeAt(0) || 0) % TONES.length] ?? FALLBACK_TONE;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: src ? 'var(--surface-3)' : tone.bg,
        color: tone.fg,
        border: '1px solid var(--border-subtle)',
        font: `var(--weight-semibold) ${Math.round(size * 0.36)}px/1 var(--font-sans)`,
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
