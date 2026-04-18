"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TutorialProvider>
        {children}
        <Toaster position="top-center" richColors />
      </TutorialProvider>
    </SessionProvider>
  );
}