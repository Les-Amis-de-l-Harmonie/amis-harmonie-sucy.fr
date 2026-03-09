"use client";

import { useState, useEffect } from "react";
import { LogOut, Home, Globe, ChevronDown, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";

interface MusicianLayoutProps {
  children: React.ReactNode;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

export function MusicianLayout({ children, firstName, lastName, avatar }: MusicianLayoutProps) {
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : "Musicien";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <a href="/" className="flex-shrink-0">
                <img
                  src="/images/logo.webp"
                  alt="Les Amis de l'Harmonie de Sucy"
                  className="h-12 w-auto dark:hidden"
                />
                <img
                  src="/images/logo-dark.webp"
                  alt="Les Amis de l'Harmonie de Sucy"
                  className="h-12 w-auto hidden dark:block"
                />
              </a>
              <div className="hidden sm:flex items-center gap-1">
                <a
                  href="/musician/"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/musician")
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Espace Musicien
                </a>
                <a
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Site
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={`${firstName} ${lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                      {firstName?.[0]}
                      {lastName?.[0]}
                    </div>
                  )}
                  <span className="hidden md:inline">{displayName}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-800 z-20">
                      <form action="/musician/logout" method="post">
                        <button
                          type="submit"
                          className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Déconnexion
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>

              <ThemeToggle />

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={`sm:hidden fixed inset-x-0 top-16 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-300 ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div className="px-4 py-4 space-y-3">
          <a
            href="/musician/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
              isActive("/musician")
                ? "bg-primary/10 text-primary"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Home className="w-5 h-5" />
            Espace Musicien
          </a>
          <a
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Globe className="w-5 h-5" />
            Site public
          </a>

          <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

          <div className="px-4 py-2">
            <div className="flex items-center gap-3 mb-3">
              {avatar ? (
                <img
                  src={avatar}
                  alt={`${firstName} ${lastName}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  {firstName?.[0]}
                  {lastName?.[0]}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Musicien</p>
              </div>
            </div>
            <form action="/musician/logout" method="post">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </div>

      <main className="max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
