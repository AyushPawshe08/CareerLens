/**
 * SectionInput.jsx
 *
 * Allows the user to:
 *   - Add a new resume section (title + description)
 *   - Edit a section inline
 *   - Delete a section
 *   - Reorder sections (move up / move down)
 */

import { useState } from "react";
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Check, X } from "lucide-react";

export default function SectionInput({ sections, onSectionsChange }) {

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");

  const [editingIndex,      setEditingIndex]      = useState(null);
  const [editTitle,         setEditTitle]         = useState("");
  const [editDescription,   setEditDescription]   = useState("");

  /* ── Add ── */
  const handleAdd = () => {
    const t = title.trim();
    const d = description.trim();
    if (!t && !d) return;
    onSectionsChange([...sections, { title: t, description: d }]);
    setTitle("");
    setDescription("");
  };

  /* ── Delete ── */
  const handleDelete = (i) => {
    onSectionsChange(sections.filter((_, idx) => idx !== i));
    if (editingIndex === i) setEditingIndex(null);
  };

  /* ── Edit ── */
  const startEdit = (i) => {
    setEditingIndex(i);
    setEditTitle(sections[i].title);
    setEditDescription(sections[i].description);
  };

  const saveEdit = () => {
    onSectionsChange(sections.map((s, i) =>
      i === editingIndex
        ? { title: editTitle.trim(), description: editDescription.trim() }
        : s
    ));
    setEditingIndex(null);
  };

  /* ── Reorder ── */
  const moveUp = (i) => {
    if (i === 0) return;
    const u = [...sections];
    [u[i - 1], u[i]] = [u[i], u[i - 1]];
    onSectionsChange(u);
    if (editingIndex === i) setEditingIndex(i - 1);
  };

  const moveDown = (i) => {
    if (i === sections.length - 1) return;
    const u = [...sections];
    [u[i], u[i + 1]] = [u[i + 1], u[i]];
    onSectionsChange(u);
    if (editingIndex === i) setEditingIndex(i + 1);
  };

  return (
    <div className="card-sm">
      <p className="section-title">Resume Sections</p>

      {/* ── Add form ── */}
      <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <label htmlFor="section-title" className="label">Section Title</label>
          <input
            id="section-title"
            type="text"
            placeholder="e.g. Education, Experience, Skills"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="section-desc" className="label">Description</label>
          <textarea
            id="section-desc"
            placeholder="e.g. Mumbai University — BSc IT — 2026"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input"
          />
        </div>
        <button
          id="add-section-btn"
          onClick={handleAdd}
          className="btn btn-secondary btn-sm"
          style={{ alignSelf: "flex-start" }}
        >
          <Plus size={14} /> Add section
        </button>
      </div>

      <hr className="divider" style={{ margin: "0 0 14px" }} />

      {/* ── Empty state ── */}
      {sections.length === 0 && (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
          No sections yet — add your first one above.
        </p>
      )}

      {/* ── Section list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {sections.map((section, i) => (
          <div key={i} style={{
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-input)",
            padding: "12px 14px",
          }}>
            {editingIndex === i ? (
              /* Edit mode */
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input"
                  style={{ fontSize: "0.875rem" }}
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="input"
                  style={{ fontSize: "0.875rem" }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={saveEdit} className="btn btn-primary btn-sm">
                    <Check size={13} /> Save
                  </button>
                  <button onClick={() => setEditingIndex(null)} className="btn btn-ghost btn-sm">
                    <X size={13} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-heading)", margin: "0 0 3px" }}>
                    {section.title || "(No Title)"}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", whiteSpace: "pre-line", margin: 0 }}>
                    {section.description || "(No Description)"}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 7px" }}
                    title="Move up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === sections.length - 1}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 7px" }}
                    title="Move down"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => startEdit(i)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 7px" }}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 7px", color: "var(--danger)" }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
