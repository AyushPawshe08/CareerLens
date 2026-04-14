export default function JobRoles({ roles }) {
  return (
    <section className="border p-4 mb-4 rounded">
      <h2 className="font-semibold">Perfect Job Roles</h2>
      <ul className="list-disc pl-5">
        {(roles || []).map((role, index) => (
          <li key={`role-${index}`}>{role}</li>
        ))}
      </ul>
    </section>
  );
}
