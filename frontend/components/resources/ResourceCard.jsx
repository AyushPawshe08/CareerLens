/**
 * ResourceCard.jsx
 *
 * Displays learning resources for a single missing skill.
 * Follows the existing card / tag / section-title design system.
 *
 * Props:
 *   resource — ResourceItem shape:
 *     { skill, videos: string[], documentation: string[],
 *       practice: string[], roadmap: string | null }
 */

import { Video, FileText, Code2, Map } from "lucide-react";

const SECTIONS = [
  {
    key: "videos",
    label: "Videos",
    icon: <Video size={14} strokeWidth={2} />,
    color: "var(--danger)",
    bg: "var(--danger-bg)",
  },
  {
    key: "documentation",
    label: "Documentation",
    icon: <FileText size={14} strokeWidth={2} />,
    color: "var(--primary)",
    bg: "var(--primary-light)",
  },
  {
    key: "practice",
    label: "Practice",
    icon: <Code2 size={14} strokeWidth={2} />,
    color: "var(--success)",
    bg: "var(--success-bg)",
  },
  {
    key: "roadmap",
    label: "Roadmap",
    icon: <Map size={14} strokeWidth={2} />,
    color: "var(--warning)",
    bg: "var(--warning-bg)",
    single: true,  // roadmap is a single string, not array
  },
];

function isUrl(str) {
  return typeof str === "string" && (str.startsWith("http://") || str.startsWith("https://"));
}

function ResourceLink({ href, label }) {
  if (isUrl(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          color: "var(--primary)",
          fontSize: "0.875rem",
          textDecoration: "none",
          wordBreak: "break-all",
        }}
        onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
        onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
      >
        {label || href}
      </a>
    );
  }
  // Plain text (e.g. "Search YouTube: Docker tutorial")
  return (
    <span style={{ fontSize: "0.875rem", color: "var(--text-body)" }}>
      {label || href}
    </span>
  );
}

export default function ResourceCard({ resource }) {
  const { skill, videos = [], documentation = [], practice = [], roadmap } = resource;

  return (
    <div className="card" style={{ marginBottom: "16px" }}>

      {/* Skill name */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{
          width: "36px", height: "36px", flexShrink: 0,
          borderRadius: "var(--radius-sm)",
          background: "var(--primary-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--primary)", fontWeight: 700, fontSize: "0.8rem",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {skill.slice(0, 2)}
        </div>
        <h3 style={{ fontSize: "1.0625rem", margin: 0 }}>{skill}</h3>
      </div>

      {/* Resource sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {SECTIONS.map(({ key, label, icon, color, bg, single }) => {
          const items = single
            ? (roadmap ? [roadmap] : [])
            : resource[key] || [];

          if (!items.length) return null;

          return (
            <div key={key}>
              {/* Section header */}
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                marginBottom: "8px",
              }}>
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "22px", height: "22px",
                  borderRadius: "4px",
                  background: bg, color,
                }}>
                  {icon}
                </span>
                <span style={{
                  fontSize: "0.75rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                }}>
                  {label}
                </span>
              </div>

              {/* Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    padding: "7px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                  }}>
                    <ResourceLink href={item} label={item} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
