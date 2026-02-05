import { AdminLayout } from "./AdminLayout";
import { AdminDashboard } from "./Dashboard";
import { EventsAdminClient } from "./EventsAdmin";
import { VideosAdminClient } from "./VideosAdmin";
import { PublicationsAdminClient } from "./PublicationsAdmin";
import { GuestbookAdminClient } from "./GuestbookAdmin";
import { ContactAdminClient } from "./ContactAdmin";
import { UsersAdminClient } from "./UsersAdmin";
import { GalleryAdminClient } from "./GalleryAdmin";

interface AdminPageProps {
  email: string;
}

export function AdminDashboardPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <AdminDashboard />
    </AdminLayout>
  );
}

export function AdminEventsPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <EventsAdminClient />
    </AdminLayout>
  );
}

export function AdminVideosPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <VideosAdminClient />
    </AdminLayout>
  );
}

export function AdminPublicationsPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <PublicationsAdminClient />
    </AdminLayout>
  );
}

export function AdminGuestbookPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <GuestbookAdminClient />
    </AdminLayout>
  );
}

export function AdminContactPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <ContactAdminClient />
    </AdminLayout>
  );
}

export function AdminUsersPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <UsersAdminClient />
    </AdminLayout>
  );
}

export function AdminGalleryPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <GalleryAdminClient />
    </AdminLayout>
  );
}
