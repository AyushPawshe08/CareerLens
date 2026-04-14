"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/utils/api";

export default function Register() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {

      await API.post("/auth/register", {
        email,
        password,
      });

      // Redirect to the standalone /verify-user route (not /auth/verify)
      // Pass email as query param so the OTP page knows which account to verify
      router.push(`/verify-user?email=${encodeURIComponent(email)}`);

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Registration failed"
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="min-h-screen text-black flex items-center justify-center bg-gray-50">

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Create Account
        </h2>

        <form
          onSubmit={handleRegister}
          className="space-y-4"
        >

          <input
            type="email"
            placeholder="Email"
            required
            className="w-full border p-3 rounded-lg"
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Password"
            required
            className="w-full border p-3 rounded-lg"
            onChange={(e) =>
              setPassword(e.target.value)
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
            {loading ? "Sending OTP..." : "Register"}
          </button>

        </form>

        <p className="text-sm mt-4 text-center">

          Already have an account?{" "}

          <Link
            href="/auth/login"
            className="text-blue-600"
          >
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}