import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    membership?: "basic" | "premium" | "trainer";
  }

  interface Session {
    user: {
      id: string;
      membership?: "basic" | "premium" | "trainer";
    } & DefaultSession["user"];
  }
}