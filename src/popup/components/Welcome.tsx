interface Props {
  onGetStarted: () => void;
}

export default function Welcome({ onGetStarted }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-purple-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Welcome to Quick Intel 👋</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">
          Summarize any article in seconds. You'll need your own API key — it's free to sign up
          and typically costs <strong>~$0.001 per summary</strong> (less than a penny).
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">Get a key (takes 2 minutes):</p>

        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">OpenAI</div>
            <div className="text-[11px] text-slate-500">gpt-4o-mini — fast & cheap</div>
          </div>
          <span className="text-xs font-medium text-brand-600">Get key →</span>
        </a>

        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">Anthropic</div>
            <div className="text-[11px] text-slate-500">Claude Haiku — high quality</div>
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

      <p className="text-center text-[11px] text-slate-500">
        Your key stays on this device. It's never sent to us.
      </p>
    </div>
  );
}
