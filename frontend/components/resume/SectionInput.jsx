/**
 * SectionInput.jsx
 *
 * Allows the user to:
 *   - Type a section title and description
 *   - Add the section to the list
 *   - Edit an existing section inline
 *   - Delete a section
 *   - Reorder sections (move up / move down)
 */

import { useState } from "react";

export default function SectionInput({ sections, onSectionsChange }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // null = no section being edited; otherwise holds the index being edited
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // ── Add new section ────────────────────────────────────────────────────────
  const handleAdd = () => {
    const trimTitle = title.trim();
    const trimDesc = description.trim();
    if (!trimTitle && !trimDesc) return;

    onSectionsChange([...sections, { title: trimTitle, description: trimDesc }]);
    setTitle("");
    setDescription("");
  };

  // ── Delete section ─────────────────────────────────────────────────────────
  const handleDelete = (index) => {
    onSectionsChange(sections.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  // ── Start editing ──────────────────────────────────────────────────────────
  const startEdit = (index) => {
    setEditingIndex(index);
    setEditTitle(sections[index].title);
    setEditDescription(sections[index].description);
  };

  // ── Save edit ──────────────────────────────────────────────────────────────
  const saveEdit = () => {
    const updated = sections.map((s, i) =>
      i === editingIndex
        ? { title: editTitle.trim(), description: editDescription.trim() }
        : s
    );
    onSectionsChange(updated);
    setEditingIndex(null);
  };

  // ── Move section up ────────────────────────────────────────────────────────
  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...sections];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onSectionsChange(updated);
    if (editingIndex === index) setEditingIndex(index - 1);
  };

  // ── Move section down ──────────────────────────────────────────────────────
  const moveDown = (index) => {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onSectionsChange(updated);
    if (editingIndex === index) setEditingIndex(index + 1);
  };

  return (
    <div className="border border-black p-4 bg-white mt-4">
      <h2 className="text-base font-bold mb-3 text-black">Resume Sections</h2>

      {/* ── Add new section form ── */}
      <div className="space-y-2 mb-4">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Section Title
          </label>
          <input
            type="text"
            placeholder="e.g. Education, Experience, Skills"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-black p-2 text-sm text-black bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Description
          </label>
          <textarea
            placeholder="e.g. Mumbai University — BSc IT — 2026"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-black p-2 text-sm text-black bg-white focus:outline-none resize-none"
          />
        </div>

        <button
          onClick={handleAdd}
          className="border border-black px-4 py-1 text-sm text-black bg-white hover:bg-black hover:text-white"
        >
          + Add Section
        </button>
      </div>

      {/* ── Existing sections list ── */}
      {sections.length === 0 && (
        <p className="text-sm text-gray-500">No sections added yet.</p>
      )}

      {sections.map((section, index) => (
        <div key={index} className="border border-black p-3 mb-2 bg-white">
          {editingIndex === index ? (
            /* ── Edit mode ── */
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full border border-black p-2 text-sm text-black bg-white focus:outline-none"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full border border-black p-2 text-sm text-black bg-white focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="border border-black px-3 py-1 text-xs text-white bg-black"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingIndex(null)}
                  className="border border-black px-3 py-1 text-xs text-black bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div>
              <p className="text-sm font-bold text-black">{section.title || "(No Title)"}</p>
              <p className="text-sm text-black whitespace-pre-line mt-1">
                {section.description || "(No Description)"}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => startEdit(index)}
                  className="text-xs border border-black px-2 py-0.5 text-black bg-white hover:bg-black hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="text-xs border border-black px-2 py-0.5 text-black bg-white hover:bg-black hover:text-white"
                >
                  Delete
                </button>
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="text-xs border border-black px-2 py-0.5 text-black bg-white disabled:opacity-30 hover:bg-black hover:text-white"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === sections.length - 1}
                  className="text-xs border border-black px-2 py-0.5 text-black bg-white disabled:opacity-30 hover:bg-black hover:text-white"
                >
                  ↓
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
