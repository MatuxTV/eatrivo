import Link from "next/link";
import { defaultLocale } from "@/i18n/routing";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-3 text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href={`/${defaultLocale}`}
          className="inline-block rounded bg-primary px-6 py-2 font-medium text-primary-foreground"
        >
          Go to home
        </Link>
      </div>
    </main>
  );
}
