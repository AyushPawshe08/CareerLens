export default function Score({ score }) {

  const value = score ?? null;

  // Determine color band based on score
  const color =
    value === null ? "var(--text-muted)"
    : value >= 75  ? "var(--success)"
    : value >= 50  ? "var(--warning)"
    :                "var(--danger)";

  const borderColor =
    value === null ? "var(--border)"
    : value >= 75  ? "var(--success)"
    : value >= 50  ? "var(--warning)"
    :                "var(--danger)";

  const bgColor =
    value === null ? "var(--bg-subtle)"
    : value >= 75  ? "var(--success-bg)"
    : value >= 50  ? "var(--warning-bg)"
    :                "var(--danger-bg)";

  const label =
    value === null ? "N/A"
    : value >= 75  ? "Strong match"
    : value >= 50  ? "Moderate match"
    :                "Needs work";

  return (
    <section
      className="card"
      style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "24px" }}
    >
      {/* Score ring */}
      <div style={{
        flexShrink: 0,
        width: "88px",
        height: "88px",
        borderRadius: "50%",
        border: `4px solid ${borderColor}`,
        background: bgColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: "1.75rem", fontWeight: 800, color, lineHeight: 1 }}>
          {value ?? "—"}
        </span>
        <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          / 100
        </span>
      </div>

      {/* Text */}
      <div>
        <p className="section-title" style={{ marginBottom: "4px" }}>Resume Score</p>
        <h2 style={{ fontSize: "1.25rem", margin: "0 0 6px" }}>{label}</h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          {value === null
            ? "Score could not be calculated."
            : "Based on keyword alignment, experience match, and ATS compatibility."}
        </p>
      </div>
    </section>
  );
}
