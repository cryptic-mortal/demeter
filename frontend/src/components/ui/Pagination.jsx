import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  totalPages,
  setPage,
  style = {},
  className = "",
}) {
  if (totalPages <= 1) return null;
  return (
    <div
      className={className}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginTop: 20,
        ...style,
      }}
    >
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          cursor: page === 1 ? "not-allowed" : "pointer",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: page === 1 ? "var(--text-3)" : "var(--text-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChevronLeft size={14} />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => setPage(n)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "DM Mono, monospace",
            fontSize: 12,
            background: n === page ? "var(--green)" : "var(--surface)",
            border: `1px solid ${n === page ? "transparent" : "var(--border)"}`,
            color: n === page ? "var(--btn-on-green)" : "var(--text-2)",
            fontWeight: n === page ? 700 : 400,
          }}
        >
          {n}
        </button>
      ))}

      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          cursor: page === totalPages ? "not-allowed" : "pointer",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: page === totalPages ? "var(--text-3)" : "var(--text-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
