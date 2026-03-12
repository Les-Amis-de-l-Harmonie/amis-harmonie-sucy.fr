"use client";

interface ErrorFallbackProps {
  error?: Error;
  isDevelopment: boolean;
}

export function ErrorFallback({ error, isDevelopment }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-100 px-4 py-10 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200/80 bg-white/95 p-8 text-center shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <h1 className="font-[Clash Display,sans-serif] text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Une erreur est survenue
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Un problème inattendu est apparu. Vous pouvez recharger la page pour réessayer.
        </p>

        {isDevelopment && error ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error.message}
          </pre>
        ) : null}

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:ring-offset-gray-900"
        >
          Recharger la page
        </button>
      </div>
    </div>
  );
}
