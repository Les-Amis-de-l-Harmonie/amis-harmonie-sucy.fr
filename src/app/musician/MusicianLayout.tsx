"use client";

import { LogOut, Music, Home, Globe } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";

interface MusicianLayoutProps {
  children: React.ReactNode;
  firstName: string;
  lastName: string;
}

export function MusicianLayout({ children, firstName, lastName }: MusicianLayoutProps) {
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : "Musicien";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <a
                href="/musician/"
                className="flex items-center gap-2 text-xl font-bold text-primary"
              >
                <Music className="w-6 h-6" />
                Espace Musicien
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
                  Accueil
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
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="hidden sm:flex items-center text-sm text-gray-500 dark:text-gray-400">
                {displayName}
              </div>
              <a
                href="/musician/logout"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
