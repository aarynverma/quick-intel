import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const mq = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme: string): void {
  const dark = theme === 'dark' || (theme === 'system' && mq.matches);
  document.documentElement.classList.toggle('dark', dark);
}

async function bootstrap() {
  const result = await chrome.storage.local.get('settings');
  applyTheme(result.settings?.theme ?? 'system');

  // Re-apply when OS preference changes (only meaningful in system mode).
  mq.addEventListener('change', async () => {
    const r = await chrome.storage.local.get('settings');
    applyTheme(r.settings?.theme ?? 'system');
  });

  // Re-apply immediately when settings are saved (theme change takes effect without popup reopen).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      applyTheme(changes.settings.newValue?.theme ?? 'system');
    }
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
