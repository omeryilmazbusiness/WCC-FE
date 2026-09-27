export default function ShellLoading() {
  return (
    <div className="animate-pulse space-y-6 px-5 py-8 sm:px-8 lg:px-10" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-xl bg-zinc-200/70" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-zinc-200/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-3xl bg-white shadow-[0_0_0_1px_rgba(228,228,231,0.7)]" />
        ))}
      </div>
      <div className="h-80 rounded-3xl bg-white shadow-[0_0_0_1px_rgba(228,228,231,0.7)]" />
    </div>
  );
}
