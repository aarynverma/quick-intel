// Dev-only logger. Silent in production builds.
// import.meta.env.DEV is statically replaced by Vite — the calls tree-shake out.

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[quick-intel]', ...args);
  },
  error: (...args: unknown[]) => {
    // Errors are always logged — they're actionable for users running dev builds
    // and useful in service worker inspectors for production debugging.
    console.error('[quick-intel]', ...args);
  },
};
