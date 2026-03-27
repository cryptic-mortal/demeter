export default function FilterBar({ children, style = {}, className = "" }) {
  return (
    <div
      className={className}
      style={{
        flexShrink: 0,
        padding: "8px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-2)",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
