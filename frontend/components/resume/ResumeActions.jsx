/**
 * ResumeActions.jsx  (v2)
 *
 * Action bar for the /resume page builder.
 * - Download PDF: uses html2pdf.js targeting the #resume-preview div
 * - Reset: clears all state (lifted up via onReset)
 *
 * Props:
 *   previewRef    {React.RefObject} — ref pointing to the A4 preview div
 *   personalInfo  {object}          — used to derive filename
 *   onReset       {() => void}
 */
"use client";

import { useState } from "react";
import { Download, RotateCcw } from "lucide-react";

export default function ResumeActions({ previewRef, personalInfo, onReset }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [confirmReset,   setConfirmReset]   = useState(false);

  const handleDownloadPdf = async () => {
    const el = previewRef?.current;
    if (!el || downloadingPdf) return;
    setDownloadingPdf(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const name     = personalInfo?.name?.trim();
      const filename = name
        ? `${name.replace(/\s+/g, "_")}_Resume.pdf`
        : "Resume.pdf";

      await html2pdf()
        .set({
          margin:      [10, 10, 10, 10],
          filename,
          image:       { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak:   { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(el)
        .save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setConfirmReset(false);
    onReset();
  };

  return (
    <div style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      alignItems: "center",
      padding: "14px 0 0",
      borderTop: "1px solid #e5e7eb",
      marginTop: "8px",
    }}>

      {/* Download PDF */}
      <button
        id="download-pdf-btn"
        type="button"
        onClick={handleDownloadPdf}
        disabled={downloadingPdf}
        style={{
          ...BTN_PRIMARY,
          opacity: downloadingPdf ? 0.7 : 1,
          cursor: downloadingPdf ? "not-allowed" : "pointer",
        }}
      >
        {downloadingPdf ? (
          <>
            <span style={SPINNER} />
            Generating PDF…
          </>
        ) : (
          <>
            <Download size={15} />
            Download PDF
          </>
        )}
      </button>

      {/* Reset */}
      <button
        id="reset-resume-btn"
        type="button"
        onClick={handleReset}
        style={{
          ...BTN_GHOST,
          color: confirmReset ? "#dc2626" : "#6b7280",
          borderColor: confirmReset ? "#fca5a5" : "#d1d5db",
          background: confirmReset ? "#fef2f2" : "transparent",
        }}
      >
        <RotateCcw size={14} />
        {confirmReset ? "Click again to confirm" : "Reset all"}
      </button>

      {/* Autosave hint */}
      <span style={{ marginLeft: "auto", fontSize: "11px", color: "#9ca3af" }}>
        ✓ Auto-saved to browser
      </span>
    </div>
  );
}

const BTN_PRIMARY = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  padding: "9px 18px",
  background: "#4f6ef7",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "13.5px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.15s",
};

const BTN_GHOST = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  padding: "9px 16px",
  background: "transparent",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s",
};

const SPINNER = {
  display: "inline-block",
  width: "13px",
  height: "13px",
  border: "2px solid rgba(255,255,255,0.35)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
};
