import API from "@/utils/api";

/**
 * Send the resume data to the backend for saving.
 * POST /resume/save
 */
export async function saveResume({ personalInfo, sections }) {
  const response = await API.post("/resume/save", {
    personalInfo,
    sections,
  });
  return response.data;
}
