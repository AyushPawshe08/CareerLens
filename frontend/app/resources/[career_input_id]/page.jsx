"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import ResourceCard from "@/components/resources/ResourceCard";
import API from "@/utils/api";
import { buildNavLinks } from "@/utils/navLinks";
import { BookOpen, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";

const POLL_MS = 3000;

export default function ResourcesPage({ params }) {

  const { career_input_id } = use(params);
  const router = useRouter();
  const navLinks = buildNavLinks(career_input_id);

  const [status,    setStatus]    = useState("loading");
  const [resources, setResources] = useState([]);
  const [error,     setError]     = useState("");
  const pollRef = useRef(null);

  /* ── Fetch completed result from DB ── */
  const fetchResult = async () => {
    try {
      const res = await API.get(`/resources/${career_input_id}`);
      setResources(res.data.resources || []);
      setStatus("completed");
    } catch (err) {
      const code = err.response?.status;
      if (code === 404) setStatus("processing");
      else if (code === 403) setStatus("forbidden");
      else { setError(err.response?.data?.detail || "Failed to load resources."); setStatus("failed"); }
    }
  };

  /* ── Poll task status ── */
  const startPolling = (taskId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await API.get(`/resources/status/${taskId}`);
        const s   = res.data.status;
        if (s === "completed") { clearInterval(pollRef.current); await fetchResult(); }
        else if (s === "failed") {
          clearInterval(pollRef.current);
          setError(res.data.error || "Resource generation failed.");
          setStatus("failed");
        } else setStatus(s);
      } catch (err) {
        clearInterval(pollRef.current);
        setError(err.response?.data?.detail || "Polling error.");
        setStatus("failed");
      }
    }, POLL_MS);
  };

  /* ── On mount: trigger + check idempotent ── */
  useEffect(() => {
    const init = async () => {
      try {
        const res = await API.post(`/resources/${career_input_id}`);
        if (res.data.status === "completed") await fetchResult();
        else { setStatus("queued"); startPolling(res.data.task_id); }
      } catch (err) {
        const code = err.response?.status;
        if (code === 403) setStatus("forbidden");
        else if (code === 400) {
          // No missing skills — treat as completed with empty list
          setResources([]);
          setStatus("no_skills");
        }
        else { setError(err.response?.data?.detail || "Failed to trigger resource generation."); setStatus("failed"); }
      }
    };
    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [career_input_id]);

  /* ── Forbidden ── */
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
            <button onClick={() => router.push("/job-input")} className="btn btn-primary" id="resources-forbidden-back-btn">
              Back to Job Input
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading / polling ── */
  if (status !== "completed" && status !== "no_skills") {
    const isFailed = status === "failed";
    return (
      <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
        <Navbar links={navLinks} />
        <div className="state-page">
          <div className="state-card">
            {isFailed ? (
              <>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>⚠</div>
                <h2 style={{ marginBottom: "8px" }}>Generation Failed</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
                  {error || "An unexpected error occurred."}
                </p>
                <button onClick={() => router.push("/job-input")} className="btn btn-primary" id="resources-retry-btn">
                  <RefreshCw size={15} /> Try Again
                </button>
              </>
            ) : (
              <>
                <div className="spinner" style={{ margin: "0 auto 24px" }} />
                <h2 style={{ marginBottom: "8px" }}>Curating your resources…</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                  Finding the best learning material for each missing skill. Usually takes under a minute.
                </p>
                <div style={{ marginTop: "16px" }}>
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

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{
            width: "44px", height: "44px", flexShrink: 0,
            borderRadius: "var(--radius-md)",
            background: "var(--primary-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--primary)",
          }}>
            <BookOpen size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="section-title" style={{ marginBottom: "4px" }}>AI Curated</p>
            <h1 style={{ fontSize: "1.625rem", margin: 0 }}>Learning Resources</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "6px 0 0" }}>
              Handpicked videos, docs, and practice platforms for every skill gap in your profile.
            </p>
          </div>
        </div>

        {/* No skills state */}
        {(status === "no_skills" || resources.length === 0) ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎉</div>
            <h3 style={{ marginBottom: "8px" }}>No skill gaps detected!</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Your profile already matches the job requirements well. No resources needed.
            </p>
          </div>
        ) : (
          <>
            <p className="section-title" style={{ marginBottom: "16px" }}>
              {resources.length} skill{resources.length !== 1 ? "s" : ""} to learn
            </p>
            {resources.map((resource, i) => (
              <ResourceCard key={`${resource.skill}-${i}`} resource={resource} />
            ))}
          </>
        )}

        {/* ── Next step CTA ── */}
        <div style={{
          marginTop: "32px",
          padding: "20px 24px",
          borderRadius: "var(--radius-lg)",
          border: "1.5px solid var(--border)",
          background: "var(--bg-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div>
            <p style={{ fontWeight: 600, color: "var(--text-heading)", margin: "0 0 2px" }}>
              Next step
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
              Generate an ATS-optimized resume tailored to this job description.
            </p>
          </div>
          <Link
            href={`/resume-generator/${career_input_id}`}
            id="go-to-ats-resume-btn"
            className="btn btn-primary"
          >
            <FileText size={15} />
            Generate ATS Resume
          </Link>
        </div>

      </div>
    </div>
  );
}
