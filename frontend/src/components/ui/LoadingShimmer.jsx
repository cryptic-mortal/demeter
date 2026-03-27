export default function LoadingShimmer({
  count = 3,
  height = 80,
  style = {},
  className = "",
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
      className={className}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="shimmer"
          style={{
            height: height,
            borderRadius: 12,
            border: "1px solid var(--border)",
          }}
        />
      ))}
    </div>
  );
}
