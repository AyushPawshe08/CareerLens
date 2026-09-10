"use client";

/**
 * Navbar — self-aware, always-complete navigation.
 *
 * Strategy:
 *   1. Reads `career_input_id` from the current URL (if on an analysis route)
 *      OR from localStorage (last visited analysis session).
 *   2. Always renders the full nav — brand · context links · user menu.
 *   3. Pages no longer need to pass a `links` prop (it's still accepted for
 *      backward-compat but ignored in favour of the smart links).
 *
 * Route groups:
 *   Static  → Home, New Analysis (job-input), Resume Builder
 *   Context → Analysis, Interview Qs, Resources, ATS Resume
 *             (only shown when an inputId is known)
 */

import { Telescope, ChevronDown, LayoutDashboard, FileText, PenLine, BarChart2, MessageSquare, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import API from "@/utils/api";

/* ── Regex to extract inputId from any context route ── */
const CONTEXT_ROUTE_RE =
  /^\/(?:analysis|interview-questions|resources|resume-generator)\/([^/]+)/;

const LS_KEY = "careerlens_last_input_id";

/* ── Nav link definitions ── */
const STATIC_LINKS = [
  { label: "New Analysis",    href: "/job-input",   icon: <Sparkles   size={14} /> },
  { label: "Resume Builder",  href: "/resume",       icon: <PenLine    size={14} /> },
];

function buildContextLinks(id) {
  return [
    { label: "Analysis",           href: `/analysis/${id}`,             icon: <BarChart2     size={14} /> },
    { label: "Interview Qs",       href: `/interview-questions/${id}`,  icon: <MessageSquare size={14} /> },
    { label: "Resources",          href: `/resources/${id}`,            icon: <BookOpen      size={14} /> },
    { label: "ATS Resume",         href: `/resume-generator/${id}`,     icon: <FileText      size={14} /> },
  ];
}

export default function Navbar({ links: _ignored }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user,       setUser]       = useState(null);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inputId,    setInputId]    = useState(null);
  const menuRef   = useRef(null);
  const mobileRef = useRef(null);

  /* ── Resolve inputId from URL or localStorage ── */
  useEffect(() => {
    const match = pathname.match(CONTEXT_ROUTE_RE);
    if (match) {
      const id = match[1];
      setInputId(id);
      try { localStorage.setItem(LS_KEY, id); } catch { /* ignore */ }
    } else {
      // Not on a context route — try to restore from storage
      try {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) setInputId(stored);
      } catch { /* ignore */ }
    }
  }, [pathname]);

  /* ── Fetch user ── */
  useEffect(() => {
    const t = setTimeout(() => {
      API.get("/auth/get-current-user", { skipAuthRedirect: true })
        .then(res => setUser(res.data))
        .catch(() => setUser(null));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Close mobile menu on route change ── */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("token");
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    router.push("/auth/login");
  };

  const letter = user?.email ? user.email[0].toUpperCase() : "?";
  const contextLinks = inputId ? buildContextLinks(inputId) : [];
  const allLinks = [...STATIC_LINKS, ...contextLinks];

  const isActive = (href) => {
    if (href === "/job-input") return pathname === "/job-input";
    if (href === "/resume")    return pathname === "/resume";
    return pathname.startsWith(href.split("/").slice(0, 3).join("/"));
  };

  return (
    <>
      <nav style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        height: "var(--navbar-h, 60px)",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 8px rgba(15,23,42,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: "12px",
      }}>

        {/* ══ Brand ══ */}
        <Link href="/" style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "1.0625rem",
          fontWeight: 700,
          color: "var(--text-heading)",
          textDecoration: "none",
          flexShrink: 0,
        }}>
          <Telescope size={20} strokeWidth={2} style={{ color: "var(--primary)" }} />
          CareerLens
        </Link>

        {/* ══ Desktop Nav Links ══ */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          flex: 1,
          justifyContent: "center",
          flexWrap: "wrap",
          // Hide on mobile (handled by hamburger)
        }}
          className="navbar-desktop-links"
        >
          {/* Static links */}
          {STATIC_LINKS.map(link => (
            <NavLink key={link.href} href={link.href} icon={link.icon} active={isActive(link.href)}>
              {link.label}
            </NavLink>
          ))}

          {/* Divider + context links (only when inputId known) */}
          {contextLinks.length > 0 && (
            <>
              <div style={{ width: "1px", height: "18px", background: "var(--border)", margin: "0 6px", flexShrink: 0 }} />
              {contextLinks.map(link => (
                <NavLink key={link.href} href={link.href} icon={link.icon} active={isActive(link.href)}>
                  {link.label}
                </NavLink>
              ))}
            </>
          )}
        </div>

        {/* ══ Right side: Hamburger (mobile) + Avatar ══ */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle navigation"
            className="navbar-hamburger"
            onClick={() => setMobileOpen(p => !p)}
            style={{
              display: "none", // shown via CSS class on small screens
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "5px 8px",
              cursor: "pointer",
              color: "var(--text-body)",
              alignItems: "center",
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="5" x2="15" y2="5" />
              <line x1="3" y1="9" x2="15" y2="9" />
              <line x1="3" y1="13" x2="15" y2="13" />
            </svg>
          </button>

          {/* Avatar + dropdown */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              id="navbar-profile-btn"
              aria-label="Profile menu"
              onClick={() => setMenuOpen(p => !p)}
              style={{
                width: "36px", height: "36px",
                borderRadius: "50%",
                border: "2px solid var(--primary)",
                background: menuOpen ? "var(--primary)" : "var(--primary-light)",
                color: menuOpen ? "#fff" : "var(--primary)",
                fontSize: "0.9375rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "box-shadow 0.18s, background 0.18s, color 0.18s",
                outline: "none",
                userSelect: "none",
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 0 0 4px rgba(79,110,247,0.18)";
                e.currentTarget.style.background = "var(--primary)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={e => {
                if (!menuOpen) {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "var(--primary-light)";
                  e.currentTarget.style.color = "var(--primary)";
                }
              }}
            >
              {letter}
            </button>

            {menuOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                minWidth: "220px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 8px 24px rgba(15,23,42,0.13)",
                overflow: "hidden",
                zIndex: 300,
                animation: "fadeSlideDown 0.15s ease",
              }}>
                {/* User info */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: "var(--primary-light)", border: "1.5px solid var(--primary)",
                      color: "var(--primary)", fontWeight: 700, fontSize: "0.875rem",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {letter}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user?.email ?? "Loading…"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Signed in</div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <DropdownItem href="/job-input" icon={<Sparkles size={14} />} onClick={() => setMenuOpen(false)}>
                  New Analysis
                </DropdownItem>
                <DropdownItem href="/resume" icon={<PenLine size={14} />} onClick={() => setMenuOpen(false)}>
                  Resume Builder
                </DropdownItem>

                {inputId && (
                  <>
                    <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                    <div style={{ padding: "4px 14px 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>
                      Current Session
                    </div>
                    {contextLinks.map(link => (
                      <DropdownItem key={link.href} href={link.href} icon={link.icon} onClick={() => setMenuOpen(false)}>
                        {link.label}
                      </DropdownItem>
                    ))}
                  </>
                )}

                {/* Sign out */}
                <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                <button
                  id="navbar-logout-btn"
                  onClick={handleLogout}
                  style={{
                    width: "100%", padding: "10px 14px",
                    background: "transparent", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "8px",
                    fontSize: "0.875rem", fontWeight: 500,
                    color: "var(--danger)", transition: "background 0.15s", textAlign: "left",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--danger-bg)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ Mobile drawer ══ */}
      {mobileOpen && (
        <div
          ref={mobileRef}
          style={{
            position: "fixed",
            top: "var(--navbar-h, 60px)",
            left: 0, right: 0,
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "0 8px 24px rgba(15,23,42,0.13)",
            zIndex: 199,
            padding: "12px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            animation: "fadeSlideDown 0.15s ease",
          }}
        >
          <MobileSection label="Tools">
            {STATIC_LINKS.map(link => (
              <MobileLink key={link.href} href={link.href} icon={link.icon} active={isActive(link.href)} onClick={() => setMobileOpen(false)}>
                {link.label}
              </MobileLink>
            ))}
          </MobileSection>

          {contextLinks.length > 0 && (
            <MobileSection label="Current Analysis">
              {contextLinks.map(link => (
                <MobileLink key={link.href} href={link.href} icon={link.icon} active={isActive(link.href)} onClick={() => setMobileOpen(false)}>
                  {link.label}
                </MobileLink>
              ))}
            </MobileSection>
          )}
        </div>
      )}

      {/* Responsive + animation styles */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .navbar-desktop-links { display: none !important; }
          .navbar-hamburger { display: flex !important; }
        }
        @media (min-width: 769px) {
          .navbar-hamburger { display: none !important; }
        }
      `}</style>
    </>
  );
}

/* ── Desktop nav link ── */
function NavLink({ href, icon, active, children }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "0.8375rem",
        fontWeight: active ? 600 : 500,
        color: active ? "var(--primary)" : "var(--text-muted)",
        padding: "5px 11px",
        borderRadius: "var(--radius-sm)",
        textDecoration: "none",
        background: active ? "var(--primary-light)" : "transparent",
        transition: "color 0.15s, background 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.color = "var(--primary)";
          e.currentTarget.style.background = "var(--primary-light)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <span style={{ opacity: 0.75 }}>{icon}</span>
      {children}
    </Link>
  );
}

/* ── Dropdown menu item ── */
function DropdownItem({ href, icon, onClick, children }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 14px",
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "var(--text-body)",
        textDecoration: "none",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-subtle)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ color: "var(--primary)", opacity: 0.8 }}>{icon}</span>
      {children}
    </Link>
  );
}

/* ── Mobile section label ── */
function MobileSection({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", padding: "6px 10px 4px" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/* ── Mobile nav link ── */
function MobileLink({ href, icon, active, onClick, children }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.9rem",
        fontWeight: active ? 600 : 500,
        color: active ? "var(--primary)" : "var(--text-body)",
        background: active ? "var(--primary-light)" : "transparent",
        textDecoration: "none",
        transition: "background 0.12s",
      }}
    >
      <span style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}>{icon}</span>
      {children}
    </Link>
  );
}