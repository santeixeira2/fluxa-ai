import { useMemo } from 'react';

/**
 * StatsGrid — matches the Treva prototype top section:
 * 3 cards: progress ring, bar chart, monthly satisfaction bars
 */
export default function StatsGrid() {
  return (
    <div className="stats-grid">
      {/* ── Card 1: Progress Ring ── */}
      <div className="stats-card">
        <div className="stats-ring-wrap">
          <ProgressRing value={78} size={110} />
          <div className="stats-ring-inner">
            <div className="stats-ring-logo">Fx</div>
            <div className="stats-ring-brand">Fluxa</div>
          </div>
        </div>
        <div className="stats-card-value">78%</div>
        <div className="stats-card-desc">Retorno médio positivo</div>
      </div>

      {/* ── Card 2: Bar Chart ── */}
      <div className="stats-card">
        <BarChart />
        <div className="stats-card-value">1.2M</div>
        <div className="stats-card-desc">Simulações realizadas</div>
      </div>

      {/* ── Card 3: Monthly Bars ── */}
      <div className="stats-card">
        <div className="stats-card-value stats-card-value-top">93%</div>
        <div className="stats-card-desc">Satisfação dos usuários</div>
        <MonthlyBars />
      </div>
    </div>
  );
}

/* ── Progress Ring ── */
function ProgressRing({ value, size }: { value: number; size: number }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} className="stats-ring-svg">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stats-ring-progress"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00BFA8" />
          <stop offset="100%" stopColor="#0093FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Bar Chart (like the "1.2M User Daily" card) ── */
function BarChart() {
  const bars = useMemo(() => {
    const heights = [35, 55, 42, 75, 60, 88, 70];
    return heights;
  }, []);

  return (
    <div className="stats-bars-chart">
      {bars.map((h, i) => (
        <div key={i} className="stats-bars-col">
          {/* dot on top */}
          <div
            className="stats-bar-dot"
            style={{ bottom: `${h}%` }}
          />
          <div
            className="stats-bar"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.08}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Monthly Satisfaction Bars (Apr/Jun/Jul with gradient) ── */
function MonthlyBars() {
  const months = [
    { label: 'Mar', value: 45, color: 'rgba(0,191,168,0.25)' },
    { label: 'Abr', value: 65, color: 'rgba(0,191,168,0.5)' },
    { label: 'Mai', value: 90, color: '#00BFA8' },
  ];

  return (
    <div className="stats-monthly">
      {months.map((m) => (
        <div key={m.label} className="stats-monthly-col">
          <div className="stats-monthly-bar-wrap">
            <div
              className="stats-monthly-bar"
              style={{ height: `${m.value}%`, background: m.color }}
            />
            {/* dotted pattern overlay */}
            <div
              className="stats-monthly-dots"
              style={{ height: `${m.value}%` }}
            />
          </div>
          <span className="stats-monthly-label">{m.label}</span>
        </div>
      ))}
    </div>
  );
}
