"use client";

import { useState, useEffect } from "react";
import API from "@/utils/api";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Questions component
 *
 * Props:
 *   careerInputId (string) — career input ID to fetch questions for
 *
 * Flow:
 *   1. GET /interview-questions/{careerInputId}  → already generated?
 *   2. 404 → POST to trigger → poll → fetch result
 */

const CATEGORIES = [
  {
    key:   "technical",
    field: "technical_questions",
    label: "Technical Questions",
    icon:  "⚙️",
    color: "var(--primary)",
    bg:    "var(--primary-light)",
  },
  {
    key:   "behavioural",
    field: "behavioural_questions",
    label: "Behavioural Questions",
    icon:  "🤝",
    color: "var(--success)",
    bg:    "var(--success-bg)",
  },
  {
    key:   "hr",
    field: "hr_questions",
    label: "HR Questions",
    icon:  "💼",
    color: "var(--warning)",
    bg:    "var(--warning-bg)",
  },
];

export default function Questions({ careerInputId }) {

  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!careerInputId) return;
    let isMounted   = true;
    let pollInterval = null;

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError("");

        // Step 1 — already generated?
        try {
          const existing = await API.get(`/interview-questions/${careerInputId}`);
          if (isMounted && existing.data) {
            setData(existing.data);
            setLoading(false);
            return;
          }
        } catch (err) {
          if (err.response?.status !== 404) throw err;
        }

        // Step 2 — trigger generation
        const triggerRes = await API.post(`/interview-questions/${careerInputId}`);

        if (triggerRes.data.status === "completed") {
          const result = await API.get(`/interview-questions/${careerInputId}`);
          if (isMounted) { setData(result.data); setLoading(false); }
          return;
        }

        // Step 3 — poll
        const taskId = triggerRes.data.task_id;
        if (!taskId) throw new Error("No task ID returned.");

        pollInterval = setInterval(async () => {
          if (!isMounted) { clearInterval(pollInterval); return; }
          try {
            const statusRes = await API.get(`/interview-questions/status/${taskId}`);
            const { status, error: taskError } = statusRes.data;
            if (status === "completed") {
              clearInterval(pollInterval);
              const finalRes = await API.get(`/interview-questions/${careerInputId}`);
              if (isMounted) { setData(finalRes.data); setLoading(false); }
            } else if (status === "failed") {
              clearInterval(pollInterval);
              if (isMounted) { setError(taskError || "Generation failed."); setLoading(false); }
            }
          } catch (pollErr) {
            clearInterval(pollInterval);
            if (isMounted) {
              setError(pollErr.response?.data?.detail || "Failed to check status.");
              setLoading(false);
            }
          }
        }, 2000);

      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load interview questions.");
          setLoading(false);
        }
      }
    };

    fetchQuestions();
    return () => { isMounted = false; if (pollInterval) clearInterval(pollInterval); };
  }, [careerInputId]);

  const toggle = (key) => setActiveSection((prev) => (prev === key ? null : key));

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 24px", gap: "16px",
      }}>
        <div className="spinner" />
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Generating your interview questions…
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="alert alert-error" style={{ margin: "24px 0" }}>
        {error}
      </div>
    );
  }

  /* ── Empty ── */
  const hasData = data && (
    data.technical_questions?.length ||
    data.behavioural_questions?.length ||
    data.hr_questions?.length
  );

  if (!hasData) {
    return (
      <div style={{
        textAlign: "center", padding: "60px 24px",
        color: "var(--text-muted)", fontSize: "0.9rem",
      }}>
        No interview questions found for this analysis.
      </div>
    );
  }

  /* ── Questions ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {CATEGORIES.map(({ key, field, label, icon, color, bg }) => {
        const questions = data[field] || [];
        if (!questions.length) return null;
        const isOpen = activeSection === key;

        return (
          <div
            key={key}
            className={`q-section${isOpen ? " open" : ""}`}
          >
            {/* Header */}
            <div
              className="q-section-header"
              onClick={() => toggle(key)}
              id={`q-section-${key}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{
                  width: "34px", height: "34px", borderRadius: "var(--radius-sm)",
                  background: bg, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "1rem", flexShrink: 0,
                }}>
                  {icon}
                </span>
                <div>
                  <p style={{ fontWeight: 700, color: "var(--text-heading)", margin: 0, fontSize: "0.9375rem" }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {questions.length} question{questions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                {isOpen
                  ? <ChevronDown size={18} />
                  : <ChevronRight size={18} />
                }
              </div>
            </div>

            {/* Body */}
            {isOpen && (
              <div className="q-section-body">
                <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {questions.map((q, i) => (
                    <li key={i} style={{
                      display: "flex", gap: "12px", alignItems: "flex-start",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                    }}>
                      <span style={{
                        flexShrink: 0, width: "22px", height: "22px",
                        borderRadius: "50%", background: bg, color,
                        fontSize: "0.72rem", fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-body)", lineHeight: 1.6 }}>
                        {q}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
