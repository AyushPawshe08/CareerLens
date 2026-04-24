"use client";

/**
 * ATSResumePage  —  /resume
 *
 * Layout: two-column grid
 *   LEFT  → PersonalInfoForm + SectionInput + action buttons
 *   RIGHT → live ResumePreview
 */

import { useState, useRef } from "react";
import PersonalInfoForm from "@/components/resume/PersonalInfoForm";
import SectionInput     from "@/components/resume/SectionInput";
import ResumePreview    from "@/components/resume/ResumePreview";
import { saveResume }   from "@/services/resumeApi";
import Navbar           from "@/components/ui/Navbar";
import { Download, Save, FileText } from "lucide-react";

const NAV_LINKS = [
  { label: "Analysis",            href: "/job-input" },
  { label: "Resume",              href: "/resume" },
];

export default function ATSResumePage() {

  const [personalInfo, setPersonalInfo] = useState({
    name: "", email: "", phone: "", github: "", linkedin: "", portfolio: "",
  });

  const [sections,       setSections]       = useState([]);
  const [saving,         setSaving]         = useState(false);
  const [saveMessage,    setSaveMessage]    = useState("");
  const [saveFailed,     setSaveFailed]     = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const previewRef = useRef(null);

  const handlePersonalInfoChange = (field, value) =>
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    setSaveFailed(false);
    try {
      await saveResume({ personalInfo, sections });
      setSaveMessage("Resume saved successfully.");
      setSaveFailed(false);
    } catch (err) {
      setSaveMessage(err.response?.data?.detail || "Failed to save. Please try again.");
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  /* ── PDF download ── */
  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setDownloadingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = personalInfo.name
        ? `${personalInfo.name.replace(/\s+/g, "_")}_Resume.pdf`
        : "Resume.pdf";
      await html2pdf().set({
        margin:      [10, 12, 10, 12],
        filename,
        image:       { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(previewRef.current).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <Navbar links={NAV_LINKS} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "36px 24px" }}>

        {/* ── Page header ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
          flexWrap: "wrap", gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "42px", height: "42px",
              borderRadius: "var(--radius-md)",
              background: "var(--primary-light)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--primary)", flexShrink: 0,
            }}>
              <FileText size={20} strokeWidth={2} />
            </div>
            <div>
              <p className="section-title" style={{ marginBottom: "2px" }}>Builder</p>
              <h1 style={{ fontSize: "1.5rem", margin: 0 }}>ATS Resume Generator</h1>
            </div>
          </div>

          {/* Top-right: Download PDF */}
          <button
            id="download-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-secondary"
          >
            {downloadingPdf ? (
              <>
                <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                Generating…
              </>
            ) : (
              <>
                <Download size={15} />
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* ── Two-column grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}>

          {/* LEFT — Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            <PersonalInfoForm
              personalInfo={personalInfo}
              onChange={handlePersonalInfoChange}
            />

            <SectionInput
              sections={sections}
              onSectionsChange={setSections}
            />

            {/* Save button */}
            <div>
              <button
                id="save-resume-btn"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <>
                    <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    Save resume
                  </>
                )}
              </button>

              {saveMessage && (
                <div
                  className={`alert ${saveFailed ? "alert-error" : "alert-success"}`}
                  style={{ marginTop: "12px" }}
                >
                  {saveMessage}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Live preview */}
          <div style={{ position: "sticky", top: "calc(var(--navbar-h) + 16px)" }}>
            <p className="section-title" style={{ marginBottom: "8px" }}>Live Preview</p>
            <ResumePreview
              ref={previewRef}
              personalInfo={personalInfo}
              sections={sections}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
