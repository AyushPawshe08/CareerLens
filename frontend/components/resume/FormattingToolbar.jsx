/**
 * FormattingToolbar.jsx
 *
 * Controls bar for the resume builder:
 *   - Font family selector
 *   - Font size toggle (10pt / 11pt / 12pt)
 *   - Line spacing toggle (Compact / Normal / Relaxed)
 *   - Accent color swatches (6 presets) for section header underlines
 *
 * Emits: onChange({ font, size, spacing, accentColor })
 */
"use client";

const FONTS = [
  { label: "Arial",            value: "Arial, Helvetica, sans-serif" },
  { label: "Calibri",          value: "'Calibri', 'Gill Sans', 'Trebuchet MS', Arial, sans-serif" },
  { label: "Georgia",          value: "Georgia, 'Times New Roman', serif" },
  { label: "Times New Roman",  value: "'Times New Roman', Times, serif" },
];

const SIZES = ["10pt", "11pt", "12pt"];

const SPACINGS = [
  { label: "Compact",  value: 1.3 },
  { label: "Normal",   value: 1.55 },
  { label: "Relaxed",  value: 1.8 },
];

const ACCENT_COLORS = [
  { label: "Navy",    value: "#1a1a2e" },
  { label: "Indigo",  value: "#4f6ef7" },
  { label: "Forest",  value: "#1a5c3a" },
  { label: "Crimson", value: "#9b1c1c" },
  { label: "Slate",   value: "#334155" },
  { label: "Amber",   value: "#92400e" },
];

export default function FormattingToolbar({ formatting, onChange }) {
  const set = (key, val) => onChange({ ...formatting, [key]: val });

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "20px",
      padding: "10px 16px",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "10px",
      flexWrap: "wrap",
      marginBottom: "16px",
      boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
    }}>

      {/* Font selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label style={LABEL_STYLE}>Font</label>
        <select
          value={formatting.font}
          onChange={e => set("font", e.target.value)}
          style={SELECT_STYLE}
        >
          {FONTS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <Divider />

      {/* Size toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label style={LABEL_STYLE}>Size</label>
        <div style={TOGGLE_GROUP}>
          {SIZES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => set("size", s)}
              style={toggleBtn(formatting.size === s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Spacing toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label style={LABEL_STYLE}>Spacing</label>
        <div style={TOGGLE_GROUP}>
          {SPACINGS.map(sp => (
            <button
              key={sp.label}
              type="button"
              onClick={() => set("spacing", sp.value)}
              style={toggleBtn(formatting.spacing === sp.value)}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Accent swatches */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label style={LABEL_STYLE}>Accent</label>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => set("accentColor", c.value)}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: c.value,
                border: formatting.accentColor === c.value
                  ? "2.5px solid #4f6ef7"
                  : "2px solid transparent",
                outline: formatting.accentColor === c.value
                  ? "2px solid #4f6ef7"
                  : "2px solid transparent",
                outlineOffset: "1px",
                cursor: "pointer",
                transition: "transform 0.12s",
                transform: formatting.accentColor === c.value ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

function Divider() {
  return <div style={{ width: "1px", height: "24px", background: "#e5e7eb", flexShrink: 0 }} />;
}

const LABEL_STYLE = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const SELECT_STYLE = {
  fontSize: "12.5px",
  padding: "4px 8px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  background: "#f9fafb",
  color: "#1f2937",
  cursor: "pointer",
  outline: "none",
};

const TOGGLE_GROUP = {
  display: "flex",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  overflow: "hidden",
};

const toggleBtn = (active) => ({
  fontSize: "12px",
  padding: "3px 10px",
  border: "none",
  borderRight: "1px solid #d1d5db",
  background: active ? "#4f6ef7" : "#f9fafb",
  color: active ? "#fff" : "#374151",
  cursor: "pointer",
  fontWeight: active ? 600 : 400,
  transition: "background 0.15s",
  whiteSpace: "nowrap",
  outline: "none",
});
