"use client";

/**
 * ResumePreview.jsx
 *
 * Live preview panel — re-renders instantly as user types.
 * Accepts a `ref` prop directly (React 19 — forwardRef is no longer needed).
 * Font: Calibri with safe fallbacks.
 */

const CALIBRI = "'Calibri', 'Gill Sans', 'Trebuchet MS', Arial, sans-serif";

export default function ResumePreview({ personalInfo, sections, ref }) {

  const { name, email, phone, github, linkedin, portfolio } = personalInfo;

  const contact1 = [email, phone].filter(Boolean).join("   |   ");
  const contact2 = [github, linkedin, portfolio].filter(Boolean).join("   |   ");

  return (
    <div
      ref={ref}
      id="resume-preview"
      style={{
        fontFamily: CALIBRI,
        background: "#ffffff",
        color: "#1a1a1a",
        padding: "36px 40px",
        minHeight: "560px",
        maxHeight: "80vh",
        overflowY: "auto",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        fontSize: "13px",
        lineHeight: "1.6",
      }}
    >
      {/* ── Name ── */}
      <div style={{
        textAlign: "center",
        fontSize: "22px",
        fontWeight: "bold",
        letterSpacing: "0.04em",
        marginBottom: "4px",
        color: "#111",
      }}>
        {name || <span style={{ color: "#bbb" }}>Your Name</span>}
      </div>

      {/* ── Contact line 1 ── */}
      {contact1 && (
        <div style={{ textAlign: "center", fontSize: "12px", marginBottom: "2px", color: "#444" }}>
          {contact1}
        </div>
      )}

      {/* ── Contact line 2 ── */}
      {contact2 && (
        <div style={{ textAlign: "center", fontSize: "12px", marginBottom: "10px", color: "#444" }}>
          {contact2}
        </div>
      )}

      {/* ── Divider ── */}
      <hr style={{ borderColor: "#1a1a1a", marginBottom: "16px", borderTopWidth: "1px" }} />

      {/* ── Empty placeholder ── */}
      {sections.length === 0 && (
        <div style={{ textAlign: "center", color: "#aaa", fontSize: "12px", marginTop: "24px" }}>
          Add sections to see your resume preview here.
        </div>
      )}

      {/* ── Sections ── */}
      {sections.map((section, i) => (
        <div key={i} style={{
          marginBottom: "16px",
          borderTop: i > 0 ? "1px solid #ccc" : "none",
          paddingTop: i > 0 ? "12px" : "0",
        }}>
          <div style={{
            fontWeight: "bold",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderBottom: "1px solid #1a1a1a",
            paddingBottom: "3px",
            marginBottom: "6px",
            color: "#111",
          }}>
            {section.title || "(Untitled Section)"}
          </div>
          <div style={{ whiteSpace: "pre-line", fontSize: "13px", color: "#222" }}>
            {section.description || ""}
          </div>
        </div>
      ))}
    </div>
  );
}
