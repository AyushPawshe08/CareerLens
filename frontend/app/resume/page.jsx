"use client";

/**
 * /app/resume/page.jsx  (v2 — ATS Resume Builder)
 *
 * Two-column layout:
 *   LEFT  → FormattingToolbar + PersonalInfoForm + RichSectionInput + ResumeActions
 *   RIGHT → sticky A4 ResumePreview
 *
 * State:
 *   personalInfo  : { name, email, phone, linkedin, github, portfolio }
 *   sections      : [{ id, title, content, order }]
 *   formatting    : { font, size, spacing, accentColor }
 *
 * LocalStorage autosave every 2 seconds.
 * Reset clears everything and localStorage.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar              from "@/components/ui/Navbar";
import PersonalInfoForm    from "@/components/resume/PersonalInfoForm";
import RichSectionInput    from "@/components/resume/RichSectionInput";
import ResumePreview       from "@/components/resume/ResumePreview";
import FormattingToolbar   from "@/components/resume/FormattingToolbar";
import ResumeActions       from "@/components/resume/ResumeActions";
import { FileText }        from "lucide-react";

/* ── Constants ──────────────────────────────────────────────── */

const LS_KEY = "careerlens_resume_v2";

const DEFAULT_PERSONAL = {
  name: "", email: "", phone: "", linkedin: "", github: "", portfolio: "",
};

const DEFAULT_FORMATTING = {
  font:        "'Calibri', 'Gill Sans', Arial, sans-serif",
  size:        "11pt",
  spacing:     1.55,
  accentColor: "#1a1a2e",
};

const DEFAULT_SECTIONS = [
  {
    id:      "sec-summary",
    title:   "PROFESSIONAL SUMMARY",
    content: "",
    order:   0,
  },
  {
    id:      "sec-skills",
    title:   "SKILLS",
    content: "",
    order:   1,
  },
  {
    id:      "sec-experience",
    title:   "EXPERIENCE",
    content: "",
    order:   2,
  },
  {
    id:      "sec-projects",
    title:   "PROJECTS",
    content: "",
    order:   3,
  },
  {
    id:      "sec-education",
    title:   "EDUCATION",
    content: "",
    order:   4,
  },
  {
    id:      "sec-achievements",
    title:   "ACHIEVEMENTS",
    content: "",
    order:   5,
  },
];

const NAV_LINKS = [
  { label: "Analysis", href: "/job-input" },
  { label: "Resume",   href: "/resume" },
];

/* ── Page Component ──────────────────────────────────────────── */

export default function ATSResumePage() {
  const [personalInfo, setPersonalInfo] = useState(DEFAULT_PERSONAL);
  const [sections,     setSections]     = useState(DEFAULT_SECTIONS);
  const [formatting,   setFormatting]   = useState(DEFAULT_FORMATTING);
  const [hydrated,     setHydrated]     = useState(false);

  const previewRef    = useRef(null);
  const autosaveTimer = useRef(null);

  /* ── Load from localStorage on mount ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.personalInfo) setPersonalInfo(saved.personalInfo);
        if (saved.sections)     setSections(saved.sections);
        if (saved.formatting)   setFormatting(saved.formatting);
      }
    } catch {/* ignore parse errors */}
    setHydrated(true);
  }, []);

  /* ── Autosave every 2 seconds on change ── */
  useEffect(() => {
    if (!hydrated) return;
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ personalInfo, sections, formatting }));
      } catch {/* storage full, ignore */}
    }, 2000);
    return () => clearTimeout(autosaveTimer.current);
  }, [personalInfo, sections, formatting, hydrated]);

  /* ── Handlers ── */
  const handlePersonalInfoChange = useCallback((field, value) =>
    setPersonalInfo(prev => ({ ...prev, [field]: value })), []);

  const handleReset = () => {
    setPersonalInfo(DEFAULT_PERSONAL);
    setSections(DEFAULT_SECTIONS);
    setFormatting(DEFAULT_FORMATTING);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  };

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <Navbar />

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 24px 60px" }}>

        {/* ── Page Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "28px",
        }}>
          <div style={{
            width: "44px", height: "44px", flexShrink: 0,
            borderRadius: "var(--radius-md)",
            background: "var(--primary-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--primary)",
          }}>
            <FileText size={22} strokeWidth={2} />
          </div>
          <div>
            <p style={{
              fontSize: "10.5px", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--text-muted)", margin: "0 0 3px",
            }}>Builder</p>
            <h1 style={{ fontSize: "1.55rem", margin: 0, color: "var(--text-heading)" }}>
              ATS Resume Builder
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
              Build your resume with rich text editing — live A4 preview &amp; PDF export.
            </p>
          </div>
        </div>

        {/* ── Two-column grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(340px, 480px) 1fr",
          gap: "32px",
          alignItems: "start",
        }}>

          {/* ══════════════════════════════════════
              LEFT — Editor panel
          ══════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Formatting toolbar */}
            <FormattingToolbar
              formatting={formatting}
              onChange={setFormatting}
            />

            {/* Personal Info */}
            <div style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "18px 18px 16px",
              marginBottom: "16px",
              boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
            }}>
              <p style={PANEL_TITLE}>Personal Information</p>
              <PersonalInfoForm
                personalInfo={personalInfo}
                onChange={handlePersonalInfoChange}
              />
            </div>

            {/* Sections */}
            <div style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "18px 18px 16px",
              marginBottom: "16px",
              boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
            }}>
              <p style={PANEL_TITLE}>Resume Sections</p>
              <p style={{ fontSize: "11.5px", color: "#9ca3af", margin: "-8px 0 14px" }}>
                Drag to reorder · click to expand · rich text supported
              </p>
              <RichSectionInput
                sections={sections}
                onSectionsChange={setSections}
              />
            </div>

            {/* Actions */}
            <div style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "14px 18px",
              boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
            }}>
              <ResumeActions
                previewRef={previewRef}
                personalInfo={personalInfo}
                onReset={handleReset}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════
              RIGHT — Live A4 Preview
          ══════════════════════════════════════ */}
          <div style={{
            position: "sticky",
            top: "calc(var(--navbar-h, 60px) + 16px)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}>
              <p style={{
                fontSize: "11px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: "var(--text-muted)", margin: 0,
              }}>
                Live Preview
              </p>
              <span style={{
                fontSize: "10.5px",
                color: "#9ca3af",
                background: "#f3f4f6",
                padding: "2px 10px",
                borderRadius: "20px",
              }}>
                A4 · 794px
              </span>
            </div>

            {/* Scale wrapper — makes A4 fit inside the column */}
            <div style={{
              overflowX: "auto",
              overflowY: "visible",
              paddingBottom: "16px",
            }}>
              <ResumePreview
                ref={previewRef}
                personalInfo={personalInfo}
                sections={sections}
                formatting={formatting}
              />
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ── Small helpers ── */
const PANEL_TITLE = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6b7280",
  margin: "0 0 14px",
};
