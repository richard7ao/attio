import { useId } from 'react';

export type SparklineTone = 'accent' | 'green' | 'amber' | 'red';

export interface SparklineProps {
  data?: number[];
  width?: number;
  height?: number;
  tone?: SparklineTone;
  fill?: boolean;
  style?: React.CSSProperties;
}

/** Tiny inline area/line sparkline (usage trends on account rows & profiles). Pure SVG, no deps. */
export function Sparkline({
  data = [],
  width = 96,
  height = 28,
  tone = 'accent',
  fill = true,
  style = {},
}: SparklineProps) {
  const reactId = useId();
  const color =
    ({
      accent: 'var(--accent)',
      green: 'var(--rag-green)',
      amber: 'var(--rag-amber)',
      red: 'var(--rag-red)',
    } as const)[tone] || 'var(--accent)';
  if (!data.length) return <svg width={width} height={height} style={style} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (d - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return <svg width={width} height={height} style={style} />;
  const line = pts
    .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ');
  const area = `${line} L${last[0].toFixed(1)},${height} L${first[0].toFixed(1)},${height} Z`;
  const gid = `spark${reactId.replace(/:/g, '')}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill ? <path d={area} fill={`url(#${gid})`} /> : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
}
