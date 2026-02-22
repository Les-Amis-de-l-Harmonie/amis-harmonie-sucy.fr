"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  Video,
  Instagram,
  BookOpen,
  Mail,
  Users,
  Images,
  Lightbulb,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";

interface AdminLayoutProps {
  children: React.ReactNode;
  email: string;
}

const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/events", label: "Événements", icon: Calendar },
  { href: "/admin/gallery", label: "Galerie", icon: Images },
  { href: "/admin/videos", label: "Vidéos", icon: Video },
  { href: "/admin/publications", label: "Publications", icon: Instagram },
  { href: "/admin/guestbook", label: "Livre d'Or", icon: BookOpen },
  { href: "/admin/ideas", label: "Boîte à idées", icon: Lightbulb },
  { href: "/admin/contact", label: "Messages", icon: Mail },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
];

export function AdminLayout({ children, email }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setCurrentPage(window.location.pathname);

      const handlePopState = () => {
        setCurrentPage(window.location.pathname);
        setSidebarOpen(false);
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <div className="lg:hidden sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground truncate max-w-[120px]">{email}</span>
            <a
              href="/admin/logout"
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-card border-r border-border transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:top-auto lg:left-auto lg:z-auto lg:bg-transparent lg:border-r lg:flex-shrink-0 lg:h-screen lg:sticky lg:top-0`}
      >
        <div className="h-full flex flex-col bg-card lg:bg-transparent">
          <div className="flex-shrink-0 px-6 py-5 border-b border-border lg:hidden">
            <a href="/admin" className="text-xl font-bold text-primary flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6" />
              Admin
            </a>
          </div>

          <div className="hidden lg:flex flex-shrink-0 px-6 py-6 border-b border-border items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <a href="/admin" className="text-xl font-bold text-primary">
                Admin
              </a>
              <p className="text-xs text-muted-foreground">Amis de l'Harmonie</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="hidden lg:block px-4 py-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{email}</p>
                <p className="text-xs text-muted-foreground">Administrateur</p>
              </div>
              <ThemeToggle />
            </div>
            <a
              href="/admin/logout"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </a>
          </div>

          <div className="lg:hidden px-4 py-4 border-t border-border">
            <a
              href="/admin/logout"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </a>
          </div>
        </div>
      </aside>

      <main className="min-h-[calc(100vh-64px)] lg:min-h-screen lg:flex-1 lg:min-w-0">
        <div className="px-4 py-4 sm:px-6 lg:px-8 pb-24 sm:pb-28 lg:pb-8">{children}</div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-center justify-around py-2 px-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = currentPage === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all min-w-[60px] ${
                  isActive ? "text-primary bg-primary/5" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] leading-tight text-center">
                  {item.label.split(" ")[0]}
                </span>
              </a>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0px)] bg-card" />
      </div>
    </div>
  );
}
