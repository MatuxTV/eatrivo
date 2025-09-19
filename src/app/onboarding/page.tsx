import { auth } from "../../../auth"
import { checkUserProfileExists } from "../../lib/user-utils"
import { redirect } from "next/navigation"
import OnboardingClient from "./components/OnBoardingPage";

export const metadata = {
  title: "Nastavenie profilu"
};

export default async function OnboardingPage() {
  // Check if user is authenticated
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/signin")
  }

  // Check if user already has a profile
  const existingProfile = await checkUserProfileExists(session.user.id)
  if (existingProfile) {
    // User already has a profile, redirect to dashboard
    redirect("/dashboard")
  }

  return <OnboardingClient />;
}