/** Root 404 (invalid locale / unmatched URL) — no [locale] intl tree here. */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-center text-zinc-900">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
          <p className="mt-2 text-sm text-zinc-500">It may have been removed or you may not have access.</p>
        </div>
      </body>
    </html>
  );
}
