export default function Suggestions({ suggestions }) {

  const list = suggestions || [];

  return (
    <section className="card" style={{ marginBottom: "20px" }}>
      <p className="section-title">Resume Improvement Suggestions</p>

      {list.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>No suggestions at this time.</p>
      ) : (
        <ol style={{ paddingLeft: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
          {list.map((item, i) => (
            <li key={`sug-${i}`} style={{
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
            }}>
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
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-body)", lineHeight: 1.6 }}>
                {item}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
