"use client";

import { useRouter } from "next/navigation";
import KitchenCounterPage from "@/app/kitchen-counter/KitchenCounterPage";

export default function KitchenCounterCanonicalPage() {
  const router = useRouter();
  return <KitchenCounterPage onBack={() => router.push("/home")} />;
}
