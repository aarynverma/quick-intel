interface Props {
  error: { code: string; message: string };
  onDismiss: () => void;
}

const PROVIDER_LABELS: Record<string, string> = { openai: 'GPT-4o (OpenAI)', anthropic: 'Claude (Anthropic)', gemini: 'Gemini' };
function providerLabel(raw: string): string {
  const m = raw.match(/configured for (\w+)/i);
  return m ? (PROVIDER_LABELS[m[1].toLowerCase()] ?? m[1]) : 'the selected provider';
}

function toFriendly(code: string, raw: string): { title: string; body: string } {
  if (code === 'NO_API_KEY') {
    const label = providerLabel(raw);
    return {
      title: `No API key for ${label}`,
      body: `Add a ${label} API key in Settings, or switch to a provider you've already configured.`,
    };
  }

  // Fully mapped codes . never show raw message
  const known: Record<string, { title: string; body: string }> = {
    RESTRICTED_PAGE:  { title: "Can't read this page",      body: 'Browser-internal pages and extensions cannot be summarized.' },
    EMPTY_CONTENT:    { title: 'Not enough content',        body: 'The page may still be loading. Try again in a moment.' },
    NO_ACTIVE_TAB:    { title: 'No active tab',             body: 'Click on a browser tab first, then summarize.' },
    INJECTION_FAILED: { title: 'Could not read page',       body: 'The page may be blocking scripts. Try refreshing.' },
    INVALID_RESPONSE: { title: 'Unexpected response',       body: 'The model returned something unexpected. Please try again.' },
  };
  if (code in known) return known[code];

  // API_ERROR / UNKNOWN . detect pattern without exposing raw JSON
  const s = raw.toLowerCase();
  if (raw.includes('429') || s.includes('quota') || s.includes('rate limit') || s.includes('resource_exhausted') || s.includes('rate_limit')) {
    return { title: 'Rate limit reached', body: "You've hit your API quota. Check your plan's limits and billing, then try again." };
  }
  if (raw.includes('401') || s.includes('invalid api key') || s.includes('invalid_api_key') || s.includes('unauthorized')) {
    return { title: 'Invalid API key', body: 'Your API key was rejected. Verify it in Settings.' };
  }
  if (raw.includes('403')) {
    return { title: 'Access denied', body: "Your API key doesn't have permission for this operation." };
  }
  if (raw.includes('500') || raw.includes('502') || raw.includes('503') || s.includes('internal server')) {
    return { title: 'Provider unavailable', body: 'The AI provider is experiencing issues. Try again in a moment.' };
  }
  if (s.includes('network') || s.includes('failed to fetch')) {
    return { title: 'Network error', body: 'Check your internet connection and try again.' };
  }
  return { title: 'Something went wrong', body: 'An unexpected error occurred. Try again or switch providers in Settings.' };
}

export default function ErrorBanner({ error, onDismiss }: Props) {
  const { title, body } = toFriendly(error.code, error.message);

  return (
    <div style={{
      position: 'relative',
      marginTop: 12,
      borderRadius: 10,
      border: '1px solid rgba(239,68,68,.35)',
      background: 'linear-gradient(180deg, rgba(127,29,29,.22), rgba(69,10,10,.22))',
      padding: '10px 36px 10px 12px',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fca5a5' }}>{title}</div>
      <div style={{ marginTop: 3, fontSize: 11.5, color: '#fda4a4', lineHeight: 1.45 }}>{body}</div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 22, height: 22, borderRadius: 6,
          background: 'transparent', border: '1px solid transparent',
          color: '#f87171', display: 'grid', placeItems: 'center',
          cursor: 'pointer', fontSize: 15, lineHeight: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
      >×</button>
    </div>
  );
}
