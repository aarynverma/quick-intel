// Decide whether a given URL is summarizable. Centralized so the worker
// and the popup (for pre-flight UX) can share the same rules.

const BLOCKED_SCHEMES = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'view-source:'];
const BLOCKED_HOSTS = ['chromewebstore.google.com', 'chrome.google.com'];

export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    if (BLOCKED_SCHEMES.includes(u.protocol)) return true;
    if (u.protocol === 'file:') return true;
    if (BLOCKED_HOSTS.includes(u.hostname)) return true;
    return false;
  } catch {
    return true;
  }
}
