/**
 * Shared nav link builder for all private analysis pages.
 * Import this wherever buildNavLinks is needed to keep them in sync.
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
