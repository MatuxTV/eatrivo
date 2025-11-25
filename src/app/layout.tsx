import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Analytics } from "@vercel/analytics/next";
import FeedbackButton from "@/components/FeedbackButton";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${quicksand.variable} antialiased`}
      >
        <Providers>
          {children}
          <FeedbackButton />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}