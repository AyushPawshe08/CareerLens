export default function JobRoles({ roles }) {

  const list = roles || [];

  return (
    <section className="card" style={{ marginBottom: "20px" }}>
      <p className="section-title">Recommended Job Roles</p>

      {list.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>No role suggestions available.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {list.map((role, i) => (
            <div key={`role-${i}`} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              border: "1.5px solid var(--border)",
              background: "var(--bg-input)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--text-heading)",
            }}>
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>{i + 1}.</span>
              {role}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
