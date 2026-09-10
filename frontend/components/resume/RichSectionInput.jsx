/**
 * RichSectionInput.jsx
 *
 * Section manager for the resume builder.
 * Each section card has:
 *   - Title input
 *   - RichEditor (contentEditable rich text)
 *   - Up / Down reorder arrows
 *   - Delete button
 * Supports: add section, edit in-place, reorder, delete.
 * Emits: onSectionsChange([{ id, title, content, order }])
 */
"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import RichEditor from "./RichEditor";

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function RichSectionInput({ sections, onSectionsChange }) {
  const [collapsed, setCollapsed] = useState({});   // { id: true } when collapsed
  const [focused,   setFocused]   = useState(null);  // id of focused card

  /* ── Helpers ── */
  const update = (id, patch) =>
    onSectionsChange(sections.map(s => s.id === id ? { ...s, ...patch } : s));

  const moveUp = (i) => {
    if (i === 0) return;
    const u = [...sections];
    [u[i - 1], u[i]] = [u[i], u[i - 1]];
    onSectionsChange(u.map((s, idx) => ({ ...s, order: idx })));
  };

  const moveDown = (i) => {
    if (i === sections.length - 1) return;
    const u = [...sections];
    [u[i], u[i + 1]] = [u[i + 1], u[i]];
    onSectionsChange(u.map((s, idx) => ({ ...s, order: idx })));
  };

  const del = (id) => {
    onSectionsChange(sections.filter(s => s.id !== id));
    setFocused(prev => prev === id ? null : prev);
  };

  const addSection = () => {
    const id = `sec-${Date.now()}`;
    const newSection = { id, title: "", content: "", order: sections.length };
    onSectionsChange([...sections, newSection]);
    // Auto-expand the new card
    setCollapsed(prev => ({ ...prev, [id]: false }));
    setFocused(id);
  };

  const toggleCollapse = (id) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div>
      {/* ── Section Cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
        {sections.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "32px 16px",
            color: "#9ca3af",
            fontSize: "13px",
            border: "2px dashed #e5e7eb",
            borderRadius: "10px",
          }}>
            No sections yet — click <strong>Add Section</strong> below to start building.
          </div>
        )}

        {sections.map((section, i) => {
          const isCollapsed = !!collapsed[section.id];
          const isFocused   = focused === section.id;
          const preview     = stripHtml(section.content).slice(0, 80);

          return (
            <div
              key={section.id}
              style={{
                background: "#fff",
                border: `1.5px solid ${isFocused ? "#4f6ef7" : "#e5e7eb"}`,
                borderLeft: `3px solid ${isFocused ? "#4f6ef7" : "#e5e7eb"}`,
                borderRadius: "10px",
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: isFocused ? "0 0 0 3px rgba(79,110,247,0.08)" : "0 1px 3px rgba(15,23,42,0.05)",
              }}
              onFocus={() => setFocused(section.id)}
            >
              {/* ── Card Header ── */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderBottom: isCollapsed ? "none" : "1px solid #f3f4f6",
              }}>
                {/* Reorder arrows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
                  <IconBtn onClick={() => moveUp(i)} disabled={i === 0} title="Move up">
                    <ArrowUp size={11} />
                  </IconBtn>
                  <IconBtn onClick={() => moveDown(i)} disabled={i === sections.length - 1} title="Move down">
                    <ArrowDown size={11} />
                  </IconBtn>
                </div>

                {/* Section title input */}
                <input
                  type="text"
                  value={section.title}
                  onChange={e => update(section.id, { title: e.target.value })}
                  placeholder="Section title (e.g. EXPERIENCE)"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#1a1f36",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "transparent",
                    minWidth: 0,
                  }}
                />

                {/* Content preview when collapsed */}
                {isCollapsed && preview && (
                  <span style={{
                    fontSize: "11.5px",
                    color: "#9ca3af",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "160px",
                    flexShrink: 1,
                  }}>
                    {preview}…
                  </span>
                )}

                {/* Collapse / delete */}
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <IconBtn onClick={() => toggleCollapse(section.id)} title={isCollapsed ? "Expand" : "Collapse"}>
                    {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                  </IconBtn>
                  <IconBtn
                    onClick={() => del(section.id)}
                    title="Delete section"
                    danger
                  >
                    <Trash2 size={13} />
                  </IconBtn>
                </div>
              </div>

              {/* ── Rich Editor (visible when expanded) ── */}
              {!isCollapsed && (
                <div style={{ padding: "10px 12px" }}>
                  <RichEditor
                    value={section.content}
                    onChange={html => update(section.id, { content: html })}
                    placeholder={`Write your ${section.title || "section"} content here…\nUse – bullets for ATS-friendly formatting.`}
                    minHeight={100}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add Section Button ── */}
      <button
        type="button"
        id="add-section-btn"
        onClick={addSection}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "9px 16px",
          width: "100%",
          justifyContent: "center",
          border: "2px dashed #d1d5db",
          borderRadius: "10px",
          background: "transparent",
          color: "#6b7280",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "border-color 0.15s, color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "#4f6ef7";
          e.currentTarget.style.color = "#4f6ef7";
          e.currentTarget.style.background = "#f0f4ff";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "#d1d5db";
          e.currentTarget.style.color = "#6b7280";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <Plus size={15} />
        Add Section
      </button>
    </div>
  );
}

/* ── Tiny icon button ── */
function IconBtn({ children, onClick, disabled, danger, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        border: "1px solid #e5e7eb",
        borderRadius: "5px",
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: danger ? "#dc2626" : disabled ? "#d1d5db" : "#6b7280",
        transition: "background 0.12s, color 0.12s",
        padding: 0,
      }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.background = danger ? "#fef2f2" : "#f3f4f6";
          e.currentTarget.style.color = danger ? "#dc2626" : "#1f2937";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = danger ? "#dc2626" : disabled ? "#d1d5db" : "#6b7280";
      }}
    >
      {children}
    </button>
  );
}
