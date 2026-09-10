/**
 * PersonalInfoForm.jsx
 * Input fields for fixed personal information.
 * All changes propagate up via onChange(field, value).
 */

export default function PersonalInfoForm({ personalInfo, onChange }) {

  const fields = [
    { key: "name",      label: "Full Name",     type: "text",  placeholder: "John Doe",                span: 2 },
    { key: "email",     label: "Email",         type: "email", placeholder: "john@example.com",         span: 1 },
    { key: "phone",     label: "Phone",         type: "text",  placeholder: "+91 98765 43210",          span: 1 },
    { key: "linkedin",  label: "LinkedIn URL",  type: "text",  placeholder: "linkedin.com/in/john",     span: 1 },
    { key: "github",    label: "GitHub URL",    type: "text",  placeholder: "github.com/johnDoe",       span: 1 },
    { key: "portfolio", label: "Portfolio URL", type: "text",  placeholder: "johndoe.dev",              span: 2 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      {fields.map(({ key, label, type, placeholder, span }) => (
        <div key={key} style={{ gridColumn: `span ${span}` }}>
          <label
            htmlFor={`pif-${key}`}
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
            }}
          >
            {label}
          </label>
          <input
            id={`pif-${key}`}
            type={type}
            placeholder={placeholder}
            value={personalInfo[key] ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid #d1d5db",
              borderRadius: "7px",
              fontSize: "13px",
              color: "#1f2937",
              background: "#f9fafb",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={e => {
              e.target.style.borderColor = "#4f6ef7";
              e.target.style.boxShadow = "0 0 0 3px rgba(79,110,247,0.1)";
              e.target.style.background = "#fff";
            }}
            onBlur={e => {
              e.target.style.borderColor = "#d1d5db";
              e.target.style.boxShadow = "none";
              e.target.style.background = "#f9fafb";
            }}
          />
        </div>
      ))}
    </div>
  );
}
