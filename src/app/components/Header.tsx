"use client";

import { useState, useEffect, useCallback } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { SocialIcons } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const [isMusicianLoggedIn, setIsMusicianLoggedIn] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json() as Promise<{ musician?: boolean; admin?: boolean }>)
      .then((data) => {
        setIsMusicianLoggedIn(!!data.musician);
        setIsAdminLoggedIn(!!data.admin);
      })
      .catch(() => {
        // Ignore errors
      });
  }, []);

  const handleLogout = (type: "musician" | "admin") => {
    window.location.href = type === "musician" ? "/musician/logout" : "/admin/logout";
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
        aria-label="Menu utilisateur"
      >
        <User className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-100 dark:border-gray-700 z-50">
            <a
              href="/musician/portal"
              className="block px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary"
            >
              Espace Musicien
            </a>
            <a
              href={isAdminLoggedIn ? "/admin" : "/admin/login"}
              className="block px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary"
            >
              Espace Admin
            </a>
            {(isMusicianLoggedIn || isAdminLoggedIn) && (
              <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                {isMusicianLoggedIn && (
                  <button
                    onClick={() => handleLogout("musician")}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion Musicien
                  </button>
                )}
                {isAdminLoggedIn && (
                  <button
                    onClick={() => handleLogout("admin")}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion Admin
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const navItems: NavItem[] = [
  {
    label: "Évènements",
    href: "/#evenements",
    children: [
      { label: "Évènements", href: "/#evenements" },
      { label: "Billetterie", href: "/billetterie" },
    ],
  },
  { label: "Thé Dansant", href: "/the-dansant" },
  {
    label: "À Propos",
    href: "/about",
    children: [
      { label: "L'Association", href: "/about" },
      { label: "L'Harmonie", href: "/harmonie" },
      { label: "Partenaires", href: "/partenaires" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    label: "Actualités",
    href: "/videos",
    children: [
      { label: "Vidéos", href: "/videos" },
      { label: "Publications", href: "/publications" },
    ],
  },
  { label: "Livre d'Or", href: "/livre-or" },
  { label: "Adhésion", href: "/adhesion" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setOpenAccordion(null);
  }, []);

  const toggleAccordion = useCallback((label: string) => {
    setOpenAccordion((current) => (current === label ? null : label));
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileMenuOpen) {
        closeMobileMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, closeMobileMenu]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <a href="/" className="flex-shrink-0">
            <img
              src="/images/logo.webp"
              alt="Les Amis de l'Harmonie de Sucy"
              className="h-16 w-auto dark:hidden"
            />
            <img
              src="/images/logo-dark.webp"
              alt="Les Amis de l'Harmonie de Sucy"
              className="h-16 w-auto hidden dark:block"
            />
          </a>

          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative group"
                onMouseEnter={() => item.children && setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <a
                  href={item.href}
                  className="px-4 py-2 text-[15px] font-medium text-gray-900 dark:text-gray-100 hover:text-primary transition-colors flex items-center gap-1"
                >
                  {item.label}
                  {item.children && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </a>
                {item.children && (
                  <div
                    className={`absolute left-0 top-full pt-2 w-48 transition-all duration-200 ${
                      openDropdown === item.label
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible -translate-y-2"
                    }`}
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-100 dark:border-gray-700">
                      {item.children.map((child) => (
                        <a
                          key={child.label}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary"
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <SocialIcons iconSize={20} />
            <ThemeToggle />
            <UserMenu />
          </div>

          <div className="flex lg:hidden items-center gap-1">
            <UserMenu />
            <ThemeToggle />
            {/* Animated Hamburger Button */}
            <button
              className="relative w-11 h-11 flex items-center justify-center text-gray-900 dark:text-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">{mobileMenuOpen ? "Fermer" : "Menu"}</span>
              <span className="relative w-6 h-5 flex flex-col justify-between">
                {/* Top bar */}
                <span
                  className={`w-full h-0.5 bg-current rounded-full transform transition-all duration-300 origin-center ${
                    mobileMenuOpen ? "rotate-45 translate-y-[9px]" : ""
                  }`}
                />
                {/* Middle bar */}
                <span
                  className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${
                    mobileMenuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
                  }`}
                />
                {/* Bottom bar */}
                <span
                  className={`w-full h-0.5 bg-current rounded-full transform transition-all duration-300 origin-center ${
                    mobileMenuOpen ? "-rotate-45 -translate-y-[9px]" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Menu Panel */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-350 ease-in-out ${
          mobileMenuOpen ? "max-h-[calc(100vh-5rem)] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {navItems.map((item, index) => (
            <div
              key={item.label}
              className="transform transition-all duration-300 ease-out"
              style={{
                transitionDelay: mobileMenuOpen ? `${index * 50}ms` : "0ms",
                opacity: mobileMenuOpen ? 1 : 0,
                transform: mobileMenuOpen ? "translateY(0)" : "translateY(8px)",
              }}
            >
              {item.children ? (
                // Accordion item
                <div>
                  <button
                    onClick={() => toggleAccordion(item.label)}
                    className="w-full flex items-center justify-between px-4 py-3 min-h-[48px] text-left text-[17px] font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    aria-expanded={openAccordion === item.label}
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                        openAccordion === item.label ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {/* Accordion sub-menu */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openAccordion === item.label ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="pl-4 bg-gray-50 dark:bg-gray-800/50">
                      {item.children.map((child) => (
                        <a
                          key={child.label}
                          href={child.href}
                          onClick={closeMobileMenu}
                          className="block px-4 py-3 min-h-[48px] text-[15px] text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Simple nav link
                <a
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="block px-4 py-3 min-h-[48px] text-[17px] font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {item.label}
                </a>
              )}
            </div>
          ))}
          {/* Social Icons */}
          <div
            className="px-4 pt-4 mt-2 border-t border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-out"
            style={{
              transitionDelay: mobileMenuOpen ? `${navItems.length * 50}ms` : "0ms",
              opacity: mobileMenuOpen ? 1 : 0,
              transform: mobileMenuOpen ? "translateY(0)" : "translateY(8px)",
            }}
          >
            <SocialIcons iconSize={24} />
          </div>
        </nav>
      </div>
    </header>
  );
}
