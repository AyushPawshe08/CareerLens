"use client";

import { Telescope } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Navbar
 *
 * Props:
 *   links — optional array of { label: string, href: string }
 *           rendered as navigation links between the logo and logout button.
 */
const Navbar = ({ links = [] }) => {

  const router   = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("token");
    router.push("/auth/login");
  };

  return (
    <nav className="navbar">

      {/* ── Brand ── */}
      <Link href="/" className="navbar-brand">
        <Telescope size={20} strokeWidth={2} style={{ color: "var(--primary)" }} />
        <span>CareerLens</span>
      </Link>

      {/* ── Nav Links ── */}
      {links.length > 0 && (
        <div className="navbar-links">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link${isActive ? " active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Logout ── */}
      <button
        id="navbar-logout-btn"
        onClick={handleLogout}
        className="btn btn-ghost btn-sm"
        style={{ color: "var(--danger)", borderColor: "var(--danger)", background: "transparent" }}
      >
        Sign out
      </button>

    </nav>
  );
};

export default Navbar;