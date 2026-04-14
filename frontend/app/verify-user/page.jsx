"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import API from "@/utils/api";

/**
 * OTP Verification Page — /verify-user
 *
 * Guards:
 *  - If no `?email=` query param is present the user did not arrive via
 *    the registration flow → redirect to /auth/register.
 *  - After successful OTP verification → redirect to /job-input.
 */
function VerifyOTPContent() {

  const router = useRouter();
  const params = useSearchParams();

  const email = params.get("email");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Registration guard ────────────────────────────────────────────────────
  // If there is no email param this page was visited directly (not via
  // the register flow). Redirect to register.
  useEffect(() => {

    if (!email) {
      router.replace("/auth/register");
    }

  }, [email, router]);

  const handleVerify = async (e) => {

    e.preventDefault();
    setLoading(true);
    setError("");

    try {

      await API.post("/auth/verify-user", {
        email,
        otp,
      });

      // ✅ Verification successful → go to job input
      router.push("/job-input");

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Verification failed"
      );

    } finally {

      setLoading(false);

    }
  };

  // Show nothing while the guard check runs to avoid flash
  if (!email) return null;

  return (

    <div className="min-h-screen text-black flex items-center justify-center bg-gray-50">

      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

        <h2 className="text-xl font-bold mb-4 text-center">
          Verify OTP
        </h2>

        <p className="text-sm text-gray-600 mb-4 text-center">
          A verification code was sent to{" "}
          <span className="font-medium">{email}</span>
        </p>

        <form
          onSubmit={handleVerify}
          className="space-y-4"
        >

          <input
            type="text"
            placeholder="Enter OTP"
            className="w-full border p-3 rounded-lg"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value)
            }
          />

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default function VerifyUser() {
  return (
    <Suspense>
      <VerifyOTPContent />
    </Suspense>
  );
}
