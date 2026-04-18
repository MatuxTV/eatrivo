import { redirect } from "next/navigation";

interface BillingBridgeProps {
  searchParams?: Promise<{
    canceled?: string;
    success?: string;
  }>;
}

export default async function BillingBridge({ searchParams }: BillingBridgeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParams = new URLSearchParams({
    section: "profile",
    profileView: "billing",
  });

  if (resolvedSearchParams?.canceled === "true") {
    nextParams.set("canceled", "true");
  }

  if (resolvedSearchParams?.success === "true") {
    nextParams.set("success", "true");
  }

  redirect(`/home?${nextParams.toString()}`);
}
