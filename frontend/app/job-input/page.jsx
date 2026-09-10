"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/utils/api";
import Navbar from "@/components/ui/Navbar";
import { FileText, Briefcase, AlignLeft, Sparkles, Upload, CheckCircle2 } from "lucide-react";

const JobInput = () => {
  const router = useRouter();

  const [jobDescription,  setJobDescription]  = useState("");
  const [resume,          setResume]          = useState(null);
  const [selfDescription, setSelfDescription] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [dragOver,        setDragOver]        = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("job_description", jobDescription);
      if (selfDescription) formData.append("self_description", selfDescription);
      if (resume)          formData.append("resume", resume);

      const res = await API.post("/career-inputs/", formData);

      router.push(`/analysis/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="job-input-wrapper">
      <Navbar />

      <div className="job-input-body">

        {/* ── Page header row ── */}
        <div className="job-input-header">
          <div className="job-input-header-left">
            <div style={{
              width: "36px", height: "36px",
              borderRadius: "var(--radius-md)",
              background: "var(--primary-light)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--primary)",
              flexShrink: 0,
            }}>
              <Sparkles size={17} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: "1.25rem", margin: 0, whiteSpace: "nowrap" }}>New Analysis</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", margin: 0, lineHeight: 1.4 }}>
                Fill in the panels below, then run your AI-powered career analysis.
              </p>
            </div>
          </div>

          <button
            id="analyze-submit-btn"
            type="submit"
            form="job-input-form"
            disabled={loading || !jobDescription.trim()}
            className="btn btn-primary"
            style={{ padding: "10px 22px", flexShrink: 0 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Analyze my profile
              </>
            )}
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "12px", flexShrink: 0 }}>
            {error}
          </div>
        )}

        {/* ── Three-panel grid ── */}
        <form id="job-input-form" onSubmit={handleSubmit} className="job-input-panels">

          {/* ─── Panel 1: Job Description ─── */}
          <div className="job-panel">
            <div className="job-panel-header">
              <div className="job-panel-icon" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                <Briefcase size={13} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-heading)" }}>
                  Job Description
                  <span style={{ color: "var(--danger)", marginLeft: "3px" }}>*</span>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Paste the full JD</div>
              </div>
            </div>

            <div className="job-panel-body">
              <textarea
                id="job-description"
                required
                placeholder="Paste the full job description here — include responsibilities, qualifications, and required skills for best results…"
                className="input job-panel-textarea"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <p className="hint" style={{ marginTop: "6px", flexShrink: 0 }}>
                {jobDescription.length > 0
                  ? `${jobDescription.length} characters`
                  : "Include the complete JD for best results."}
              </p>
            </div>
          </div>

          {/* ─── Panel 2: Resume Upload ─── */}
          <div className="job-panel">
            <div className="job-panel-header">
              <div className="job-panel-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
                <FileText size={13} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-heading)" }}>
                  Resume (PDF)
                  <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "5px" }}>optional</span>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Upload your CV for a personalised score</div>
              </div>
            </div>

            <div className="job-panel-body">
              <div
                className="job-panel-dropzone"
                style={{
                  border: `2px dashed ${dragOver ? "var(--primary)" : resume ? "var(--success)" : "var(--border)"}`,
                  background: dragOver
                    ? "var(--primary-light)"
                    : resume
                    ? "var(--success-bg)"
                    : "var(--bg-input)",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f?.type === "application/pdf") setResume(f);
                }}
              >
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setResume(e.target.files[0] || null)}
                />
                <label htmlFor="resume-upload" style={{ cursor: "pointer", width: "100%" }}>
                  {resume ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <CheckCircle2 size={36} style={{ color: "var(--success)" }} strokeWidth={1.5} />
                      <div>
                        <div style={{ color: "var(--success)", fontWeight: 700, fontSize: "0.875rem" }}>
                          {resume.name}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "4px" }}>
                          {(resume.size / 1024).toFixed(0)} KB · PDF
                        </div>
                        <div style={{
                          marginTop: "12px",
                          color: "var(--primary)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textDecoration: "underline",
                        }}>
                          Click to replace
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <Upload size={32} style={{ color: "var(--text-muted)" }} strokeWidth={1.5} />
                      <div>
                        <div style={{ color: "var(--text-body)", fontSize: "0.875rem" }}>
                          <span style={{ color: "var(--primary)", fontWeight: 700 }}>Click to upload</span>
                          {" "}or drag & drop
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "4px" }}>
                          PDF files only
                        </div>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <p className="hint" style={{ marginTop: "6px", flexShrink: 0 }}>
                Upload your resume for a more accurate, personalised score.
              </p>
            </div>
          </div>

          {/* ─── Panel 3: Self Description ─── */}
          <div className="job-panel">
            <div className="job-panel-header">
              <div className="job-panel-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                <AlignLeft size={13} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-heading)" }}>
                  Self Description
                  <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "5px" }}>optional</span>
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Describe your skills & experience</div>
              </div>
            </div>

            <div className="job-panel-body">
              <textarea
                id="self-description"
                placeholder="Briefly describe your skills, background, and experience — especially useful if you don't have a resume to upload…"
                className="input job-panel-textarea"
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
              />
              <p className="hint" style={{ marginTop: "6px", flexShrink: 0 }}>
                {selfDescription.length > 0
                  ? `${selfDescription.length} characters`
                  : "Use this if you have no resume to upload."}
              </p>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default JobInput;