"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/utils/api";
import Navbar from "@/components/ui/Navbar";
import { FileText, Briefcase, AlignLeft, Sparkles } from "lucide-react";

const JobInput = () => {

  const router = useRouter();

  const [jobDescription,   setJobDescription]   = useState("");
  const [resume,           setResume]           = useState(null);
  const [selfDescription,  setSelfDescription]  = useState("");
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("job_description", jobDescription);
      if (selfDescription) formData.append("self_description", selfDescription);
      if (resume)          formData.append("resume", resume);

      const res = await API.post("/career-inputs/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.push(`/analysis/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <Navbar />

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{
              width: "38px", height: "38px",
              borderRadius: "var(--radius-md)",
              background: "var(--primary-light)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--primary)",
            }}>
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <h1 style={{ fontSize: "1.5rem", margin: 0 }}>New Analysis</h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", margin: 0 }}>
            Paste a job description and optionally upload your resume to get a full AI-powered career analysis.
          </p>
        </div>

        {/* Form card */}
        <div className="card" style={{ padding: "32px" }}>
          <form onSubmit={handleSubmit} id="job-input-form">

            {/* Job Description */}
            <div className="field">
              <label htmlFor="job-description" className="label">
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Briefcase size={13} />
                  Job Description <span style={{ color: "var(--danger)" }}>*</span>
                </span>
              </label>
              <textarea
                id="job-description"
                required
                rows={7}
                placeholder="Paste the full job description here…"
                className="input"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <p className="hint">Include the complete JD for best results.</p>
            </div>

            {/* Resume Upload */}
            <div className="field">
              <label htmlFor="resume-upload" className="label">
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileText size={13} />
                  Resume (PDF) <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>— optional</span>
                </span>
              </label>
              <div style={{
                border: "1.5px dashed var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-input)",
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
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
                <label htmlFor="resume-upload" style={{ cursor: "pointer" }}>
                  {resume ? (
                    <span style={{ color: "var(--success)", fontWeight: 600, fontSize: "0.9rem" }}>
                      ✓ {resume.name}
                    </span>
                  ) : (
                    <>
                      <FileText size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
                      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                        <span style={{ color: "var(--primary)", fontWeight: 600 }}>Click to upload</span>
                        {" "}or drag and drop your PDF
                      </p>
                    </>
                  )}
                </label>
              </div>
              <p className="hint">Upload your resume for a more accurate, personalised score.</p>
            </div>

            {/* Self Description */}
            <div className="field">
              <label htmlFor="self-description" className="label">
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlignLeft size={13} />
                  Self Description <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>— optional</span>
                </span>
              </label>
              <textarea
                id="self-description"
                rows={4}
                placeholder="Briefly describe your skills and experience if you don't have a resume…"
                className="input"
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: "20px" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="analyze-submit-btn"
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ padding: "13px" }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                  Submitting…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyze my profile
                </>
              )}
            </button>

          </form>
        </div>

      </div>
    </div>
  );
};

export default JobInput;