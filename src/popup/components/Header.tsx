export default function Header() {
  return (
    <header className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M13 2 L5 14 L11 14 L10 22 L19 10 L13 10 L14 2 Z" />
        </svg>
      </div>
      <div className="flex-1">
        <h1 className="text-[15px] font-semibold leading-none text-slate-900">Quick Intel</h1>
        <p className="mt-0.5 text-[11px] text-slate-500">AI page summarizer</p>
      </div>
    </header>
  );
}
