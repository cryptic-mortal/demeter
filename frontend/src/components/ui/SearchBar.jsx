import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder,
  style = {},
  className = "",
}) {
  return (
    <div
      style={{ position: "relative", flex: 1, maxWidth: 360, ...style }}
      className={className}
    >
      <Search
        size={14}
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-3)",
        }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          paddingLeft: 32,
          paddingRight: value ? 28 : 12,
          paddingTop: 7,
          paddingBottom: 7,
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "DM Mono, monospace",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          outline: "none",
          caretColor: "var(--green)",
        }}
      />
      {value && (
        <button
          onClick={onClear}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            color: "var(--text-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
