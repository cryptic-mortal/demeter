import { ChevronDown } from "lucide-react";

export default function SelectField({
  value,
  onChange,
  options = [],
  style = {},
  className = "",
  ...props
}) {
  // Options should be an array of { value, label }
  return (
    <div style={{ position: "relative", ...style }} className={className}>
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: "none",
          padding: "5px 24px 5px 10px",
          borderRadius: 8,
          fontSize: 12,
          fontFamily: "DM Mono, monospace",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-2)",
          cursor: "pointer",
          outline: "none",
          width: "100%",
        }}
        {...props}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={10}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--text-3)",
        }}
      />
    </div>
  );
}
