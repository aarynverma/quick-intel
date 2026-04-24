// Self-contained function injected via chrome.scripting.executeScript.
// MUST NOT import anything — it's serialized across the isolation boundary.

export function extractPageContent(): { url: string; title: string; text: string } {
  const EXCLUDE = [
    'script', 'style', 'noscript', 'iframe',
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.advertisement', '.ad', '.cookie-banner', '.newsletter-signup',
  ];

  const ARTICLE_SELECTORS = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
  ];

  const docClone = document.cloneNode(true) as Document;
  EXCLUDE.forEach((sel) => docClone.querySelectorAll(sel).forEach((el) => el.remove()));

  let container: Element | null = null;
  for (const sel of ARTICLE_SELECTORS) {
    const el = docClone.querySelector(sel);
    if (el && (el.textContent?.length ?? 0) > 200) {
      container = el;
      break;
    }
  }
  if (!container) container = docClone.body;

  const rawText = container?.textContent ?? '';
  const cleaned = rawText
    .replace(/[\t ]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

  return {
    url: window.location.href,
    title: document.title,
    text: cleaned,
  };
}
