import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import ProfilePageClient from "./components/ProfilePageClient";

export const metadata = {
  title: "Profil - EatRivo",
  description: "Spravujte svoj profil a nutričné preferencie",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return <ProfilePageClient />;
}
