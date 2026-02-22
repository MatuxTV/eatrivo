import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./src/index";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  userProfiles,
  userInfoTable,
  badges as badgesTable,
} from "./src/db/schema";
import { eq } from "drizzle-orm";
import { Analytics } from "@/lib/analytics";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID!,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.membership = user.membership;
        session.user.lastSeenWelcomeVersion = user.lastSeenWelcomeVersion;
        session.user.hideInstallPrompt = (
          user as { hideInstallPrompt?: boolean }
        ).hideInstallPrompt;

        // Fetch user's language preference from user_info table
        try {
          const userProfile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, user.id),
          });

          if (userProfile) {
            const userInfo = await db.query.userInfoTable.findFirst({
              where: eq(userInfoTable.userProfileId, userProfile.id),
              columns: {
                language: true,
              },
            });

            if (userInfo?.language) {
              session.user.locale = userInfo.language;
            }

            // Fetch user badges
            const userBadges = await db.query.badges.findMany({
              where: eq(badgesTable.userProfileId, userProfile.id),
              columns: { type: true },
            });
            session.user.badges = userBadges.map((b) => b.type);
          }
        } catch (error) {
          console.error("Error fetching user language preference:", error);
          // Locale will remain undefined and middleware will use fallback logic
        }
      }
      return session;
    },
  },
  events: {
    async signIn(message) {
      if (message.user?.id) {
        await Analytics.login(message.user.id, {
          provider: message.account?.provider,
        });
      }
    },
    async createUser(message) {
      if (message.user?.id) {
        await Analytics.signup(message.user.id, {
          provider: "oauth",
        });
      }
    },
    async signOut(message) {
      if ("token" in message && message.token?.sub) {
        await Analytics.logout(message.token.sub);
      } else if ("session" in message && message.session?.userId) {
        await Analytics.logout(message.session.userId);
      }
    },
  },
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
});
