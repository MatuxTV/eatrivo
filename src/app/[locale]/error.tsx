"use client";

import Link from "next/link";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-5xl">😔</div>
        <h2 className="text-xl font-semibold text-gray-800">
          Ups, niečo sa pokazilo
        </h2>
        <p className="text-gray-500 text-sm">
          {error.digest ? `Kód chyby: ${error.digest}` : "Skús to prosím znova."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-violet-600 px-6 py-2 text-white hover:bg-violet-700 transition-colors"
          >
            Skúsiť znova
          </button>
          <Link
            href="/home"
            className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Domov
          </Link>
        </div>
      </div>
    </div>
  );
}
