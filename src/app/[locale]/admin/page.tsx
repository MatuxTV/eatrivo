import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

import AdminDashboard from "@/app/admin/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard - Eatrivo",
  description: "Admin panel for managing meal plans and users",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
  });

  if (!userProfile || !["admin", "coach"].includes(userProfile.role ?? "")) {
    redirect("/not-authorized");
  }

  return <AdminDashboard />;
}
