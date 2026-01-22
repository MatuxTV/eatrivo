import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    membership?: "basic" | "premium" | "trainer";
    lastSeenWelcomeVersion?: string;
    locale?: string;
    hideInstallPrompt?: boolean;
  }

  interface Session {
    user: {
      id: string;
      membership?: "basic" | "premium" | "trainer";
      lastSeenWelcomeVersion?: string;
      locale?: string;
      hideInstallPrompt?: boolean;
    } & DefaultSession["user"];
  }
}