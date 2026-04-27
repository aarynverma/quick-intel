# Quick Intel Privacy Policy

Last updated: [28 Apr 2026]

Quick Intel is a Chrome extension that summarizes web pages using AI. We collect nothing.

## What stays on your device
- Your API key(s) — stored via chrome.storage.local
- Your summary history — stored via chrome.storage.local
- Your settings (theme, default provider) — stored via chrome.storage.local

We have no servers. We never see any of this.

## What gets sent externally
When you click "Summarize," the current page's text is sent to the LLM provider you selected (OpenAI, Anthropic, or Google Gemini), authenticated with YOUR API key. The summary comes back to your browser.

## Third-party policies
- OpenAI: https://openai.com/policies/privacy-policy
- Anthropic: https://www.anthropic.com/legal/privacy
- Google: https://policies.google.com/privacy

## Permissions explained
- storage: Save your API keys and history locally
- activeTab: Read the current page when you click summarize
- scripting: Inject the content extractor on demand
- host_permissions for api.openai.com / api.anthropic.com / generativelanguage.googleapis.com: Send page text to your chosen LLM

## Contact
[dev@aryanverma.co]