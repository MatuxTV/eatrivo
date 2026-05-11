import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    membership?: "basic" | "premium" | "pro" | "trainer";
    role?: "user" | "admin";
    lastSeenWelcomeVersion?: string;
    locale?: string;
    hideInstallPrompt?: boolean;
    badges?: string[];
    isBetaTester?: boolean;
  }

  interface Session {
    user: {
      id: string;
      membership?: "basic" | "premium" | "pro" | "trainer";
      role?: "user" | "admin";
      lastSeenWelcomeVersion?: string;
      locale?: string;
      hideInstallPrompt?: boolean;
      badges?: string[];
      isBetaTester?: boolean;
    } & DefaultSession["user"];
  }
}
