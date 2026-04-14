"use client";

/**
 * ATSResumePage.jsx
 *
 * Main page for the ATS Resume Generator.
 * Ties together PersonalInfoForm, SectionInput, and ResumePreview.
 *
 * Features:
 *   - Live preview updates as user types
 *   - Save Resume → POST /resume/save
 *   - Download PDF → uses html2pdf.js (dynamic import, client-side only)
 *
 * Layout: two-column grid
 *   LEFT  → inputs (PersonalInfoForm + SectionInput + action buttons)
 *   RIGHT → live ResumePreview
 */

import { useState, useRef } from "react";
import PersonalInfoForm from "@/components/resume/PersonalInfoForm";
import SectionInput from "@/components/resume/SectionInput";
import ResumePreview from "@/components/resume/ResumePreview";
import { saveResume } from "@/services/resumeApi";

export default function ATSResumePage() {
  // ── Personal info state ─────────────────────────────────────────────────
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    github: "",
    linkedin: "",
    portfolio: "",
  });

  // ── Dynamic sections state ──────────────────────────────────────────────
  const [sections, setSections] = useState([]);

  // ── Save status ─────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // ── PDF state ────────────────────────────────────────────────────────────
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ── Ref to the preview DOM node for html2pdf ────────────────────────────
  const previewRef = useRef(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Update a single personal info field
  const handlePersonalInfoChange = (field, value) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  // Save resume to backend
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      await saveResume({ personalInfo, sections });
      setSaveMessage("Resume saved successfully.");
    } catch (err) {
      console.error("Save failed:", err);
      setSaveMessage(
        err.response?.data?.detail || "Failed to save resume. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Download resume as PDF using html2pdf.js (dynamically imported for SSR safety)
  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;

    setDownloadingPdf(true);

    try {
      // Dynamic import — avoids SSR errors since html2pdf accesses window/document
      const html2pdf = (await import("html2pdf.js")).default;

      const filename = personalInfo.name
        ? `${personalInfo.name.replace(/\s+/g, "_")}_Resume.pdf`
        : "Resume.pdf";

      const options = {
        margin:       [10, 12, 10, 12],   // top, right, bottom, left (mm)
        filename:     filename,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(options).from(previewRef.current).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between border-b border-black pb-3 mb-6">
        <h1 className="text-xl font-bold">ATS Resume Generator</h1>

        {/* Download PDF button — top right for easy access */}
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="border border-black px-4 py-2 text-sm text-black bg-white hover:bg-black hover:text-white disabled:opacity-40"
        >
          {downloadingPdf ? "Generating PDF..." : "⬇ Download PDF"}
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* ── LEFT SIDE: Inputs ── */}
        <div>
          {/* Personal info fields */}
          <PersonalInfoForm
            personalInfo={personalInfo}
            onChange={handlePersonalInfoChange}
          />

          {/* Dynamic sections (add / edit / delete / reorder) */}
          <SectionInput
            sections={sections}
            onSectionsChange={setSections}
          />

          {/* Save Resume button */}
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="border border-black px-4 py-2 text-sm text-black bg-white hover:bg-black hover:text-white disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Resume"}
            </button>

            {/* Save result message */}
            {saveMessage && (
              <p className="mt-2 text-sm text-black border border-black p-2">
                {saveMessage}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDE: Live preview ── */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-2">
            Live Preview
          </p>

          {/* forwardRef passes previewRef down into the preview DOM node */}
          <ResumePreview
            ref={previewRef}
            personalInfo={personalInfo}
            sections={sections}
          />
        </div>

      </div>
    </div>
  );
}
