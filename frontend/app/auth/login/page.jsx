"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import API from "@/utils/api";
import { Telescope, Mail, Lock, LogIn } from "lucide-react";

function LoginForm() {

  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { email, password });
      const token = res.data.access_token;

      localStorage.setItem("token", token);
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

      const next = searchParams.get("next") || "/job-input";
      router.push(next);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password. Please try again.");
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

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} id="login-form">

          <div className="field">
            <label htmlFor="login-email" className="label">
              Email address
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{
                position: "absolute", left: "14px", top: "50%",
                transform: "translateY(-50%)", color: "var(--text-muted)",
              }} />
              <input
                id="login-email"
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
            <label htmlFor="login-password" className="label">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{
                position: "absolute", left: "14px", top: "50%",
                transform: "translateY(-50%)", color: "var(--text-muted)",
              }} />
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="input"
                style={{ paddingLeft: "40px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ padding: "12px", marginTop: "4px" }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign in
              </>
            )}
          </button>

        </form>

        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "24px" }}>
          Don't have an account?{" "}
          <Link href="/auth/register" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Create one
          </Link>
        </p>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}