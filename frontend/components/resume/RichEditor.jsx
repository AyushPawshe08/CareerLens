/**
 * RichEditor.jsx
 *
 * A lightweight contentEditable rich-text editor.
 * Supports: Bold, Italic, Unordered List, Custom dash-bullet, Clear Formatting.
 * Emits onChange(htmlString) on every input.
 * Does NOT use any external library — pure execCommand.
 */
"use client";

import { useRef, useEffect, useCallback } from "react";

const TOOLBAR_BTN = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  border: "1px solid #d1d5db",
  borderRadius: "5px",
  background: "#fff",
  cursor: "pointer",
  fontSize: "13px",
  color: "#374151",
  transition: "background 0.12s, border-color 0.12s",
  flexShrink: 0,
  userSelect: "none",
};

export default function RichEditor({ value, onChange, placeholder = "Write content here…", minHeight = 120 }) {
  const editorRef = useRef(null);
  const isComposing = useRef(false);

  // Sync external value → DOM (only when focus is outside to avoid cursor jump)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerHTML !== (value || "")) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  }, []);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertDashBullet = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    // Insert a dash-bullet line
    document.execCommand("insertHTML", false, "<div>– </div>");
    emitChange();
  }, [emitChange]);

  const clearFormatting = useCallback(() => {
    exec("removeFormat");
    // Also strip lists
    const el = editorRef.current;
    if (el) {
      const plain = el.innerText;
      el.innerHTML = plain.split("\n").map(l => `<div>${l || "<br>"}</div>`).join("");
      onChange(el.innerHTML);
    }
  }, [exec, onChange]);

  const handleInput = useCallback(() => {
    if (!isComposing.current) emitChange();
  }, [emitChange]);

  const handleKeyDown = useCallback((e) => {
    // Ctrl+B / Ctrl+I shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); exec("bold"); }
      if (e.key === "i") { e.preventDefault(); exec("italic"); }
    }
  }, [exec]);

  return (
    <div style={{ border: "1px solid #d1d5db", borderRadius: "8px", overflow: "hidden", background: "#fff" }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 8px",
        borderBottom: "1px solid #e5e7eb",
        background: "#f9fafb",
        flexWrap: "wrap",
      }}>
        <ToolBtn title="Bold (Ctrl+B)" onClick={() => exec("bold")}>
          <strong style={{ fontSize: "13px" }}>B</strong>
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" onClick={() => exec("italic")}>
          <em style={{ fontSize: "13px" }}>I</em>
        </ToolBtn>
        <div style={{ width: "1px", height: "18px", background: "#d1d5db", margin: "0 2px" }} />
        <ToolBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <span style={{ fontSize: "12px" }}>• List</span>
        </ToolBtn>
        <ToolBtn title="Insert dash bullet (–)" onClick={insertDashBullet}>
          <span style={{ fontSize: "12px" }}>— Bullet</span>
        </ToolBtn>
        <div style={{ width: "1px", height: "18px", background: "#d1d5db", margin: "0 2px" }} />
        <ToolBtn title="Clear formatting" onClick={clearFormatting}>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>Tx</span>
        </ToolBtn>
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; emitChange(); }}
        data-placeholder={placeholder}
        style={{
          minHeight: `${minHeight}px`,
          padding: "10px 12px",
          fontSize: "13px",
          lineHeight: "1.7",
          color: "#1f2937",
          outline: "none",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] ul { padding-left: 1.4em; margin: 4px 0; }
        [contenteditable] li { margin: 2px 0; }
      `}</style>
    </div>
  );
}

function ToolBtn({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={TOOLBAR_BTN}
      onMouseEnter={e => { e.currentTarget.style.background = "#eef1fd"; e.currentTarget.style.borderColor = "#4f6ef7"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#d1d5db"; }}
    >
      {children}
    </button>
  );
}
