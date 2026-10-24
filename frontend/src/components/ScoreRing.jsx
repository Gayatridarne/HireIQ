export const scoreTone = (s) => (s >= 80 ? "success" : s >= 50 ? "warning" : "danger");
export const scoreColor = (s) => (s >= 80 ? "var(--primary)" : s >= 50 ? "#d98a00" : "var(--danger)");
export const scoreLabel = (s) => (s >= 90 ? "EXCELLENT MATCH" : s >= 80 ? "STRONG MATCH" : s >= 65 ? "GOOD MATCH" : s >= 50 ? "FAIR MATCH" : "WEAK MATCH");

export default function ScoreRing({ value = 0, size = 150, stroke = 12, caption, fontSize, track = "var(--primary-50)", valueColor }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(v);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Match score ${Math.round(v)} percent`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-value" style={{ fontSize: fontSize || size * 0.25, color: valueColor }}>{Math.round(v)}%</span>
        {caption && <span className="ring-caption" style={{ color: v >= 80 ? "var(--success)" : v >= 50 ? "var(--warning)" : "var(--danger)" }}>{caption}</span>}
      </div>
    </div>
  );
}
