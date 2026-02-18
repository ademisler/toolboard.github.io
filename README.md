# Toolboard Website

Marketing/docs site for the **Toolboard** Chrome extension.

## Current scope
- Reflects the live extension catalog from `../extension/config/tools-manifest.json`
- Shows all current categories and tools (82 tools)
- Generates one SEO page per tool under `/tools/<tool-id>/`
- Provides searchable/filterable homepage grid

## Data sync workflow
Run this whenever tools are added/removed/renamed in the extension:

```bash
node scripts/sync-site-data.cjs
```

This command updates:
- `assets/data/tools.json`
- `tools/*.html`
- `sitemap.xml`
- `robots.txt`

## Local preview (Jekyll)
```bash
bundle exec jekyll serve
```

Then open `http://localhost:4000`.
