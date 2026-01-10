import { 
  LayoutDashboard, 
  Calendar, 
  Video, 
  Instagram, 
  BookOpen, 
  Mail, 
  LogOut 
} from "lucide-react";

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
];

export function AdminLayout({ children, email }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <a href="/admin" className="text-xl font-bold text-[#a5b3e2]">
                  Admin
                </a>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#a5b3e2] hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{email}</span>
              <a
                href="/admin/logout"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="sm:hidden bg-white border-b px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-[#a5b3e2] hover:bg-gray-50 rounded-md whitespace-nowrap"
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
