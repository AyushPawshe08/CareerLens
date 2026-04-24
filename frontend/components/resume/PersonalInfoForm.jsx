/**
 * PersonalInfoForm.jsx
 * Input fields for fixed personal information.
 * All changes propagate up via onChange(field, value).
 */

export default function PersonalInfoForm({ personalInfo, onChange }) {

  const fields = [
    { key: "name",      label: "Full Name",    type: "text",  placeholder: "John Doe" },
    { key: "email",     label: "Email",        type: "email", placeholder: "john@example.com" },
    { key: "phone",     label: "Phone",        type: "text",  placeholder: "+91 98765 43210" },
    { key: "github",    label: "GitHub URL",   type: "text",  placeholder: "github.com/johnDoe" },
    { key: "linkedin",  label: "LinkedIn URL", type: "text",  placeholder: "linkedin.com/in/john" },
    { key: "portfolio", label: "Portfolio URL",type: "text",  placeholder: "johndoe.dev" },
  ];

  return (
    <div className="card-sm" style={{ marginBottom: "16px" }}>
      <p className="section-title">Personal Information</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ gridColumn: key === "name" || key === "email" ? "span 2" : "span 1" }}>
            <label htmlFor={`pif-${key}`} className="label">{label}</label>
            <input
              id={`pif-${key}`}
              type={type}
              placeholder={placeholder}
              value={personalInfo[key]}
              onChange={(e) => onChange(key, e.target.value)}
              className="input"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
