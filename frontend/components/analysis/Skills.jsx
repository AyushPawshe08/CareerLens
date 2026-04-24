export default function Skills({ matched, missing }) {

  const matchedList = matched || [];
  const missingList = missing || [];

  return (
    <section className="card" style={{ marginBottom: "20px" }}>
      <p className="section-title">Skill Analysis</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

        {/* Matched Skills */}
        <div>
          <h3 style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--success)",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            ✓ Matched ({matchedList.length})
          </h3>
          {matchedList.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No matched skills found.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {matchedList.map((skill, i) => (
                <span key={`m-${i}`} className="tag tag-matched">{skill}</span>
              ))}
            </div>
          )}
        </div>

        {/* Missing Skills */}
        <div>
          <h3 style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--danger)",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            ✗ Missing ({missingList.length})
          </h3>
          {missingList.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No missing skills — great match!</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {missingList.map((skill, i) => (
                <span key={`miss-${i}`} className="tag tag-missing">{skill}</span>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
