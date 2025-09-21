import { auth } from "../../../auth"
import { redirect } from "next/navigation"
import DashboardPage from "./components/DashboardPage";

export const metadata = {
  title: "Dashboard - EatRivo"
}

export default async function DashboardPageWrapper() {
  // Server-side authentication check
  const session = await auth()
  
  if (!session?.user) {
    redirect("/signin")
  }

  return (  
    <DashboardPage />
  )
}