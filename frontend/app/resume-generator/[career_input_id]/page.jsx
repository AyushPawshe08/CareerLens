"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import ResumeViewer  from "@/components/resume/ResumeViewer";
import ResumeActions from "@/components/resume/ResumeActions";
import API from "@/utils/api";
import { buildNavLinks } from "@/utils/navLinks";
import { FileText, RefreshCw } from "lucide-react";

const POLL_MS = 3000;

export default function ResumeGeneratorPage({ params }) {

  const { career_input_id } = use(params);
  const router   = useRouter();
  const navLinks = buildNavLinks(career_input_id);

  const [status,       setStatus]       = useState("loading");
  const [resumeText,   setResumeText]   = useState("");
  const [error,        setError]        = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const pollRef = useRef(null);

  const filename = `ATS_Resume_${career_input_id.slice(0, 8)}`;

  /* ── Helpers ──────────────────────────────────────────────── */

  const fetchResult = async () => {
    const res = await API.get(`/ats-resume/${career_input_id}`);
    // Backend field is `rewritten_resume` — render exactly as returned.
    setResumeText(res.data.rewritten_resume || "");
    setStatus("completed");
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = (taskId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await API.get(`/ats-resume/status/${taskId}`);
        const s   = res.data.status;
        if (s === "completed") {
          stopPolling();
          await fetchResult();
        } else if (s === "failed") {
          stopPolling();
          setError(res.data.error || "Generation failed. Please try again.");
          setStatus("failed");
        } else {
          setStatus(s);   // queued | processing
        }
      } catch (err) {
        stopPolling();
        setError(err.response?.data?.detail || "Failed to check status.");
        setStatus("failed");
      }
    }, POLL_MS);
  };

  const triggerGeneration = async () => {
    setError("");
    setStatus("loading");
    try {
      const res = await API.post(`/ats-resume/${career_input_id}`);
      if (res.data.status === "completed") {
        await fetchResult();
      } else {
        setStatus("queued");
        startPolling(res.data.task_id);
      }
    } catch (err) {
      const code = err.response?.status;
      if (code === 403) {
        setStatus("forbidden");
      } else if (code === 400) {
        setError(err.response?.data?.detail || "Prerequisites not met. Complete analysis first.");
        setStatus("failed");
      } else {
        setError(err.response?.data?.detail || "Resume generation failed. Please try again.");
        setStatus("failed");
      }
    }
  };

  /* ── Mount: check for cached result, trigger if 404 ── */
  useEffect(() => {
    const init = async () => {
      try {
        await fetchResult();           // fast path: already generated
      } catch (err) {
        const code = err.response?.status;
        if (code === 404) {
          await triggerGeneration();   // not yet — start now
        } else if (code === 403) {
          setStatus("forbidden");
        } else {
          setError(err.response?.data?.detail || "Failed to load resume.");
          setStatus("failed");
        }
      }
    };
    init();
    return stopPolling;
  }, [career_input_id]);

  /* ── Regenerate ── */
  const handleRegenerate = async () => {
    setRegenerating(true);
    setResumeText("");
    await triggerGeneration();
    setRegenerating(false);
  };

  /* ── Forbidden ─────────────────────────────────────────────── */
  if (status === "forbidden") {
    return (
      <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
        <Navbar links={navLinks} />
        <div className="state-page">
          <div className="state-card">
            <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🔒</div>
            <h2 style={{ marginBottom: "8px" }}>Access Denied</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
              This analysis belongs to another user account.
            </p>
            <button
              id="ats-forbidden-back-btn"
              onClick={() => router.push("/job-input")}
              className="btn btn-primary"
            >
              Back to Job Input
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading / Polling ──────────────────────────────────────── */
  const isLoading = !["completed", "failed"].includes(status);

  if (isLoading) {
    const label =
      status === "queued"     ? "Queued — starting soon…"
      : status === "processing" ? "Rewriting your resume…"
      :                           "Generating ATS Resume…";

    const sub =
      status === "queued"
        ? "Your request is in the queue. Usually starts within a few seconds."
        : "Our AI is crafting an ATS-optimized, keyword-aligned version of your resume.";

    return (
      <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
        <Navbar links={navLinks} />
        <div className="state-page">
          <div className="state-card">
            <div className="spinner" style={{ margin: "0 auto 24px" }} />
            <h2 style={{ marginBottom: "8px" }}>{label}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.65 }}>
              {sub}
            </p>
            {status && status !== "loading" && (
              <div style={{ marginTop: "16px" }}>
                <span className="badge badge-blue" style={{ textTransform: "capitalize" }}>
                  {status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Completed / Failed ─────────────────────────────────────── */
  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      <Navbar links={navLinks} />

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px" }}>

        {/* ── Page header ── */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          gap: "14px", marginBottom: "28px",
        }}>
          <div style={{
            width: "44px", height: "44px", flexShrink: 0,
            borderRadius: "var(--radius-md)",
            background: "var(--primary-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--primary)",
          }}>
            <FileText size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="section-title" style={{ marginBottom: "4px" }}>AI Generated</p>
            <h1 style={{ fontSize: "1.625rem", margin: 0 }}>ATS Optimized Resume</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "6px 0 0" }}>
              Keyword-aligned, ATS-friendly resume rewritten from your original profile.
            </p>
          </div>
        </div>

        {/* ── Error banner ── */}
        {status === "failed" && (
          <div className="alert alert-error" style={{ marginBottom: "20px" }}>
            <span style={{ flex: 1 }}>
              {error || "Resume generation failed. Please try again."}
            </span>
            <button
              id="ats-retry-btn"
              onClick={triggerGeneration}
              className="btn btn-danger btn-sm"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* ── Resume viewer ── */}
        {/*
          ResumeViewer renders the text inside <pre white-space:pre-wrap>.
          This preserves ALL formatting returned by the backend:
            - UPPERCASE section headings
            - Blank lines between sections
            - Bullet indentation ("- " prefix)
            - No merging / deduplication of sections
          Sections are rendered in exactly the order the LLM returns them.
        */}
        <ResumeViewer
          text={resumeText}
          filename={`${filename}.txt`}
        />

        {/* ── Action buttons (PDF / txt / Regenerate) ── */}
        {(resumeText || status === "failed") && (
          <ResumeActions
            resumeText={resumeText}
            filename={filename}
            onRegenerate={handleRegenerate}
            regenerating={regenerating}
          />
        )}

      </div>
    </div>
  );
}
