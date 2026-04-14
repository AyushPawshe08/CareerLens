/**
 * PersonalInfoForm.jsx
 *
 * Renders input fields for fixed personal information.
 * All changes are propagated up via onChange(field, value).
 */

export default function PersonalInfoForm({ personalInfo, onChange }) {
  const fields = [
    { key: "name",      label: "Name",       type: "text",  placeholder: "John Doe" },
    { key: "email",     label: "Email",      type: "email", placeholder: "john@example.com" },
    { key: "phone",     label: "Phone",      type: "text",  placeholder: "+91 9876543210" },
    { key: "github",    label: "GitHub",     type: "text",  placeholder: "github.com/john" },
    { key: "linkedin",  label: "LinkedIn",   type: "text",  placeholder: "linkedin.com/in/john" },
    { key: "portfolio", label: "Portfolio",  type: "text",  placeholder: "johndoe.dev" },
  ];

  return (
    <div className="border border-black p-4 bg-white">
      <h2 className="text-base font-bold mb-3 text-black">Personal Information</h2>

      <div className="space-y-2">
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-black mb-1">
              {label}
            </label>
            <input
              type={type}
              placeholder={placeholder}
              value={personalInfo[key]}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full border border-black p-2 text-sm text-black bg-white focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
