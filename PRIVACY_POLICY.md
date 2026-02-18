# Toolboard Privacy Policy

_Effective date: February 18, 2026 (Toolboard V3.0.0)_

Toolboard is a Chrome extension focused on local-first processing. Most tool operations run inside your browser and do not send page content to our servers.

## What Toolboard Stores

### Stored in `chrome.storage.local`
- Language, theme, onboarding completion status.
- Tool usage/favorites and most UI preferences.
- Sticky notes, highlights, bookmarks, reading mode settings, copy history, and tool-specific histories.
- AI provider settings, AI model/language preferences, and encrypted AI API keys.

### Stored in `chrome.storage.sync`
- Hidden tools list (so your hidden-tool setup can follow your signed-in Chrome profile).

## What Is Not Collected
- No analytics, ad tracking, or telemetry.
- No sale of user data.
- No central server-side profile for your browsing behavior.

## Network Requests and Third Parties
Toolboard may call external services only when required by a feature you use:

- AI tools: requests are sent to the AI provider you configured (for example Gemini, OpenAI, Anthropic, Groq, OpenRouter, and other supported providers, including custom endpoints).
- Currency conversion: `api.frankfurter.app` and fallback `open.er-api.com`.
- ZPL preview/label rendering: `api.labelary.com`.

If you do not use those features, those requests are not made.

## Permissions Summary
Toolboard requests these Chrome permissions:

- `activeTab`, `scripting`: run tools on the active page when you activate a tool.
- `storage`: save settings and tool data locally.
- `tabs`: tab metadata and tab-level workflows.
- `downloads`: save exported/captured files.
- `clipboardRead`, `clipboardWrite`: copy/paste and copy-history workflows.
- `tabCapture`: recording workflows (Video Recorder).
- Host permissions for: currency APIs and Labelary API.

## AI Key Handling
- API keys are stored locally and encrypted before storage.
- Keys are used only to call your selected provider.
- You can remove keys at any time from AI settings.

## Data Retention and Control
You control retention through the extension UI and Chrome settings:
- Clear individual tool data in related tool screens.
- Remove API keys in AI settings.
- Clear all extension data from Chrome extension/site data controls.
- Uninstalling Toolboard removes extension-managed local data.

## Support Link
Toolboard includes optional support links to: <https://buymeacoffee.com/ademisler>

## Policy Updates
This policy can be updated as Toolboard evolves. The effective date/version above reflects the latest revision.

## Contact
For privacy questions: <https://ademisler.com/en>
