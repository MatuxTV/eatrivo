import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    membership?: "basic" | "premium" | "trainer";
    lastSeenWelcomeVersion?: string;
    locale?: string;
  }

  interface Session {
    user: {
      id: string;
      membership?: "basic" | "premium" | "trainer";
      lastSeenWelcomeVersion?: string;
      locale?: string;
    } & DefaultSession["user"];
  }
}