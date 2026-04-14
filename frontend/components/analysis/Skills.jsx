export default function Skills({ matched, missing }) {
  return (
    <section className="border p-4 mb-4 rounded">
      <h2 className="font-semibold">Matched Skills</h2>
      <ul className="list-disc pl-5">
        {(matched || []).map((skill, index) => (
          <li key={`matched-${index}`}>{skill}</li>
        ))}
      </ul>

      <h2 className="font-semibold mt-4">Missing Skills</h2>
      <ul className="list-disc pl-5">
        {(missing || []).map((skill, index) => (
          <li key={`missing-${index}`}>{skill}</li>
        ))}
      </ul>
    </section>
  );
}
