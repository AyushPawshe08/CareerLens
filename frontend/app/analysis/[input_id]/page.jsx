"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import API from "@/utils/api";
import Navbar from "@/components/ui/Navbar";
import Summary from "@/components/analysis/Summary";
import Skills from "@/components/analysis/Skills";
import JobRoles from "@/components/analysis/JobRoles";
import Suggestions from "@/components/analysis/Suggestions";
import Score from "@/components/analysis/Score";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { buildNavLinks } from "@/utils/navLinks";

const POLL_INTERVAL_MS = 3000;

export default function AnalysisPage({ params }) {

  const { input_id } = use(params);
  const router = useRouter();

  const [status,   setStatus]   = useState("loading");
  const [analysis, setAnalysis] = useState(null);
  const [error,    setError]    = useState("");
  const pollRef = useRef(null);

  const fetchResult = async () => {
    try {
      const res = await API.get(`/career-analysis/${input_id}`);
      setAnalysis(res.data);
      setStatus("completed");
    } catch (err) {
      const code = err.response?.status;
      if (code === 403) setStatus("forbidden");
      else if (code === 404) setStatus("processing");
      else { setError(err.response?.data?.detail || "Failed to load analysis."); setStatus("failed"); }
    }
  };

  const startPolling = (taskId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await API.get(`/career-analysis/status/${taskId}`);
        const s = res.data.status;
        if (s === "completed") { clearInterval(pollRef.current); await fetchResult(); }
        else if (s === "failed") { clearInterval(pollRef.current); setError(res.data.error || "Analysis failed."); setStatus("failed"); }
        else setStatus(s);
      } catch (err) {
        clearInterval(pollRef.current);
        setError(err.response?.data?.detail || "Polling error.");
        setStatus("failed");
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await API.post(`/career-analysis/${input_id}`);
        if (res.data.status === "completed") await fetchResult();
        else { setStatus("queued"); startPolling(res.data.task_id); }
      } catch (err) {
        const code = err.response?.status;
        if (code === 403) setStatus("forbidden");
        else if (code === 404) { setError("Career input not found."); setStatus("failed"); }
        else { setError(err.response?.data?.detail || "Failed to trigger analysis."); setStatus("failed"); }
      }
    };
    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [input_id]);

  const navLinks = buildNavLinks(input_id);

  /* ── Forbidden ── */
  if (status === "forbidden") {
    return (
      <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
        <Navbar links={navLinks} />
        <div className="state-page">
          <div className="state-card">
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "var(--danger-bg)", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: "1.5rem",
            }}>🔒</div>
            <h2 style={{ marginBottom: "8px", color: "var(--text-heading)" }}>Access Denied</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
              This analysis belongs to another user account.
            </p>
            <button
              id="forbidden-back-btn"
              onClick={() => router.push("/job-input")}
              className="btn btn-primary"
            >
              <ArrowLeft size={15} /> Back to Job Input
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading / polling ── */
  if (status !== "completed") {
    const isFailed = status === "failed";
    return (
      <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
        <Navbar links={navLinks} />
        <div className="state-page">
          <div className="state-card">
            {isFailed ? (
              <>
                <div style={{
                  width: "52px", height: "52px", borderRadius: "50%",
                  background: "var(--danger-bg)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", fontSize: "1.4rem",
                }}>⚠</div>
                <h2 style={{ marginBottom: "8px", color: "var(--text-heading)" }}>Analysis Failed</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
                  {error || "An unexpected error occurred."}
                </p>
                <button
                  id="analysis-retry-btn"
                  onClick={() => router.push("/job-input")}
                  className="btn btn-primary"
                >
                  <RefreshCw size={15} /> Try again
                </button>
              </>
            ) : (
              <>
                <div className="spinner" style={{ margin: "0 auto 24px" }} />
                <h2 style={{ marginBottom: "8px", color: "var(--text-heading)" }}>
                  Analysing your profile…
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                  {status === "processing"
                    ? "Our AI is reading your resume and job description. Almost there."
                    : "Your request has been queued. This usually takes under a minute."}
                </p>
                <div style={{
                  marginTop: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}>
                  <span className="badge badge-blue" style={{ textTransform: "capitalize" }}>
                    {status}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Completed ── */
  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      <Navbar links={navLinks} />

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <p className="section-title">Results</p>
          <h1 style={{ fontSize: "1.625rem", margin: 0 }}>Career Analysis</h1>
        </div>

        <Score      score={analysis.resume_score}              />
        <Summary    summary={analysis.summary}                 />
        <Skills     matched={analysis.matched_skills}
                    missing={analysis.missing_skills}          />
        <JobRoles   roles={analysis.perfect_job_roles}         />
        <Suggestions suggestions={analysis.resume_suggestions} />

      </div>
    </div>
  );
}