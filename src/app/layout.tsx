import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Analytics } from "@vercel/analytics/next";
import FeedbackButton from "@/components/FeedbackButton";
import { defaultLocale } from "@/i18n/routing";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Eatrivo",
    default: "Eatrivo"
  },
  description: "Your food delivery app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Root layout doesn't have access to route params; locale is derived via middleware.
  // If middleware is skipped (e.g., misconfigured matcher), fall back to default locale.
  const locale = await getLocale().catch(() => defaultLocale);
  const messages = await getMessages().catch(() => ({}));

  return (
    <html lang={locale}>
      <body className={`${quicksand.variable} antialiased`}>
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <FeedbackButton />
            <Analytics />
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}