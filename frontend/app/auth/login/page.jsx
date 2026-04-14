"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import API from "@/utils/api";

/**
 * Inner component — uses useSearchParams, so must be inside <Suspense>.
 */
function LoginForm() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {

    e.preventDefault();

    try {

      const res =
        await API.post("/auth/login", {
          email,
          password,
        });

      const token = res.data.access_token;

      // Store in localStorage (for API interceptor fallback)
      localStorage.setItem("token", token);

      // Store in cookie so Next.js middleware can read it server-side
      // max-age matches a 24-hour session; adjust to ACCESS_TOKEN_EXPIRE_MINUTES
      document.cookie =
        `token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

      // Redirect to intended destination (from ?next=) or default /job-input
      const next = searchParams.get("next") || "/job-input";
      router.push(next);

    } catch (err) {

      setError(
        err.response?.data?.detail ||
        "Login failed"
      );

    }

  };

  return (

    <div className="min-h-screen text-black flex items-center justify-center bg-gray-50">

      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Login
        </h2>

        <form
          onSubmit={handleLogin}
          className="space-y-4"
        >

          <input
            type="email"
            placeholder="Email"
            className="w-full border p-3 rounded-lg"
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Password"
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
            className="w-full bg-black text-white p-3 rounded-lg"
          >
            Login
          </button>

        </form>

        <p className="text-sm mt-4 text-center">

          Don't have an account?{" "}

          <Link
            href="/auth/register"
            className="text-blue-600"
          >
            Register
          </Link>

        </p>

      </div>

    </div>
  );
}

/**
 * Exported page — wraps LoginForm in Suspense as required
 * by Next.js when useSearchParams is used inside a Client Component.
 */
export default function Login() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}