import { env } from "cloudflare:workers";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Calendar, Video, Instagram, BookOpen, Mail } from "lucide-react";

async function getStats() {
  const [events, videos, publications, guestbook, contacts] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as count FROM events").first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) as count FROM videos").first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) as count FROM publications").first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) as count FROM guestbook").first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) as count FROM contact_submissions").first<{ count: number }>(),
  ]);

  return {
    events: events?.count || 0,
    videos: videos?.count || 0,
    publications: publications?.count || 0,
    guestbook: guestbook?.count || 0,
    contacts: contacts?.count || 0,
  };
}

export async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { title: "Événements", count: stats.events, icon: Calendar, href: "/admin/events", color: "bg-blue-500" },
    { title: "Vidéos", count: stats.videos, icon: Video, href: "/admin/videos", color: "bg-red-500" },
    { title: "Publications", count: stats.publications, icon: Instagram, href: "/admin/publications", color: "bg-pink-500" },
    { title: "Livre d'Or", count: stats.guestbook, icon: BookOpen, href: "/admin/guestbook", color: "bg-green-500" },
    { title: "Messages", count: stats.contacts, icon: Mail, href: "/admin/contact", color: "bg-yellow-500" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tableau de bord</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card) => (
          <a key={card.href} href={card.href} className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.count}</div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a 
            href="/admin/events?action=new"
            className="p-4 bg-white rounded-lg border hover:border-[#a5b3e2] hover:shadow-md transition-all"
          >
            <Calendar className="w-6 h-6 text-[#a5b3e2] mb-2" />
            <h3 className="font-medium">Nouvel événement</h3>
            <p className="text-sm text-gray-500">Ajouter un événement au calendrier</p>
          </a>
          <a 
            href="/admin/videos?action=new"
            className="p-4 bg-white rounded-lg border hover:border-[#a5b3e2] hover:shadow-md transition-all"
          >
            <Video className="w-6 h-6 text-[#a5b3e2] mb-2" />
            <h3 className="font-medium">Nouvelle vidéo</h3>
            <p className="text-sm text-gray-500">Ajouter une vidéo YouTube</p>
          </a>
          <a 
            href="/admin/publications?action=new"
            className="p-4 bg-white rounded-lg border hover:border-[#a5b3e2] hover:shadow-md transition-all"
          >
            <Instagram className="w-6 h-6 text-[#a5b3e2] mb-2" />
            <h3 className="font-medium">Nouvelle publication</h3>
            <p className="text-sm text-gray-500">Ajouter un post Instagram</p>
          </a>
        </div>
      </div>
    </div>
  );
}
