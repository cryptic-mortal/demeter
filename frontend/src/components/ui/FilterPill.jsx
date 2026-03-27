export default function FilterPill({
  active,
  onClick,
  children,
  className = "",
  style = {},
}) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        padding: "5px 12px",
        borderRadius: 20,
        fontSize: 11,
        fontFamily: "DM Mono, monospace",
        cursor: "pointer",
        background: active ? "rgba(74,222,128,0.15)" : "var(--surface)",
        border: `1px solid ${active ? "rgba(74,222,128,0.4)" : "var(--border)"}`,
        color: active ? "var(--green)" : "var(--text-3)",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
