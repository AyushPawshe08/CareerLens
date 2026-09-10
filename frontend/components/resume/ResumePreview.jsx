/**
 * ResumePreview.jsx  (v2 — full A4 preview)
 *
 * Renders a pixel-accurate A4 resume preview:
 * - White 794px paper with box-shadow
 * - Name 20px bold centered
 * - Contact row with " | " separator
 * - Sections: ALL-CAPS bold title + underline border (accent color)
 * - Rich HTML content rendered via dangerouslySetInnerHTML
 * - Page-break indicator when content > 1123px
 * - Applies: font, size, spacing, accentColor from formatting prop
 *
 * Accepts ref via React 19 (no forwardRef needed).
 */
"use client";

import { useLayoutEffect, useRef, useState } from "react";

const A4_HEIGHT_PX = 1123;

export default function ResumePreview({ personalInfo, sections, formatting, ref: forwardedRef }) {
  const innerRef = useRef(null);
  const resolvedRef = forwardedRef || innerRef;
  const [overflows, setOverflows] = useState(false);

  const {
    font        = "'Calibri', 'Gill Sans', Arial, sans-serif",
    size        = "11pt",
    spacing     = 1.55,
    accentColor = "#1a1a2e",
  } = formatting || {};

  const { name = "", email = "", phone = "", linkedin = "", github = "", portfolio = "" } = personalInfo || {};

  const contactParts = [email, phone, linkedin, github, portfolio].filter(Boolean);
  const contactLine  = contactParts.join("  |  ");

  // Detect overflow
  useLayoutEffect(() => {
    const el = resolvedRef?.current;
    if (!el) return;
    setOverflows(el.scrollHeight > A4_HEIGHT_PX);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* ── A4 Paper ── */}
      <div
        ref={resolvedRef}
        id="resume-preview"
        style={{
          width: "794px",
          minHeight: "560px",
          background: "#ffffff",
          color: "#1a1a1a",
          padding: "40px 48px 48px",
          boxShadow: "0 4px 32px rgba(15,23,42,0.18), 0 1px 4px rgba(15,23,42,0.10)",
          fontFamily: font,
          fontSize: size,
          lineHeight: spacing,
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* ── Name ── */}
        <div style={{
          textAlign: "center",
          fontSize: "20px",
          fontWeight: "bold",
          letterSpacing: "0.04em",
          marginBottom: "4px",
          color: "#111",
        }}>
          {name || <span style={{ color: "#bbb", fontWeight: 400 }}>Your Name</span>}
        </div>

        {/* ── Contact row ── */}
        {contactLine ? (
          <div style={{
            textAlign: "center",
            fontSize: "9.5pt",
            color: "#444",
            marginBottom: "10px",
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}>
            {contactLine}
          </div>
        ) : (
          <div style={{ marginBottom: "10px" }} />
        )}

        {/* ── Top rule ── */}
        <hr style={{
          borderColor: accentColor,
          borderTopWidth: "1.5px",
          borderStyle: "solid",
          margin: "0 0 14px",
        }} />

        {/* ── Empty placeholder ── */}
        {sections.length === 0 && (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: "10pt", marginTop: "32px" }}>
            Add sections in the editor to preview your resume here.
          </div>
        )}

        {/* ── Sections ── */}
        {sections.map((section, i) => (
          <div key={section.id || i} style={{ marginBottom: "12px" }}>
            {/* Section heading */}
            <div style={{
              fontWeight: "bold",
              fontSize: "10.5pt",
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              borderBottom: `1.5px solid ${accentColor}`,
              paddingBottom: "2px",
              marginBottom: "5px",
              color: accentColor,
            }}>
              {section.title || "(Untitled Section)"}
            </div>

            {/* Rich HTML content */}
            <div
              className="resume-body-content"
              dangerouslySetInnerHTML={{ __html: section.content || "" }}
              style={{
                fontSize: size,
                lineHeight: spacing,
                color: "#222",
              }}
            />
          </div>
        ))}

        {/* ── Overflow page-break indicator (inside paper) ── */}
        {overflows && (
          <div style={{
            position: "absolute",
            top: `${A4_HEIGHT_PX - 40}px`,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            pointerEvents: "none",
          }}>
            <div style={{ flex: 1, borderTop: "2px dashed #f59e0b" }} />
            <span style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#f59e0b",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              background: "#fff",
              padding: "2px 8px",
              whiteSpace: "nowrap",
            }}>Page 2</span>
            <div style={{ flex: 1, borderTop: "2px dashed #f59e0b" }} />
          </div>
        )}
      </div>

      {/* Overflow badge below paper */}
      {overflows && (
        <div style={{
          marginTop: "6px",
          fontSize: "11px",
          color: "#d97706",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "6px",
          padding: "4px 14px",
        }}>
          ⚠️ Content exceeds one A4 page — PDF will span 2 pages.
        </div>
      )}

      {/* Content styles scoped to preview */}
      <style>{`
        .resume-body-content ul {
          margin: 3px 0;
          padding-left: 1.4em;
          list-style-type: disc;
        }
        .resume-body-content li {
          margin: 2px 0;
        }
        .resume-body-content div, .resume-body-content p {
          margin: 2px 0;
        }
        .resume-body-content strong { font-weight: 700; }
        .resume-body-content em { font-style: italic; }
      `}</style>
    </div>
  );
}
