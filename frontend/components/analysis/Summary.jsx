export default function Summary({ summary }) {
  return (
    <section className="border p-4 mb-4 rounded">
      <h2 className="font-semibold">Summary</h2>
      <p>{summary || "No summary available."}</p>
    </section>
  );
}
