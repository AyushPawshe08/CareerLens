const IMPACT_STYLES = {
  high:   { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "High" },
  medium: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "Medium" },
  low:    { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Low" },
};

const ACTION_COLORS = {
  Add:       { bg: "#eff6ff", color: "#2563eb" },
  Quantify:  { bg: "#f5f3ff", color: "#7c3aed" },
  Remove:    { bg: "#fff1f2", color: "#e11d48" },
  Reframe:   { bg: "#fff7ed", color: "#ea580c" },
  Highlight: { bg: "#fefce8", color: "#ca8a04" },
  Move:      { bg: "#f0fdf4", color: "#15803d" },
};

export default function Suggestions({ suggestions }) {
  const list = suggestions || [];

  return (
    <section className="card" style={{ marginBottom: "20px" }}>
      <p className="section-title">Resume Improvement Suggestions</p>

      {list.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          No suggestions at this time.
        </p>
      ) : (
        <ol style={{ paddingLeft: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
          {list.map((item, i) => {
            // Support both legacy strings and new structured objects
            if (typeof item === "string") {
              return (
                <li key={`sug-${i}`} style={legacyItemStyle}>
                  <NumberBadge n={i + 1} />
                  <span style={{ fontSize: "0.9rem", color: "var(--text-body)", lineHeight: 1.6 }}>
                    {item}
                  </span>
                </li>
              );
            }

            const { action = "", text = "", impact = "medium" } = item;
            const impactStyle = IMPACT_STYLES[impact] ?? IMPACT_STYLES.medium;
            const actionStyle = ACTION_COLORS[action] ?? { bg: "var(--bg-input)", color: "var(--text-body)" };

            return (
              <li key={`sug-${i}`} style={{
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
              }}>
                <NumberBadge n={i + 1} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Action verb chip */}
                  {action && (
                    <span style={{
                      display: "inline-block",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      marginBottom: "6px",
                      background: actionStyle.bg,
                      color: actionStyle.color,
                    }}>
                      {action}
                    </span>
                  )}

                  {/* Suggestion text */}
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-body)", lineHeight: 1.6 }}>
                    {text}
                  </p>
                </div>

                {/* Impact badge */}
                <span style={{
                  flexShrink: 0,
                  alignSelf: "center",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  background: impactStyle.bg,
                  color: impactStyle.color,
                  border: `1px solid ${impactStyle.border}`,
                  whiteSpace: "nowrap",
                }}>
                  {impactStyle.label} impact
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function NumberBadge({ n }) {
  return (
    <span style={{
      flexShrink: 0,
      width: "22px",
      height: "22px",
      borderRadius: "50%",
      background: "var(--primary-light)",
      color: "var(--primary)",
      fontSize: "0.75rem",
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: "2px",
    }}>
      {n}
    </span>
  );
}

const legacyItemStyle = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  padding: "12px 16px",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
};
