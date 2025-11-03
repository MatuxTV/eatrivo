import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    membership?: "basic" | "premium" | "trainer";
    role: "admin";
    lastSeenWelcomeVersion?: string;
  }

  interface Session {
    user: {
      id: string;
      membership?: "basic" | "premium" | "trainer";
      lastSeenWelcomeVersion?: string;
    } & DefaultSession["user"];
  }
}