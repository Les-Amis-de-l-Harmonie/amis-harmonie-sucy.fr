import { env } from "cloudflare:workers";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Calendar,
  Video,
  Instagram,
  BookOpen,
  Mail,
  Images,
  Lightbulb,
  Users,
  BarChart3,
} from "lucide-react";

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

      {/* Statistiques de visite du site public */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Statistiques de visite du site public
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2 border-indigo-100 dark:border-indigo-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Visites totales
              </CardTitle>
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">-</div>
              <p className="text-xs text-muted-foreground mt-1">Depuis le lancement</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24 dernières heures
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <BarChart3 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">-</div>
              <p className="text-xs text-muted-foreground mt-1">Visites uniques</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 dark:border-blue-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                7 derniers jours
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">-</div>
              <p className="text-xs text-muted-foreground mt-1">Visites uniques</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100 dark:border-purple-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                30 derniers jours
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">-</div>
              <p className="text-xs text-muted-foreground mt-1">Visites uniques</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">
          * Les statistiques de visite sont fournies par Cloudflare Analytics. Connectez-vous à
          votre dashboard Cloudflare pour des données détaillées.
        </p>
      </div>
    </div>
  );
}
