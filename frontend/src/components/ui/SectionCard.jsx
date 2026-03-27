export default function SectionCard({
  children,
  className = "",
  style = {},
  ...props
}) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 14,
        padding: 20,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
