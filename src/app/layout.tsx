import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#8B5CF6",
};

export const metadata: Metadata = {
  title: {
    template: "%s | Eatrivo",
    default: "Eatrivo - Váš osobný plánovač jedál"
  },
  description: "Eatrivo vám pomôže plánovať jedlá, generovať nákupné zoznamy a dosiahnuť vaše nutričné ciele pomocou AI odporúčaní. | Eatrivo helps you plan your meals.",
  keywords: ["plánovač jedál", "výživa", "diéta", "zdravé stravovanie", "nákupný zoznam", "AI jedálniček", "meal planner", "nutrition", "diet", "healthy eating", "shopping list"],
  authors: [{ name: "Eatrivo Team" }],
  creator: "Eatrivo",
  publisher: "Eatrivo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eatrivo",
  },
  openGraph: {
    type: "website",
    locale: "sk_SK",
    alternateLocale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://eatrivo.com",
    title: "Eatrivo - Váš osobný plánovač jedál",
    description: "Plánujte jedlá, generujte nákupné zoznamy a dosiahnite svoje ciele.",
    siteName: "Eatrivo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eatrivo - Váš osobný plánovač jedál",
    description: "Plánujte jedlá, generujte nákupné zoznamy a dosiahnite svoje ciele.",
    creator: "@eatrivo",
  },
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'sk': '/sk',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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