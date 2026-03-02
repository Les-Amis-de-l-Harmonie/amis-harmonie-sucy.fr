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
import { InsuranceAdminClient } from "./InsuranceAdmin";

import type { UserRole } from "@/db/types";

interface AdminPageProps {
  email: string;
  role: UserRole;
}

export function AdminDashboardPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <AdminDashboard />
    </AdminLayout>
  );
}

export function AdminEventsPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <EventsAdminClient />
    </AdminLayout>
  );
}

export function AdminVideosPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <VideosAdminClient />
    </AdminLayout>
  );
}

export function AdminPublicationsPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <PublicationsAdminClient />
    </AdminLayout>
  );
}

export function AdminGuestbookPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <GuestbookAdminClient />
    </AdminLayout>
  );
}

export function AdminContactPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <ContactAdminClient />
    </AdminLayout>
  );
}

export function AdminUsersPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <UsersAdminClient currentUserRole={role} currentUserEmail={email} />
    </AdminLayout>
  );
}

export function AdminGalleryPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <GalleryAdminClient />
    </AdminLayout>
  );
}

export function AdminIdeasPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <IdeasAdminClient />
    </AdminLayout>
  );
}

export function AdminOutingSettingsPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <OutingSettingsClient />
    </AdminLayout>
  );
}

export function AdminCardOrderPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <CardOrderClient />
    </AdminLayout>
  );
}

export function AdminInfoSettingsPage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <InfoSettingsClient />
    </AdminLayout>
  );
}

export function AdminInsurancePage({ email, role }: AdminPageProps) {
  return (
    <AdminLayout email={email} role={role}>
      <InsuranceAdminClient />
    </AdminLayout>
  );
}
