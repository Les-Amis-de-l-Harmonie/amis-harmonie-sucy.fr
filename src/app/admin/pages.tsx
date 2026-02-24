import { AdminLayout } from "./AdminLayout";
import { AdminDashboard } from "./Dashboard";
import { EventsAdminClient } from "./EventsAdmin";
import { VideosAdminClient } from "./VideosAdmin";
import { PublicationsAdminClient } from "./PublicationsAdmin";
import { GuestbookAdminClient } from "./GuestbookAdmin";
import { ContactAdminClient } from "./ContactAdmin";
import { UsersAdminClient } from "./UsersAdmin";
import { GalleryAdminClient } from "./GalleryAdmin";
import { IdeasAdminClient } from "./IdeasAdmin";
import { OutingSettingsClient } from "./OutingSettingsAdmin";
import { CardOrderClient } from "./CardOrderAdmin";
import { InfoSettingsClient } from "./InfoSettingsAdmin";

import type { UserRole } from "@/db/types";

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

interface AdminUsersPageProps {
  email: string;
  role: UserRole;
}

export function AdminUsersPage({ email, role }: AdminUsersPageProps) {
  return (
    <AdminLayout email={email}>
      <UsersAdminClient currentUserRole={role} currentUserEmail={email} />
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

export function AdminIdeasPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <IdeasAdminClient />
    </AdminLayout>
  );
}

export function AdminOutingSettingsPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <OutingSettingsClient />
    </AdminLayout>
  );
}

export function AdminCardOrderPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <CardOrderClient />
    </AdminLayout>
  );
}

export function AdminInfoSettingsPage({ email }: AdminPageProps) {
  return (
    <AdminLayout email={email}>
      <InfoSettingsClient />
    </AdminLayout>
  );
}
