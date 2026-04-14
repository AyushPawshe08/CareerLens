"use client";

/**
 * ResumePreview.jsx
 *
 * Live preview panel — re-renders instantly as the user types.
 * Accepts a `ref` prop directly (React 19 — forwardRef is no longer needed).
 *
 * Font: Calibri (system font on Windows/Mac) with safe fallbacks.
 */

const CALIBRI_FONT = "'Calibri', 'Gill Sans', 'Trebuchet MS', Arial, sans-serif";

export default function ResumePreview({ personalInfo, sections, ref }) {
  const { name, email, phone, github, linkedin, portfolio } = personalInfo;

  // Build contact lines — only include non-empty values
  const contactLine1 = [email, phone].filter(Boolean).join("   |   ");
  const contactLine2 = [github, linkedin, portfolio].filter(Boolean).join("   |   ");

  return (
    <div
      ref={ref}
      id="resume-preview"
      style={{
        fontFamily: CALIBRI_FONT,
        background: "#ffffff",
        color: "#000000",
        padding: "40px",
        minHeight: "600px",
        maxHeight: "85vh",
        overflowY: "auto",
        border: "1px solid black",
        fontSize: "13px",
        lineHeight: "1.6",
      }}
    >
      {/* ── Name ── */}
      <div
        style={{
          textAlign: "center",
          fontSize: "22px",
          fontWeight: "bold",
          letterSpacing: "0.05em",
          marginBottom: "4px",
        }}
      >
        {name || "Your Name"}
      </div>

      {/* ── Contact line 1: Email | Phone ── */}
      {contactLine1 && (
        <div style={{ textAlign: "center", fontSize: "12px", marginBottom: "2px" }}>
          {contactLine1}
        </div>
      )}

      {/* ── Contact line 2: GitHub | LinkedIn | Portfolio ── */}
      {contactLine2 && (
        <div style={{ textAlign: "center", fontSize: "12px", marginBottom: "8px" }}>
          {contactLine2}
        </div>
      )}

      {/* ── Horizontal rule ── */}
      <hr style={{ borderColor: "#000", marginBottom: "16px" }} />

      {/* ── Sections ── */}
      {sections.length === 0 && (
        <div style={{ textAlign: "center", color: "#999", fontSize: "12px" }}>
          Add sections to see them here.
        </div>
      )}

      {sections.map((section, index) => (
        <div
          key={index}
          style={{
            marginBottom: "16px",
            borderTop: index > 0 ? "1px solid #000" : "none",
            paddingTop: index > 0 ? "12px" : "0",
          }}
        >
          {/* Section Title — uppercase, bold */}
          <div
            style={{
              fontWeight: "bold",
              fontSize: "13px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: "1px solid #000",
              paddingBottom: "3px",
              marginBottom: "6px",
            }}
          >
            {section.title || "(Untitled Section)"}
          </div>

          {/* Section Description — preserves newlines */}
          <div style={{ whiteSpace: "pre-line", fontSize: "13px" }}>
            {section.description || ""}
          </div>
        </div>
      ))}
    </div>
  );
}
