/**
 * ResumeActions.jsx
 *
 * Action button bar for the ATS Resume Generator page.
 *
 * Buttons:
 *   1. Download PDF  — uses html2pdf.js (already installed) to capture
 *                      the #resume-viewer-content element and export as PDF.
 *                      Falls back to plain-text .txt if html2pdf fails.
 *   2. Download .txt — lightweight plain-text download (always works).
 *   3. Regenerate    — calls parent handler to re-trigger generation.
 *
 * Props:
 *   resumeText     {string}
 *   filename       {string}
 *   onRegenerate   {() => Promise<void>}
 *   regenerating   {boolean}
 */

"use client";

import { useState } from "react";
import { Download, RotateCcw, FileText } from "lucide-react";

export default function ResumeActions({
  resumeText,
  filename = "ATS_Resume",
  onRegenerate,
  regenerating = false,
}) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingTxt, setDownloadingTxt] = useState(false);

  /* ── PDF download via html2pdf.js ── */
  const handleDownloadPdf = async () => {
    if (!resumeText || downloadingPdf) return;
    setDownloadingPdf(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      // Build a clean, self-contained HTML string for html2pdf to render.
      // We replicate the monospace / pre-wrap style inline so the PDF
      // matches the on-screen preview exactly.
      const htmlContent = `
        <div style="
          font-family: 'Courier New', Consolas, monospace;
          font-size: 11pt;
          line-height: 1.8;
          color: #1a1f36;
          white-space: pre-wrap;
          word-break: break-word;
          padding: 0;
          margin: 0;
        ">${escapeHtml(resumeText)}</div>
      `;

      const element = document.createElement("div");
      element.innerHTML = htmlContent;
      document.body.appendChild(element);

      await html2pdf()
        .set({
          margin:      [12, 14, 12, 14],          // top, right, bottom, left (mm)
          filename:    `${filename}.pdf`,
          image:       { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak:   { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(element)
        .save();

      document.body.removeChild(element);
    } catch (err) {
      console.error("PDF generation failed — falling back to .txt:", err);
      handleDownloadTxt();
    } finally {
      setDownloadingPdf(false);
    }
  };

  /* ── Plain-text download ── */
  const handleDownloadTxt = () => {
    if (!resumeText || downloadingTxt) return;
    setDownloadingTxt(true);
    try {
      const blob = new Blob([resumeText], { type: "text/plain;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${filename}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingTxt(false);
    }
  };

  const disabled = !resumeText;

  return (
    <div style={{
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: "20px",
    }}>

      {/* Download PDF */}
      <button
        id="ats-download-pdf-btn"
        onClick={handleDownloadPdf}
        disabled={disabled || downloadingPdf || regenerating}
        className="btn btn-primary"
      >
        {downloadingPdf ? (
          <>
            <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
            Generating PDF…
          </>
        ) : (
          <>
            <Download size={15} />
            Download PDF
          </>
        )}
      </button>

      {/* Download .txt */}
      <button
        id="ats-download-txt-btn"
        onClick={handleDownloadTxt}
        disabled={disabled || downloadingTxt || regenerating}
        className="btn btn-secondary"
      >
        {downloadingTxt ? (
          <>
            <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
            Saving…
          </>
        ) : (
          <>
            <FileText size={15} />
            Download .txt
          </>
        )}
      </button>

      {/* Regenerate */}
      <button
        id="ats-regenerate-btn"
        onClick={onRegenerate}
        disabled={regenerating || downloadingPdf}
        className="btn btn-ghost"
      >
        {regenerating ? (
          <>
            <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
            Regenerating…
          </>
        ) : (
          <>
            <RotateCcw size={15} />
            Regenerate Resume
          </>
        )}
      </button>

    </div>
  );
}

/** Escape HTML entities so the resume text renders as literal text in the PDF. */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
