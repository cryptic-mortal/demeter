export default function InlineLabel({ children, className = "", style = {} }) {
  return (
    <div
      className={`section-label ${className}`}
      style={{ marginBottom: 0, ...style }}
    >
      {children}
    </div>
  );
}
