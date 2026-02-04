import { 
  LayoutDashboard, 
  Calendar, 
  Video, 
  Instagram, 
  BookOpen, 
  Mail, 
  Users,
  LogOut 
} from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";

interface AdminLayoutProps {
  children: React.ReactNode;
  email: string;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Événements", icon: Calendar },
  { href: "/admin/videos", label: "Vidéos", icon: Video },
  { href: "/admin/publications", label: "Publications", icon: Instagram },
  { href: "/admin/guestbook", label: "Livre d'Or", icon: BookOpen },
  { href: "/admin/contact", label: "Messages", icon: Mail },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
];

export function AdminLayout({ children, email }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <a href="/admin" className="text-xl font-bold text-primary">
                  Admin
                </a>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-sm text-gray-500 dark:text-gray-400">{email}</span>
              <a
                href="/admin/logout"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="sm:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md whitespace-nowrap"
            >
              <item.icon className="w-4 h-4 mr-1" />
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
