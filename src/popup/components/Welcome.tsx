interface Props {
  onGetStarted: () => void;
}

export default function Welcome({ onGetStarted }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-purple-50 p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Welcome to Quick Intel 👋</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          Summarize any article in seconds. You'll need your own API key — it's free to sign up
          and typically costs <strong>~$0.001 per summary</strong> (less than a penny).
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Get a key (takes 2 minutes):</p>

        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 transition hover:border-emerald-300 hover:shadow-sm dark:border-emerald-800 dark:bg-emerald-950 dark:hover:border-emerald-700"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Google Gemini</span>
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                Free tier
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">gemini-2.0-flash — free &amp; fast · 15 req/min · no credit card</div>
          </div>
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Get key →</span>
        </a>

        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
        >
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">OpenAI</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">gpt-4o-mini — fast &amp; cheap</div>
          </div>
          <span className="text-xs font-medium text-brand-600">Get key →</span>
        </a>

        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
        >
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Anthropic</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Claude Haiku — high quality</div>
          </div>
          <span className="text-xs font-medium text-brand-600">Get key →</span>
        </a>
      </div>

      <button
        onClick={onGetStarted}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
      >
        I have a key — let's go
      </button>

      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
        Your key stays on this device. It's never sent to us.
      </p>
    </div>
  );
}
