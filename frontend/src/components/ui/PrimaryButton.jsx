export default function PrimaryButton({
  onClick,
  children,
  icon: Icon,
  className = "",
  style = {},
  ...props
}) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 18px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        background: "var(--green)",
        border: "none",
        color: "var(--btn-on-green)",
        cursor: "pointer",
        boxShadow: "0 0 16px rgba(74,222,128,0.2)",
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}
