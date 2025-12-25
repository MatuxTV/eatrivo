import Link from "next/link";

import { isLocale, type Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NotAuthorized({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Access Denied</h1>
        <p className="mb-6 text-muted-foreground">
          You do not have permission to view this page.
          <br />
          If you believe this is a mistake, please contact support.
        </p>
        <Link
          href={`/${locale}/dashboard`}
          className="inline-block px-6 py-2 rounded bg-primary text-primary-foreground font-medium shadow hover:bg-primary/90 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
