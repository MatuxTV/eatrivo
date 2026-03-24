"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sk">
      <body className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Niečo sa pokazilo
          </h2>
          <p className="text-gray-500 text-sm">
            {error.digest ? `Kód: ${error.digest}` : "Neočakávaná chyba"}
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-violet-600 px-6 py-2 text-white hover:bg-violet-700 transition-colors"
          >
            Skúsiť znova
          </button>
        </div>
      </body>
    </html>
  );
}
