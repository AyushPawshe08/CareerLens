/**
 * navLinks.js
 *
 * Legacy helper — kept for backward compatibility.
 * The Navbar component is now self-aware and reads the career_input_id
 * directly from the URL / localStorage. Pages no longer need to pass links.
 *
 * @param {string} inputId — career_input_id
 */
export function buildNavLinks(inputId) {
  return [
    { label: "Analysis",            href: `/analysis/${inputId}` },
    { label: "Interview Questions", href: `/interview-questions/${inputId}` },
    { label: "Resources",           href: `/resources/${inputId}` },
    { label: "ATS Resume",          href: `/resume-generator/${inputId}` },
    { label: "Resume Builder",      href: "/resume" },
  ];
}
