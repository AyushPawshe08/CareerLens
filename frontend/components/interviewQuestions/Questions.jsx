"use client";

import { useState, useEffect } from "react";
import API from "@/utils/api";

/**
 * Questions component
 *
 * Props:
 *   careerInputId (string) — the career input ID to fetch questions for
 *
 * Flow:
 *   1. Try GET /interview-questions/{careerInputId} (already generated?)
 *   2. If 404 → POST to trigger generation → poll status → fetch result
 *
 * Backend field names (from question_schema.py):
 *   technical_questions   — List[str]
 *   behavioural_questions — List[str]  (British spelling)
 *   hr_questions          — List[str]
 */

export default function Questions({ careerInputId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which section is expanded: "technical" | "behavioural" | "hr" | null
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!careerInputId) return;

    let isMounted = true;
    let pollInterval = null;

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError("");

        // Step 1: Check if questions already exist
        try {
          const existing = await API.get(`/interview-questions/${careerInputId}`);
          if (isMounted && existing.data) {
            setData(existing.data);
            setLoading(false);
            return;
          }
        } catch (err) {
          // 404 is expected if not yet generated — continue to trigger
          if (err.response?.status !== 404) throw err;
        }

        // Step 2: Trigger generation via POST
        const triggerRes = await API.post(`/interview-questions/${careerInputId}`);

        // If backend returned immediately (already cached)
        if (triggerRes.data.status === "completed") {
          const result = await API.get(`/interview-questions/${careerInputId}`);
          if (isMounted) {
            setData(result.data);
            setLoading(false);
          }
          return;
        }

        // Step 3: Poll status until completed or failed
        const taskId = triggerRes.data.task_id;
        if (!taskId) throw new Error("No task ID returned from server.");

        pollInterval = setInterval(async () => {
          if (!isMounted) {
            clearInterval(pollInterval);
            return;
          }
          try {
            const statusRes = await API.get(`/interview-questions/status/${taskId}`);
            const { status, error: taskError } = statusRes.data;

            if (status === "completed") {
              clearInterval(pollInterval);
              const finalRes = await API.get(`/interview-questions/${careerInputId}`);
              if (isMounted) {
                setData(finalRes.data);
                setLoading(false);
              }
            } else if (status === "failed") {
              clearInterval(pollInterval);
              if (isMounted) {
                setError(taskError || "Interview question generation failed.");
                setLoading(false);
              }
            }
            // "queued" or "processing" → keep polling
          } catch (pollErr) {
            clearInterval(pollInterval);
            if (isMounted) {
              setError(pollErr.response?.data?.detail || "Failed to check status.");
              setLoading(false);
            }
          }
        }, 2000); // poll every 2 seconds

      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load interview questions.");
          setLoading(false);
        }
      }
    };

    fetchQuestions();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [careerInputId]);

  // Toggle a section open/closed
  const toggleSection = (section) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  // Render a collapsible section
  const renderSection = (title, key, questions) => {
    if (!questions || questions.length === 0) return null;
    const isOpen = activeSection === key;

    return (
      <div key={key} style={{ border: "1px solid black", marginTop: "8px" }}>
        {/* Section header — acts as toggle */}
        <div
          onClick={() => toggleSection(key)}
          style={{ padding: "8px", cursor: "pointer", fontWeight: "bold" }}
        >
          {isOpen ? "▼" : "▶"} {title} ({questions.length})
        </div>

        {/* Questions list — only shown when active */}
        {isOpen && (
          <div style={{ padding: "8px 16px" }}>
            {questions.map((q, i) => (
              <p key={i} style={{ marginTop: "6px" }}>
                {i + 1}. {q}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ background: "white", color: "black", padding: "16px" }}>
        Loading interview questions...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "white", color: "black", padding: "16px" }}>
        Failed to load interview questions.
      </div>
    );
  }

  if (
    !data ||
    (!data.technical_questions?.length &&
      !data.behavioural_questions?.length &&
      !data.hr_questions?.length)
  ) {
    return (
      <div style={{ background: "white", color: "black", padding: "16px" }}>
        No interview questions found.
      </div>
    );
  }

  return (
    <div style={{ background: "white", color: "black", padding: "16px" }}>
      {renderSection("Technical Questions", "technical", data.technical_questions)}
      {renderSection("Behavioral Questions", "behavioural", data.behavioural_questions)}
      {renderSection("HR Questions", "hr", data.hr_questions)}
    </div>
  );
}
