/**
 * Shown while a route segment is being prepared during navigation — the
 * gap between clicking a link and the destination page's own client
 * component mounting. Each page still manages its own data-loading state
 * separately; this only covers the route-transition itself.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Loading…
      </div>
    </div>
  );
}
