interface Props {
  error: { code: string; message: string };
  onDismiss: () => void;
}

const FRIENDLY: Record<string, { title: string; hint?: string }> = {
  NO_API_KEY: { title: 'API key needed', hint: 'Open Settings to add your key.' },
  RESTRICTED_PAGE: { title: "Can't summarize this page", hint: 'Browser pages and the Web Store are blocked.' },
  EMPTY_CONTENT: { title: 'Not enough content', hint: 'The page may still be loading — try again.' },
  API_ERROR: { title: 'Provider error' },
  INVALID_RESPONSE: { title: 'Unexpected response', hint: 'The model returned something malformed.' },
  NO_ACTIVE_TAB: { title: 'No active tab' },
  INJECTION_FAILED: { title: 'Could not read page' },
  UNKNOWN: { title: 'Something went wrong' },
};

export default function ErrorBanner({ error, onDismiss }: Props) {
  const f = FRIENDLY[error.code] ?? FRIENDLY.UNKNOWN;
  return (
    <div className="relative rounded-lg border border-rose-200 bg-rose-50 p-3 pr-8 text-sm">
      <div className="font-semibold text-rose-900">{f.title}</div>
      <div className="mt-0.5 text-xs text-rose-700">{error.message}</div>
      {f.hint && <div className="mt-1 text-[11px] text-rose-600">{f.hint}</div>}
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded p-1 text-rose-500 hover:bg-rose-100"
        aria-label="Dismiss"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}
