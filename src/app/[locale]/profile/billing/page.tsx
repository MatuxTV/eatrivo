import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import BillingPageClient from "./BillingPageClient";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  return <BillingPageClient />;
}
