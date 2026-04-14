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

// Navbar links shared across all private pages for this input
function buildNavLinks(inputId) {
  return [
    { label: "Analysis",             href: `/analysis/${inputId}` },
    { label: "Interview Questions",  href: `/interview-questions/${inputId}` },
    { label: "Resume",               href: "/resume" },
  ];
}

/**
 * Analysis Page  —  /analysis/[input_id]
 *
 * Flow:
 *  1. On mount: POST /career-analysis/{input_id}  (trigger; idempotent)
 *     - If already completed → fetch result from GET endpoint immediately.
 *     - If queued           → start polling /career-analysis/status/{task_id}.
 *  2. Poll every POLL_INTERVAL_MS until status == "completed" | "failed".
 *  3. On completion: fetch full result from GET /career-analysis/{input_id}.
 *  4. Render analysis components with the result data.
 *
 * Security: backend enforces ownership (403 if not your input_id).
 */
const POLL_INTERVAL_MS = 3000;

export default function AnalysisPage({ params }) {

  const { input_id } = use(params);
  const router = useRouter();

  const [status, setStatus] = useState("loading"); // loading | queued | processing | completed | failed | forbidden
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  // Hold the polling interval ref so we can clear it on unmount
  const pollRef = useRef(null);

  // ── Fetch the completed analysis result from DB ──────────────────────────
  const fetchResult = async () => {
    try {
      const res = await API.get(`/career-analysis/${input_id}`);
      setAnalysis(res.data);
      setStatus("completed");
    } catch (err) {
      const code = err.response?.status;
      if (code === 403) {
        setStatus("forbidden");
      } else if (code === 404) {
        // Still not persisted yet — keep polling
        setStatus("processing");
      } else {
        setError(err.response?.data?.detail || "Failed to load analysis.");
        setStatus("failed");
      }
    }
  };

  // ── Poll Celery task status ──────────────────────────────────────────────
  const startPolling = (taskId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await API.get(`/career-analysis/status/${taskId}`);
        const s = res.data.status;

        if (s === "completed") {
          clearInterval(pollRef.current);
          await fetchResult();
        } else if (s === "failed") {
          clearInterval(pollRef.current);
          setError(res.data.error || "Analysis failed.");
          setStatus("failed");
        } else {
          // queued | processing
          setStatus(s);
        }
      } catch (err) {
        clearInterval(pollRef.current);
        setError(err.response?.data?.detail || "Polling error.");
        setStatus("failed");
      }
    }, POLL_INTERVAL_MS);
  };

  // ── On mount: trigger analysis (idempotent) ──────────────────────────────
  useEffect(() => {

    const init = async () => {
      try {
        const res = await API.post(`/career-analysis/${input_id}`);
        const triggerStatus = res.data.status;

        if (triggerStatus === "completed") {
          // Analysis was already done — fetch result immediately
          await fetchResult();
        } else {
          // Queued — start polling
          setStatus("queued");
          startPolling(res.data.task_id);
        }
      } catch (err) {
        const code = err.response?.status;
        if (code === 403) {
          setStatus("forbidden");
        } else if (code === 404) {
          setError("Career input not found.");
          setStatus("failed");
        } else {
          setError(err.response?.data?.detail || "Failed to trigger analysis.");
          setStatus("failed");
        }
      }
    };

    init();

    // Cleanup polling on unmount
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };

  }, [input_id]);

  const navLinks = buildNavLinks(input_id);

  // ── Forbidden ────────────────────────────────────────────────────────────
  if (status === "forbidden") {
    return (
      <div>
        <Navbar links={navLinks} />
        <div className="min-h-screen text-black flex items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <h2 className="text-xl font-bold mb-2 text-red-600">Access Denied</h2>
            <p className="text-gray-600 mb-4">This analysis belongs to another user.</p>
            <button
              onClick={() => router.push("/job-input")}
              className="bg-black text-white px-4 py-2 rounded-lg"
            >
              Go to Job Input
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading / polling state ──────────────────────────────────────────────
  if (status !== "completed") {
    return (
      <div>
        <Navbar links={navLinks} />
        <div className="min-h-screen text-black flex items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">

            {status === "failed" ? (
              <>
                <h2 className="text-xl font-bold mb-2 text-red-600">Analysis Failed</h2>
                <p className="text-gray-600 mb-4">
                  {error || "An unexpected error occurred."}
                </p>
                <button
                  onClick={() => router.push("/job-input")}
                  className="bg-black text-white px-4 py-2 rounded-lg"
                >
                  Try Again
                </button>
              </>
            ) : (
              <>
                {/* Spinner */}
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-xl font-bold mb-2">Analyzing your profile…</h2>
                <p className="text-gray-500 text-sm">
                  {status === "processing"
                    ? "LLM is crunching through your resume and job description."
                    : "Your analysis has been queued. This usually takes under a minute."}
                </p>
              </>
            )}

          </div>
        </div>
      </div>
    );
  }

  // ── Completed — render results ───────────────────────────────────────────
  return (
    <div>
      <Navbar links={navLinks} />

      <div className="min-h-screen text-black bg-gray-50 p-6">

        <div className="max-w-3xl mx-auto">

          <h2 className="text-2xl font-bold mb-6">
            Analysis Results
          </h2>

          <Score score={analysis.resume_score} />

          <Summary summary={analysis.summary} />

          <Skills
            matched={analysis.matched_skills}
            missing={analysis.missing_skills}
          />

          <JobRoles roles={analysis.perfect_job_roles} />

          <Suggestions suggestions={analysis.resume_suggestions} />

        </div>

      </div>
    </div>
  );
}