export default function Suggestions({ suggestions }) {
  return (
    <section className="border p-4 mb-4 rounded">
      <h2 className="font-semibold">Resume Suggestions</h2>
      <ul className="list-disc pl-5">
        {(suggestions || []).map((item, index) => (
          <li key={`suggestion-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
