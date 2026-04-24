"use client";

import { use } from "react";
import Navbar from "@/components/ui/Navbar";
import Questions from "@/components/interviewQuestions/Questions";
import { MessageSquare, BookOpen } from "lucide-react";
import Link from "next/link";
import { buildNavLinks } from "@/utils/navLinks";

export default function InterviewQuestionsPage({ params }) {

  const { input_id } = use(params);
  const navLinks = buildNavLinks(input_id);

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      <Navbar links={navLinks} />

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{
            width: "44px", height: "44px", flexShrink: 0,
            borderRadius: "var(--radius-md)",
            background: "var(--primary-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--primary)",
          }}>
            <MessageSquare size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="section-title" style={{ marginBottom: "4px" }}>AI Generated</p>
            <h1 style={{ fontSize: "1.625rem", margin: 0 }}>Interview Questions</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "6px 0 0" }}>
              Tailored technical, behavioural, and HR questions based on your profile and target role.
            </p>
          </div>
        </div>

        {/* Questions component handles trigger, polling, and display */}
        <Questions careerInputId={input_id} />

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
              Get curated learning resources for every missing skill.
            </p>
          </div>
          <Link
            href={`/resources/${input_id}`}
            id="go-to-resources-btn"
            className="btn btn-primary"
          >
            <BookOpen size={15} />
            View Learning Resources
          </Link>
        </div>

      </div>
    </div>
  );
}
