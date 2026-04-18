import { redirect } from "next/navigation";

import ProfileBillingSection from "@/app/home/components/profile/ProfileBillingSection";

interface PricingPageProps {
  searchParams?: Promise<{
    canceled?: string;
    success?: string;
  }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const canceled = resolvedSearchParams?.canceled;
  const success = resolvedSearchParams?.success;

  if (canceled === "true" || success === "true") {
    const nextParams = new URLSearchParams({
      section: "profile",
      profileView: "billing",
    });

    if (canceled === "true") {
      nextParams.set("canceled", "true");
    }

    if (success === "true") {
      nextParams.set("success", "true");
    }

    redirect(`/home?${nextParams.toString()}`);
  }

  return <ProfileBillingSection embedded={false} />;
}
