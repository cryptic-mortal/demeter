export default function EmptyState({
  icon: Icon,
  title,
  description,
  style = {},
  className = "",
}) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 16,
        padding: 40,
        ...style,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "rgba(74,222,128,0.06)",
            border: "1px solid rgba(74,222,128,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={28} style={{ color: "var(--green)" }} />
        </div>
      )}
      <div style={{ textAlign: "center" }}>
        {title && (
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--text-2)",
              marginBottom: 8,
            }}
          >
            {title}
          </div>
        )}
        {description && (
          <div
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              maxWidth: 300,
              lineHeight: 1.5,
              margin: "0 auto",
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
