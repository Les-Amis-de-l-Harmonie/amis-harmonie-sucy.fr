import { env } from "cloudflare:workers";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Calendar, Video, Instagram, BookOpen, Mail, Images, Lightbulb, Users } from "lucide-react";

async function getStats() {
  const [events, videos, publications, guestbook, contacts, galleryImages, ideas, users] =
    await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as count FROM events").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) as count FROM videos").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) as count FROM publications").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) as count FROM guestbook").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) as count FROM contact_submissions").first<{
        count: number;
      }>(),
      env.DB.prepare("SELECT COUNT(*) as count FROM gallery_images").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) as count FROM ideas").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'MUSICIAN'").first<{
        count: number;
      }>(),
    ]);

  return {
    events: events?.count || 0,
    videos: videos?.count || 0,
    publications: publications?.count || 0,
    guestbook: guestbook?.count || 0,
    contacts: contacts?.count || 0,
    galleryImages: galleryImages?.count || 0,
    ideas: ideas?.count || 0,
    users: users?.count || 0,
  };
}
export async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    {
      title: "Événements",
      count: stats.events,
      icon: Calendar,
      href: "/admin/events",
      color: "bg-blue-500",
      description: "Gérer les événements",
    },
    {
      title: "Vidéos",
      count: stats.videos,
      icon: Video,
      href: "/admin/videos",
      color: "bg-red-500",
      description: "Gérer les vidéos",
    },
    {
      title: "Publications",
      count: stats.publications,
      icon: Instagram,
      href: "/admin/publications",
      color: "bg-pink-500",
      description: "Posts Instagram",
    },
    {
      title: "Livre d'Or",
      count: stats.guestbook,
      icon: BookOpen,
      href: "/admin/guestbook",
      color: "bg-green-500",
      description: "Messages visiteurs",
    },
    {
      title: "Messages",
      count: stats.contacts,
      icon: Mail,
      href: "/admin/contact",
      color: "bg-yellow-500",
      description: "Demandes de contact",
    },
    {
      title: "Images Galerie",
      count: stats.galleryImages,
      icon: Images,
      href: "/admin/gallery",
      color: "bg-purple-500",
      description: "Photos de la galerie",
    },
    {
      title: "Boîte à idées",
      count: stats.ideas,
      icon: Lightbulb,
      href: "/admin/ideas",
      color: "bg-amber-500",
      description: "Idées des musiciens",
    },
    {
      title: "Musiciens",
      count: stats.users,
      icon: Users,
      href: "/admin/users",
      color: "bg-cyan-500",
      description: "Utilisateurs",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble de votre site</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <a key={card.href} href={card.href} className="block h-full group">
            <Card className="hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer h-full flex flex-col overflow-hidden border-2">
              <div className={`h-2 ${card.color}`} />
              <CardHeader className="flex flex-row items-start justify-between pb-3 flex-1 pt-5">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground leading-tight">
                    {card.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
                <div
                  className={`p-2.5 rounded-xl ${card.color}/15 shrink-0 ml-2 group-hover:scale-110 transition-transform`}
                >
                  <card.icon className={`w-6 h-6 ${card.color.replace("bg-", "text-")}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-5">
                <div className="text-4xl font-bold text-foreground">{card.count}</div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
