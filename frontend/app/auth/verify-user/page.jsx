"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import API from "@/utils/api";

function VerifyOTPContent() {

  const router = useRouter();
  const params = useSearchParams();

  const email = params.get("email");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async (e) => {

    e.preventDefault();

    try {

      await API.post("/auth/verify-user", {
        email,
        otp,
      });

      router.push("/auth/login");

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Verification failed"
      );

    }
  };

  return (

    <div className="min-h-screen text-black flex items-center justify-center bg-gray-50">

      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

        <h2 className="text-xl font-bold mb-4 text-center">
          Verify OTP
        </h2>

        <form
          onSubmit={handleVerify}
          className="space-y-4"
        >

          <input
            type="text"
            placeholder="Enter OTP"
            className="w-full border p-3 rounded-lg"
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
            className="w-full bg-black text-white p-3 rounded-lg"
          >
            Verify
          </button>

        </form>

      </div>

    </div>
  );
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}