/**
 * ResumeViewer.jsx
 *
 * Displays the ATS resume text exactly as returned by the backend.
 * Preserves:
 *   - Line breaks
 *   - Section spacing
 *   - Indentation
 *   - Alignment (via monospace font + pre-wrap)
 *
 * Props:
 *   text     {string}  — full resume plain-text
 *   filename {string}  — display name shown in the top bar
 */

import { FileText } from "lucide-react";

export default function ResumeViewer({ text, filename = "ATS_Resume.txt" }) {
  if (!text) return null;

  return (
    <div
      className="card"
      style={{ padding: 0, overflow: "hidden" }}
      id="resume-viewer-card"
    >
      {/* ── Top bar ── */}
      <div style={{
        padding: "12px 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <FileText size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <span style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--text-muted)",
          letterSpacing: "0.04em",
        }}>
          {filename}
        </span>
      </div>

      {/* ── Resume content ── */}
      {/*
        IMPORTANT: Using <pre> with white-space: pre-wrap preserves:
          - All line breaks from the LLM output
          - Section spacing (blank lines between sections)
          - Indentation (spaces/tabs for bullet alignment)
        word-break: break-word prevents long URLs from overflowing.
        overflow-x: auto handles any lines that exceed the container width.
      */}
      <div
        id="resume-viewer-content"
        style={{
          maxHeight: "74vh",
          overflowY: "auto",
          overflowX: "auto",
          background: "var(--bg-surface)",
        }}
      >
        <pre style={{
          fontFamily: "'Courier New', 'Consolas', 'Lucida Console', monospace",
          fontSize: "0.875rem",
          lineHeight: 1.8,
          color: "var(--text-heading)",
          background: "var(--bg-surface)",
          padding: "32px 40px",
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          minWidth: "min-content",
        }}>
          {text}
        </pre>
      </div>
    </div>
  );
}
