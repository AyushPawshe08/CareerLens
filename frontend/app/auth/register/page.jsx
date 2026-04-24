"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/utils/api";
import { Telescope, Mail, Lock, UserPlus } from "lucide-react";

export default function RegisterPage() {

  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/auth/register", { email, password });
      router.push(`/verify-user?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div style={{
            width: "42px", height: "42px",
            borderRadius: "var(--radius-md)",
            background: "var(--primary-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--primary)",
          }}>
            <Telescope size={22} strokeWidth={2} />
          </div>
          <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-heading)" }}>
            CareerLens
          </span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start analyzing your career in minutes</p>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} id="register-form">

          <div className="field">
            <label htmlFor="register-email" className="label">Email address</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{
                position: "absolute", left: "14px", top: "50%",
                transform: "translateY(-50%)", color: "var(--text-muted)",
              }} />
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="input"
                style={{ paddingLeft: "40px" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="register-password" className="label">Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{
                position: "absolute", left: "14px", top: "50%",
                transform: "translateY(-50%)", color: "var(--text-muted)",
              }} />
              <input
                id="register-password"
                type="password"
                placeholder="Choose a strong password"
                required
                autoComplete="new-password"
                className="input"
                style={{ paddingLeft: "40px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ padding: "12px", marginTop: "4px" }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                Sending OTP…
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Create account
              </>
            )}
          </button>

        </form>

        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "24px" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}