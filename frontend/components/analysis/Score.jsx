export default function Score({ score }) {
  return (
    <section className="border p-4 mb-4 rounded">
      <h2 className="font-semibold">Resume Score</h2>
      <p>Resume Score: {score ?? "N/A"}</p>
    </section>
  );
}
