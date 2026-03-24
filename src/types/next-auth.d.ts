import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    membership?: "basic" | "premium" | "trainer";
    role?: "user" | "coach" | "admin";
    lastSeenWelcomeVersion?: string;
    locale?: string;
    hideInstallPrompt?: boolean;
    badges?: string[];
    isBetaTester?: boolean;
  }

  interface Session {
    user: {
      id: string;
      membership?: "basic" | "premium" | "trainer";
      role?: "user" | "coach" | "admin";
      lastSeenWelcomeVersion?: string;
      locale?: string;
      hideInstallPrompt?: boolean;
      badges?: string[];
      isBetaTester?: boolean;
    } & DefaultSession["user"];
  }
}
