"use client";

import { useState, useCallback } from "react";
import { LogOut, Home, Menu, X } from "lucide-react";

export function MusicianNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleLogout = () => {
    window.location.href = "/musician/logout";
  };

  return (
    <>
      <button
        onClick={toggleMenu}
        className="lg:hidden fixed top-4 right-4 z-50 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className="fixed top-0 right-0 bottom-0 w-64 max-w-[80vw] bg-white dark:bg-gray-900 z-50 shadow-xl border-l border-gray-200 dark:border-gray-700 lg:hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Espace Musicien
              </h2>
            </div>
            <nav className="p-4 space-y-2">
              <a
                href="/musician/portal"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              >
                <span>Accueil</span>
              </a>
              <a
                href="/musician/profile"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              >
                <span>Mon Profil</span>
              </a>
              <a
                href="/musician/trombinoscope"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              >
                <span>Trombinoscope</span>
              </a>
              <a
                href="/musician/assurance"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              >
                <span>Assurance</span>
              </a>
              <a
                href="/musician/idee"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              >
                <span>Boîte à idées</span>
              </a>
              <a
                href="/musician/disponibilites"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-900 dark:text-gray-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
              >
                <span>Disponibilités</span>
              </a>
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <a
                href="/"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Retour au site</span>
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
