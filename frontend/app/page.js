"use client";

import { useEffect, useState } from "react";
import API from "../utils/api";
import { Telescope } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";

function App() {

  const [message, setMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check token
  useEffect(() => {

    const token =
      document.cookie
        .split("; ")
        .find(row =>
          row.startsWith("token=")
        )
        ?.split("=")[1];

    if (token) {
      setIsAuthenticated(true);
    }

  }, []);

  // Backend health check
  useEffect(() => {

    API.get("/health")
      .then((res) => {
        setMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
      });

  }, []);

  return (

    <div className="text-black min-h-screen bg-gray-50">

      {/* If logged in → show Navbar */}
      {isAuthenticated ? (

        <Navbar />

      ) : (

        <nav className="flex justify-between items-center px-6 py-4 bg-white border-b">

          <div className="flex items-center gap-2">

            <Telescope />

            <h1 className="text-lg font-bold">
              CareerLens
            </h1>

          </div>

          <div className="flex gap-2">

            <Link href="/auth/register">

              <button className="cursor-pointer border border-black px-4 py-2 rounded-lg">
                Register
              </button>

            </Link>

            <Link href="/auth/login">

              <button className="cursor-pointer border border-black px-4 py-2 rounded-lg">
                Login
              </button>

            </Link>

          </div>

        </nav>

      )}

      {/* Main Content */}

      <div className="p-6">

        <h2 className="text-xl font-semibold mb-2">
          Get detailed analysis of your resume here
        </h2>

        {message && (

          <p className="text-gray-600">
            {message}
          </p>

        )}

      </div>

    </div>

  );

}

export default App;