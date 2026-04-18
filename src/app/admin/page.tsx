import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/../auth";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

import AdminDashboard from "@/app/admin/components/AdminDashboard";
import { isLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Admin Dashboard - Eatrivo",
  description: "Admin panel for managing meal plans and users",
};

export default async function AdminPage() {
  const locale = await getLocale();
  const safeLocale = isLocale(locale) ? locale : "sk";

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${safeLocale}`);
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
  });

  if (!userProfile || userProfile.role !== "admin") {
    redirect(`/${safeLocale}/not-authorized`);
  }

  return <AdminDashboard />;
}