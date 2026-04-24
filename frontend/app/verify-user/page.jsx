"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import API from "@/utils/api";
import { Telescope, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * OTP Verification Page — /verify-user
 *
 * Guards:
 *  - No ?email= param → redirect to /auth/register
 *  - On success → redirect to /job-input
 */
function VerifyOTPContent() {

  const router = useRouter();
  const params = useSearchParams();
  const email  = params.get("email");

  const [otp,     setOtp]     = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email) router.replace("/auth/register");
  }, [email, router]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/verify-user", { email, otp });
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

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

        {/* Icon */}
        <div style={{
          width: "56px", height: "56px",
          borderRadius: "50%",
          background: "var(--primary-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          color: "var(--primary)",
        }}>
          <ShieldCheck size={26} strokeWidth={1.8} />
        </div>

        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle" style={{ marginBottom: "6px" }}>
          We sent a verification code to
        </p>
        <p style={{
          textAlign: "center",
          fontWeight: 700,
          color: "var(--text-heading)",
          fontSize: "0.9rem",
          marginBottom: "28px",
          wordBreak: "break-all",
        }}>
          {email}
        </p>

        {/* Success state */}
        {success ? (
          <div className="alert alert-success" style={{ textAlign: "center", justifyContent: "center" }}>
            ✓ Verified! Redirecting to login…
          </div>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div className="alert alert-error" style={{ marginBottom: "20px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} id="verify-otp-form">
              <div className="field">
                <label htmlFor="otp-input" className="label">
                  Verification Code (OTP)
                </label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit code"
                  required
                  autoComplete="one-time-code"
                  className="input"
                  style={{ textAlign: "center", fontSize: "1.25rem", letterSpacing: "0.3em" }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>

              <button
                id="verify-submit-btn"
                type="submit"
                disabled={loading || otp.length < 4}
                className="btn btn-primary btn-full"
                style={{ padding: "12px" }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                    Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Verify account
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "24px" }}>
          Wrong email?{" "}
          <Link href="/auth/register" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Go back
          </Link>
        </p>

      </div>
    </div>
  );
}

export default function VerifyUserPage() {
  return (
    <Suspense>
      <VerifyOTPContent />
    </Suspense>
  );
}
