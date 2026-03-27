/**
 * Shared Custom Tooltip for Recharts components
 */
export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "DM Mono, monospace",
        background: "var(--tooltip-bg)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginTop: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}
