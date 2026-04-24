export default function Summary({ summary }) {
  return (
    <section className="card" style={{ marginBottom: "20px" }}>
      <p className="section-title">AI Summary</p>
      <p style={{
        color: "var(--text-body)",
        lineHeight: 1.75,
        fontSize: "0.9375rem",
        margin: 0,
      }}>
        {summary || "No summary available for this analysis."}
      </p>
    </section>
  );
}
