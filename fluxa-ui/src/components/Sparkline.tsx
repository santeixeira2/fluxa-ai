import { useMemo } from 'react';

interface SparklineProps {
  /** Array of y-values */
  data: number[];
  width?: number;
  height?: number;
  /** Stroke color */
  color?: string;
  /** Show area fill under line */
  fill?: boolean;
  /** Stroke width */
  strokeWidth?: number;
  className?: string;
}

export default function Sparkline({
  data,
  width = 80,
  height = 32,
  color = 'var(--accent-teal)',
  fill = true,
  strokeWidth = 1.5,
  className = '',
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data.length) return { line: '', area: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 2;

    const points = data.map((val, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (val - min) / range) * (height - pad * 2);
      return [x, y] as const;
    });

    const line = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');

    const area =
      line +
      ` L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;

    return { line, area };
  }, [data, width, height]);

  if (!data.length) return null;

  const id = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && (
        <path d={path.area} fill={`url(#${id}-grad)`} />
      )}
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Generate realistic-ish random walk data for demos */
export function generateSparkData(points = 24, volatility = 0.06, trend = 0.002): number[] {
  const data: number[] = [100];
  for (let i = 1; i < points; i++) {
    const change = (Math.random() - 0.48) * volatility + trend;
    data.push(data[i - 1] * (1 + change));
  }
  return data;
}
