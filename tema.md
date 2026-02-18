# Toolboard Site Notes

This document describes the current GitHub Pages setup for the Toolboard marketing site.

## Purpose
- Keep the public website aligned with the extension source of truth.
- Avoid stale hardcoded tool lists.
- Generate SEO-friendly tool pages automatically.

## Source of truth
- Extension manifest: `../extension/config/tools-manifest.json`
- English message fallback: `../extension/_locales/en/messages.json`

## Generated artifacts
Run:

```bash
node scripts/sync-site-data.cjs
```

Generated files:
- `assets/data/tools.json`
- `tools/*.html`
- `sitemap.xml`
- `robots.txt`

## Frontend behavior
- Homepage renders cards from `assets/data/tools.json`.
- Search matches name, description, category, tags, and keywords.
- Category filter is built dynamically from manifest categories.
- Tool modal displays metadata and links to tool detail pages.

## Single-language policy
- Site language is English only (`lang: en`).
- All user-facing website content should remain in English.
- No language switcher is provided.

## Deployment
1. Update extension manifest/tool metadata.
2. Run sync script.
3. Commit generated files.
4. Deploy on GitHub Pages.
