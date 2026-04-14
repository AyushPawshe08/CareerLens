"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/utils/api";
import Navbar from "@/components/ui/Navbar";

const JobInput = () => {

  const router = useRouter();

  const [jobDescription, setJobDescription] =
    useState("");

  const [resume, setResume] =
    useState(null);

  const [selfDescription, setSelfDescription] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);
    setError("");

    try {

      const formData = new FormData();

      // Required fields
      // user_id is NO LONGER sent from the frontend — the backend
      // derives it from the JWT token (Authorization header).
      formData.append(
        "job_description",
        jobDescription
      );

      // Optional fields
      if (selfDescription) {
        formData.append(
          "self_description",
          selfDescription
        );
      }

      if (resume) {
        formData.append(
          "resume",
          resume
        );
      }

      // Step 1: Create career input record.
      // The backend will also trigger the Celery analysis task internally.
      const res = await API.post(
        "/career-inputs/",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      const inputId = res.data.id;

      console.log(
        "Career input created:",
        inputId,
        "— Celery analysis task triggered by backend."
      );

      // Step 2: Redirect to the analysis page.
      // The analysis page will poll for results.
      router.push(`/analysis/${inputId}`);

    } catch (err) {

      console.error(
        "Submission Error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Submission failed"
      );

    } finally {

      setLoading(false);

    }

  };

  return (

   <div>
    <Navbar/>
     <div className="min-h-screen text-black flex items-center justify-center bg-gray-50 p-6">

      <div className="w-full max-w-2xl bg-white shadow-lg rounded-2xl p-8">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Career Analysis Input
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* Job Description */}

          <div>

            <label className="block font-medium mb-2">
              Job Description
            </label>

            <textarea
              required
              rows={6}
              placeholder="Paste the job description..."
              className="w-full border p-3 rounded-lg"
              value={jobDescription}
              onChange={(e) =>
                setJobDescription(
                  e.target.value
                )
              }
            />

          </div>

          {/* Resume */}

          <div>

            <label className="block font-medium mb-2">
              Upload Resume (PDF)
            </label>

            <input
              type="file"
              accept=".pdf"
              className="w-full border p-3 rounded-lg"
              onChange={(e) => {

                const file =
                  e.target.files[0];

                console.log(
                  "Selected File:",
                  file
                );

                setResume(file);

              }}
            />

            <p className="text-sm text-gray-500 mt-1">
              With resume you get better results
            </p>

          </div>

          {/* Self Description */}

          <div>

            <label className="block font-medium mb-2">
              Self Description
            </label>

            <textarea
              rows={4}
              placeholder="Describe your skills if no resume..."
              className="w-full border p-3 rounded-lg"
              value={selfDescription}
              onChange={(e) =>
                setSelfDescription(
                  e.target.value
                )
              }
            />

          </div>

          {/* Error */}

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          {/* Submit */}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition"
          >

            {loading
              ? "Submitting..."
              : "Analyze"}

          </button>

        </form>

      </div>

    </div>
   </div>

  );

};

export default JobInput;