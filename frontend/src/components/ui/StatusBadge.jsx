export const STATUS_COLORS = {
  Healthy: {
    bg: "rgba(74,222,128,0.12)",
    text: "var(--green)",
    border: "rgba(74,222,128,0.3)",
  },
  Attention: {
    bg: "rgba(245,158,11,0.12)",
    text: "var(--amber)",
    border: "rgba(245,158,11,0.3)",
  },
  Critical: {
    bg: "rgba(248,113,113,0.12)",
    text: "var(--red)",
    border: "rgba(248,113,113,0.3)",
  },
};

export default function StatusBadge({
  status,
  label,
  className = "",
  style = {},
}) {
  const st = STATUS_COLORS[status] || STATUS_COLORS.Healthy;
  return (
    <div
      className={className}
      style={{
        fontSize: 10,
        fontFamily: "DM Mono, monospace",
        padding: "3px 8px",
        borderRadius: 20,
        background: st.bg,
        color: st.text,
        border: `1px solid ${st.border}`,
        display: "inline-block",
        ...style,
      }}
    >
      {label || status.toUpperCase()}
    </div>
  );
}
