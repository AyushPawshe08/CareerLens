import React, { useState, useEffect } from "react";
import axios from "axios";

// Fallback to direct axios usage if utils/api is not at this exact path
import API from "../../../utils/api";

function Questions({ careerInputId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!careerInputId) return;

    setLoading(true);
    setError(null);

    // Fetch interview questions
    API.get(`/interview-questions/${careerInputId}`)
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching interview questions:", err);
        setError("Failed to load interview questions.");
        setLoading(false);
      });
  }, [careerInputId]);

  const toggleSection = (section) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  if (loading) {
    return <div className="p-4 bg-white text-black">Loading interview questions...</div>;
  }

  if (error) {
    return <div className="p-4 bg-white text-black">{error}</div>;
  }

  if (!data || (!data.technical?.length && !data.behavioral?.length && !data.hr?.length)) {
    return <div className="p-4 bg-white text-black">No interview questions found.</div>;
  }

  const renderSection = (title, key) => {
    const questions = data[key] || [];
    if (questions.length === 0) return null;

    const isActive = activeSection === key;

    return (
      <div className="mt-2 border p-4 bg-white text-black" key={key}>
        <div 
          className="cursor-pointer font-bold"
          onClick={() => toggleSection(key)}
        >
          {title}
        </div>
        
        {isActive && (
          <div className="mt-4">
            {questions.map((q, index) => (
              <div key={index} className="mt-2">
                {index + 1}. {q}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white text-black p-4">
      {renderSection("Technical Questions", "technical")}
      {renderSection("Behavioral Questions", "behavioral")}
      {renderSection("HR Questions", "hr")}
    </div>
  );
}

export default Questions;
