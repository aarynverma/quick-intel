export default function SummarySkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="shimmer h-4 w-14 rounded" />
        <div className="shimmer h-3 w-24 rounded" />
      </div>
      <div className="space-y-2 p-3">
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-5/6 rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
      </div>
      <div className="flex gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-2">
        <div className="shimmer h-7 flex-1 rounded-md" />
        <div className="shimmer h-7 flex-1 rounded-md" />
      </div>
    </div>
  );
}
