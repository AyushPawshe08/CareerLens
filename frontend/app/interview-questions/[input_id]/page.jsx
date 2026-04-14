"use client";

import { use } from "react";
import Navbar from "@/components/ui/Navbar";
import Questions from "@/components/interviewQuestions/Questions";

// Shared nav links for all private analysis pages
function buildNavLinks(inputId) {
  return [
    { label: "Analysis",             href: `/analysis/${inputId}` },
    { label: "Interview Questions",  href: `/interview-questions/${inputId}` },
    { label: "Resume",               href: "/resume" },
  ];
}

/**
 * Interview Questions Page  —  /interview-questions/[input_id]
 *
 * The existing Questions component fully manages:
 *   1. GET /interview-questions/{input_id}   — check if already generated
 *   2. POST /interview-questions/{input_id}  — trigger Celery if not
 *   3. GET /interview-questions/status/{task_id}  — poll until done
 *   4. Render once complete
 *
 * This page only adds:
 *   - Navbar with Analysis / Interview Questions / Resume links
 *   - Protected route (handled by middleware.js)
 *
 * Security: backend enforces ownership (403 if not your input_id).
 */
export default function InterviewQuestionsPage({ params }) {

  const { input_id } = use(params);

  const navLinks = buildNavLinks(input_id);

  return (
    <div>

      <Navbar links={navLinks} />

      <div style={{ background: "white", color: "black", padding: "16px" }}>

        <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px" }}>
          Interview Questions
        </h1>

        {/* Questions handles trigger, polling, and display internally */}
        <Questions careerInputId={input_id} />

      </div>

    </div>
  );
}
