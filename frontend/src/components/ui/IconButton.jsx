export default function IconButton({
  onClick,
  children,
  className = "",
  style = {},
  ...props
}) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
