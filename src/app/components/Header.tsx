"use client";

import { useState } from "react";
import { SocialIcons } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
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

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <a href="/" className="flex-shrink-0">
            <img
              src="/images/logo.png"
              alt="Les Amis de l'Harmonie de Sucy"
              className="h-16 w-auto dark:hidden"
            />
            <img
              src="/images/logo-dark.png"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </a>
                {item.children && (
                  <div
                    className={`absolute left-0 top-full pt-2 w-48 transition-all duration-200 ${
                      openDropdown === item.label ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
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
          </div>

          <div className="flex lg:hidden items-center gap-1">
            <ThemeToggle />
            <button
              className="p-2 text-gray-900 dark:text-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            {navItems.map((item) => (
              <div key={item.label} className="py-2">
                <a
                  href={item.href}
                  className="block px-4 py-2 text-[15px] font-medium text-gray-900 dark:text-gray-100"
                >
                  {item.label}
                </a>
                {item.children && (
                  <div className="pl-8">
                    {item.children.map((child) => (
                      <a
                        key={child.label}
                        href={child.href}
                        className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <SocialIcons iconSize={24} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
