"use client";

import { useEffect, useState } from "react";
import API from "../utils/api";
import { Telescope, ArrowRight, BarChart2, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: <BarChart2 size={22} strokeWidth={1.8} />,
    title: "Resume Score",
    desc: "Get an instant ATS compatibility score and understand where you stand against the job requirements.",
  },
  {
    icon: <FileText size={22} strokeWidth={1.8} />,
    title: "Skill Gap Analysis",
    desc: "See exactly which skills you have and which are missing — with prioritized recommendations to close the gap.",
  },
  {
    icon: <MessageSquare size={22} strokeWidth={1.8} />,
    title: "Interview Prep",
    desc: "AI-generated technical, behavioral, and HR questions tailored to your target role.",
  },
];

export default function HomePage() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [backendOk,       setBackendOk]       = useState(null);

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((r) => r.startsWith("token="))
      ?.split("=")[1];
    if (token) setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    API.get("/health")
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* ── Top Nav (unauthenticated) ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <Telescope size={20} strokeWidth={2} style={{ color: "var(--primary)" }} />
          <span>CareerLens</span>
        </div>

        {isAuthenticated ? (
          <Link href="/job-input" className="btn btn-primary btn-sm">
            Go to Dashboard
          </Link>
        ) : (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link href="/auth/login"    className="btn btn-ghost   btn-sm" id="nav-login-btn">Sign in</Link>
            <Link href="/auth/register" className="btn btn-primary btn-sm" id="nav-register-btn">Get started</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "80px 24px 64px",
        textAlign: "center",
      }}>
        <span className="badge badge-blue" style={{ marginBottom: "20px" }}>
          AI-Powered Career Tool
        </span>

        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          lineHeight: 1.2,
          color: "var(--text-heading)",
          marginBottom: "20px",
          letterSpacing: "-0.02em",
        }}>
          Land your dream role with{" "}
          <span style={{ color: "var(--primary)" }}>smarter</span> career analysis
        </h1>

        <p style={{
          fontSize: "1.0625rem",
          color: "var(--text-muted)",
          maxWidth: "560px",
          margin: "0 auto 36px",
          lineHeight: 1.7,
        }}>
          Paste any job description, upload your resume, and get an instant
          AI analysis — resume score, skill gaps, role suggestions, and
          personalized interview questions.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href={isAuthenticated ? "/job-input" : "/auth/register"}
            className="btn btn-primary"
            id="hero-cta-btn"
            style={{ padding: "12px 28px", fontSize: "0.9375rem" }}
          >
            Start analyzing
            <ArrowRight size={16} />
          </Link>
          {!isAuthenticated && (
            <Link
              href="/auth/login"
              className="btn btn-ghost"
              id="hero-login-btn"
              style={{ padding: "12px 28px", fontSize: "0.9375rem" }}
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Status pill */}
        {backendOk !== null && (
          <div style={{ marginTop: "28px" }}>
            <span
              className={`badge ${backendOk ? "badge-green" : "badge-red"}`}
              style={{ fontSize: "0.75rem" }}
            >
              {backendOk ? "● Service online" : "● Service offline"}
            </span>
          </div>
        )}
      </section>

      {/* ── Feature Cards ── */}
      <section style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "0 24px 80px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px",
      }}>
        {FEATURES.map((f) => (
          <div key={f.title} className="card" style={{ textAlign: "left" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-md)",
              background: "var(--primary-light)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>{f.title}</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </section>

    </div>
  );
}