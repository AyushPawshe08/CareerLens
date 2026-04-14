"use client";

import { Telescope } from "lucide-react";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Navbar
 *
 * Props:
 *   links — optional array of { label: string, href: string }
 *           rendered as navigation links between the logo and logout button.
 *           Defaults to [] (no extra links — preserves original behaviour).
 */
const Navbar = ({ links = [] }) => {

  const router = useRouter();

  // Logout Function
  const handleLogout = () => {

    // Delete cookie
    document.cookie =
      "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

    // Clear localStorage
    localStorage.removeItem("token");

    // Redirect to login
    router.push("/auth/login");

  };

  return (

    <nav className="flex items-center justify-between px-6 py-1 border-b bg-white">

      {/* Logo Section */}
      <div className="flex text-black items-center gap-2">

        <Telescope size={24} />

        <h1 className="text-xl font-bold">
          CareerLens
        </h1>

      </div>

      {/* Optional navigation links */}
      {links.length > 0 && (
        <div className="flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-black hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="text-red-500  cursor-pointer"
      >
        Logout
      </button>

    </nav>

  );

};

export default Navbar;