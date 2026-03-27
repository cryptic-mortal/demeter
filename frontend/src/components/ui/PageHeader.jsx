export default function PageHeader({ title, subtitle, children }) {
  return (
    <header
      style={{
        flexShrink: 0,
        padding: "0 24px",
        height: 64,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-2)",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
