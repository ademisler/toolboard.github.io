#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.resolve(__dirname, '..');
const extManifestPath = path.join(repoRoot, 'extension', 'config', 'tools-manifest.json');
const localeEnPath = path.join(repoRoot, 'extension', '_locales', 'en', 'messages.json');
const siteToolsPath = path.join(siteRoot, 'assets', 'data', 'tools.json');
const toolsDir = path.join(siteRoot, 'tools');
const categoriesDir = path.join(siteRoot, 'categories');
const includesDir = path.join(siteRoot, '_includes');
const toolLinksIncludePath = path.join(includesDir, 'tool-links.html');
const categoryLinksIncludePath = path.join(includesDir, 'category-links.html');
const homeJsonLdIncludePath = path.join(includesDir, 'home-jsonld.html');
const sitemapPath = path.join(siteRoot, 'sitemap.xml');
const robotsPath = path.join(siteRoot, 'robots.txt');

const SITE_URL = 'https://toolboard.ademisler.com';
const CWS_URL = 'https://chromewebstore.google.com/detail/efecahgaobadfmaecclkfnfdfmincbmm';
const CATEGORY_PLAYBOOK = {
  inspect: {
    objective: 'audit and verify on-page implementation details',
    input: 'live page elements, markup, and style signals',
    output: 'diagnostic values you can reuse during QA or development',
    action: 'inspect target elements or metadata'
  },
  capture: {
    objective: 'collect assets and page content quickly',
    input: 'visible content or document sections from the active tab',
    output: 'captured media, files, or reusable extracts',
    action: 'capture content from the current page'
  },
  enhance: {
    objective: 'improve readability and workflow speed',
    input: 'the active page context and your interaction preferences',
    output: 'a cleaner, faster browsing experience',
    action: 'enhance readability or interaction behavior'
  },
  utilities: {
    objective: 'run practical web productivity tasks',
    input: 'mixed text, links, and page-level values',
    output: 'validated results for daily browser operations',
    action: 'run utility actions for diagnostics or productivity'
  },
  converters: {
    objective: 'transform source data into target formats accurately',
    input: 'structured or unstructured source strings and files',
    output: 'clean converted output ready for integration',
    action: 'convert source data into the target format'
  },
  previewers: {
    objective: 'preview structured content safely before delivery',
    input: 'raw payloads, configs, or formatted datasets',
    output: 'human-readable previews that reduce review mistakes',
    action: 'preview structured content safely and clearly'
  },
  ai: {
    objective: 'analyze and generate content with AI support',
    input: 'current page context plus your prompt intent',
    output: 'actionable summaries, drafts, or analytical guidance',
    action: 'analyze or generate output with your AI configuration'
  }
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function toTitle(input) {
  return String(input || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function uniqueList(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const raw = String(item || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeYaml(value) {
  return String(value || '').replace(/"/g, '\\"');
}

function resolveDescription(tool, localeEn) {
  const i18nKey = tool?.i18n?.description;
  const fromLocale = i18nKey && localeEn?.[i18nKey]?.message
    ? String(localeEn[i18nKey].message).trim()
    : '';

  if (fromLocale) return fromLocale;
  if (tool?.description && String(tool.description).trim()) return String(tool.description).trim();
  return `${tool.name} for ${toTitle(tool.category)} workflows.`;
}

function resolveLocalized(localeEn, key) {
  if (!key) return '';
  return localeEn?.[key]?.message ? String(localeEn[key].message).trim() : '';
}

function resolveToolName(tool, localeEn) {
  const candidates = [
    tool?.i18n?.name
  ];
  for (const key of candidates) {
    const localized = resolveLocalized(localeEn, key);
    if (localized) return localized;
  }
  const manifestName = String(tool?.name || '').trim();
  if (manifestName) return manifestName;

  const fallbackCandidates = [tool?.i18n?.title, tool?.i18n?.label];
  for (const key of fallbackCandidates) {
    const localized = resolveLocalized(localeEn, key);
    if (localized) return localized;
  }

  return '';
}

function mapTools(raw, localeEn) {
  const categories = raw.categories || {};
  const mapped = (raw.tools || []).map((t) => ({
    id: t.id,
    name: resolveToolName(t, localeEn) || t.name,
    category: t.category,
    categoryLabel: categories[t.category]?.name || toTitle(t.category),
    icon: t.icon || 'tool',
    description: resolveDescription(t, localeEn),
    tags: Array.isArray(t.tags) ? t.tags : [],
    keywords: Array.isArray(t.keywords) ? t.keywords : [],
    permissions: Array.isArray(t.permissions) ? t.permissions : [],
    order: typeof t.order === 'number' ? t.order : Number.MAX_SAFE_INTEGER,
    module: t.module || ''
  }));

  mapped.sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));

  return {
    generatedAt: new Date().toISOString(),
    source: 'extension/config/tools-manifest.json',
    toolCount: mapped.length,
    categories: Object.entries(categories).map(([id, c]) => ({
      id,
      name: c.name || toTitle(id),
      description: resolveLocalized(localeEn, c.description) || c.description || '',
      order: typeof c.order === 'number' ? c.order : 99,
      count: mapped.filter((t) => t.category === id).length
    })).sort((a, b) => a.order - b.order),
    tools: mapped
  };
}

function stableIndex(seed, mod) {
  const text = String(seed || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % mod;
}

function pickBySeed(list, seed, offset = 0) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[(stableIndex(seed, list.length) + offset) % list.length];
}

function niceList(items) {
  const clean = uniqueList(items);
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
}

function primaryTopics(tool) {
  const merged = uniqueList([...(tool.keywords || []), ...(tool.tags || [])]);
  return merged.slice(0, 3);
}

function buildLead(tool) {
  const playbook = CATEGORY_PLAYBOOK[tool.category] || CATEGORY_PLAYBOOK.utilities;
  const topics = primaryTopics(tool);
  const topicText = niceList(topics) || tool.categoryLabel.toLowerCase();
  const leadVariants = [
    `${tool.name} is built to ${playbook.objective} directly inside Chrome.`,
    `Use ${tool.name} when your workflow depends on ${topicText} and fast browser execution.`,
    `${tool.name} brings ${tool.categoryLabel.toLowerCase()} capability into a single focused action flow.`
  ];

  return {
    intro: pickBySeed(leadVariants, `${tool.id}-lead-1`),
    detail: `${tool.description.endsWith('.') ? tool.description : `${tool.description}.`} It works best when you want ${playbook.output}.`,
    context: `Typical input includes ${playbook.input}, while the output is optimized for teams handling ${topicText}.`
  };
}

function makeUseCases(tool) {
  const playbook = CATEGORY_PLAYBOOK[tool.category] || CATEGORY_PLAYBOOK.utilities;
  const topics = primaryTopics(tool);
  const [a = tool.categoryLabel.toLowerCase(), b = 'browser tasks', c = tool.name] = topics;
  return [
    `Use ${tool.name} to speed up ${a} checks without switching tabs or external apps.`,
    `Apply ${tool.name} in QA and support workflows when consistent ${b} output is required.`,
    `Choose ${tool.name} for repeatable operations where ${c} accuracy matters before handoff.`,
    `${tool.name} is a strong fit when your team needs to ${playbook.objective}.`
  ];
}

function makeHowTo(tool) {
  const playbook = CATEGORY_PLAYBOOK[tool.category] || CATEGORY_PLAYBOOK.utilities;
  return [
    `Open Toolboard from your Chrome toolbar and choose ${tool.name}.`,
    `Prepare your source input and use ${tool.name} to ${playbook.action}.`,
    `Validate the result, then continue with related Toolboard tools if your workflow needs additional steps.`
  ];
}

function permissionSummary(tool) {
  if (!tool.permissions.length) {
    return 'This tool uses the standard Toolboard runtime context and processes data locally in your browser session.';
  }

  return `Permissions used by ${tool.name}: ${tool.permissions.join(', ')}. These permissions are scoped to tool execution and follow Toolboard's privacy-first model.`;
}

function overlapScore(a, b) {
  const setA = new Set([...(a.tags || []), ...(a.keywords || [])].map((x) => String(x).toLowerCase()));
  const setB = new Set([...(b.tags || []), ...(b.keywords || [])].map((x) => String(x).toLowerCase()));
  let score = 0;
  for (const k of setA) if (setB.has(k)) score += 1;
  return score;
}

function relatedTools(tool, allTools) {
  const sameCategory = allTools.filter((candidate) => candidate.id !== tool.id && candidate.category === tool.category);
  return sameCategory
    .map((candidate) => ({ candidate, score: overlapScore(tool, candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, 4)
    .map((item) => item.candidate);
}

function faqForTool(tool) {
  const keyword = tool.keywords[0] || tool.tags[0] || tool.categoryLabel.toLowerCase();
  const playbook = CATEGORY_PLAYBOOK[tool.category] || CATEGORY_PLAYBOOK.utilities;
  const description = tool.description.endsWith('.') ? tool.description : `${tool.description}.`;
  return [
    {
      q: `What does ${tool.name} do in Toolboard?`,
      a: `${tool.name} is designed to ${playbook.objective}. ${description} It belongs to the ${tool.categoryLabel} category in Toolboard.`
    },
    {
      q: `When should I use ${tool.name} instead of another tool?`,
      a: `Use ${tool.name} when your primary task is ${keyword}. For broader workflows, combine it with related Toolboard tools listed on this page.`
    },
    {
      q: `Does ${tool.name} store my data?`,
      a: `${tool.name} follows Toolboard's local-first behavior. ${permissionSummary(tool)}`
    }
  ];
}

function jsonLdForTool(tool, faqItems) {
  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${tool.name} - Toolboard`,
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome',
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.id}/`,
    softwareVersion: '2.x',
    applicationSubCategory: tool.categoryLabel,
    downloadUrl: CWS_URL,
    isAccessibleForFree: true,
    inLanguage: 'en-US',
    publisher: {
      '@type': 'Organization',
      name: 'Toolboard',
      url: SITE_URL
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    featureList: [...tool.tags, ...tool.keywords].slice(0, 8)
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tools',
        item: `${SITE_URL}/#tools`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tool.categoryLabel,
        item: `${SITE_URL}/categories/${tool.category}/`
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: tool.name,
        item: `${SITE_URL}/tools/${tool.id}/`
      }
    ]
  };

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${tool.name} | Toolboard`,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.id}/`,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Toolboard',
      url: SITE_URL
    },
    primaryImageOfPage: `${SITE_URL}/assets/images/favicon-512x512.png`
  };

  return {
    software: JSON.stringify(software),
    faq: JSON.stringify(faq),
    breadcrumb: JSON.stringify(breadcrumb),
    webPage: JSON.stringify(webPage)
  };
}

function listItems(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function toolLinks(links) {
  if (!links.length) return '<li>No close matches in this category yet.</li>';
  return links.map((tool) => `<li><a href="/tools/${tool.id}/">${escapeHtml(tool.name)}</a> - ${escapeHtml(tool.description)}</li>`).join('');
}

function buildToolLinksInclude(data) {
  const byCategory = new Map();
  data.categories.forEach((category) => byCategory.set(category.id, []));
  data.tools.forEach((tool) => {
    if (!byCategory.has(tool.category)) byCategory.set(tool.category, []);
    byCategory.get(tool.category).push(tool);
  });

  const groups = data.categories.map((category) => {
    const tools = byCategory.get(category.id) || [];
    const links = tools
      .map((tool) => `<li><a href=\"/tools/${tool.id}/\">${escapeHtml(tool.name)}</a></li>`)
      .join('');
    return `<article class=\"crawl-links__group\"><h3>${escapeHtml(category.name)} (${tools.length})</h3><ul>${links}</ul></article>`;
  }).join('');

  return `<section class=\"crawl-links\" aria-label=\"Tool links for indexing\">
  <h2>All Tool Pages</h2>
  <p>Direct links to every Toolboard tool page for discovery and indexing.</p>
  <div class=\"crawl-links__grid\">
    ${groups}
  </div>
</section>
`;
}

function buildCategoryLinksInclude(data) {
  const links = data.categories.map((category) => (
    `<a class="quick-category" href="/categories/${category.id}/"><span>${escapeHtml(category.name)}</span><strong>${category.count || 0}</strong></a>`
  )).join('');

  return `<section class="crawl-links" aria-label="Category links for indexing">
  <h2>Browse by Category</h2>
  <p>Category landing pages with focused tool collections and guides.</p>
  <div class="quick-categories">
    ${links}
  </div>
</section>
`;
}

function faqForCategory(category, tools) {
  const topTools = tools.slice(0, 3).map((t) => t.name).join(', ');
  return [
    {
      q: `What is included in the ${category.name} category?`,
      a: `${category.name} includes ${tools.length} tools in Toolboard. Popular entries include ${topTools || 'core tools for this category'}.`
    },
    {
      q: `Who should use ${category.name} tools?`,
      a: `${category.name} tools are designed for users who need reliable browser-native workflows with fast iteration and low setup overhead.`
    },
    {
      q: `How do I start with ${category.name}?`,
      a: `Start with one focused tool from this page, validate its output, and chain related tools for larger workflows.`
    }
  ];
}

function categoryJsonLd(category, tools, faqItems) {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} Tools - Toolboard`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: tools.length,
    itemListElement: tools.map((tool, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: tool.name,
      url: `${SITE_URL}/tools/${tool.id}/`
    }))
  };

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Tools`,
    description: category.description || `${category.name} tools in Toolboard.`,
    url: `${SITE_URL}/categories/${category.id}/`
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tools',
        item: `${SITE_URL}/#tools`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.name,
        item: `${SITE_URL}/categories/${category.id}/`
      }
    ]
  };

  return {
    itemList: JSON.stringify(itemList),
    collection: JSON.stringify(collection),
    faq: JSON.stringify(faq),
    breadcrumb: JSON.stringify(breadcrumb)
  };
}

function buildCategoryPage(category, tools) {
  const playbook = CATEGORY_PLAYBOOK[category.id] || CATEGORY_PLAYBOOK.utilities;
  const faqItems = faqForCategory(category, tools);
  const schema = categoryJsonLd(category, tools, faqItems);
  const keywordSource = uniqueList([
    category.name,
    ...tools.flatMap((tool) => [tool.name, ...(tool.tags || []), ...(tool.keywords || [])])
  ]).slice(0, 24).join(', ');

  return `---
layout: default
title: "${escapeYaml(`${category.name} Tools for Chrome | Toolboard`)}"
description: "${escapeYaml(`${category.name} tools in Toolboard: ${tools.length} workflows to ${playbook.objective}. Explore use cases, top tools, and implementation guidance.`)}"
keywords: "${escapeYaml(keywordSource)}"
og_type: "article"
permalink: /categories/${category.id}/
canonical: "${SITE_URL}/categories/${category.id}/"
---

<script type="application/ld+json">
${schema.collection}
</script>
<script type="application/ld+json">
${schema.itemList}
</script>
<script type="application/ld+json">
${schema.faq}
</script>
<script type="application/ld+json">
${schema.breadcrumb}
</script>

<section class="tool-detail">
  <div class="container">
    <nav class="breadcrumb">
      <a href="/">Home</a>
      <span>›</span>
      <a href="/#tools">Tools</a>
      <span>›</span>
      <span class="is-current">${escapeHtml(category.name)}</span>
    </nav>

    <div class="tool-detail__header">
      <div class="tool-card__icon" aria-hidden="true">
        <span class="tool-card__icon-label">${escapeHtml(String(category.name || 'C').slice(0, 2).toUpperCase())}</span>
      </div>
      <div>
        <h1>${escapeHtml(category.name)} Tools</h1>
        <p>${escapeHtml(category.description || `${category.name} workflows in Toolboard.`)}</p>
        <span class="tool-card__category">${escapeHtml(String(tools.length))} tools</span>
      </div>
    </div>

    <section class="tool-detail__card tool-detail__lead">
      <h2>Category Overview</h2>
      <p>${escapeHtml(`This category is focused on teams that need to ${playbook.objective}.`)}</p>
      <p>${escapeHtml(`Inputs typically include ${playbook.input}, and outputs are tuned for ${playbook.output}.`)}</p>
      <p>${escapeHtml(`Use these tools as standalone actions or combine them with related categories for full workflows.`)}</p>
    </section>

    <section class="tool-detail__card" style="margin-top: 12px;">
      <h2>All ${escapeHtml(category.name)} Tools</h2>
      <ul>
        ${tools.map((tool) => `<li><a href="/tools/${tool.id}/">${escapeHtml(tool.name)}</a> - ${escapeHtml(tool.description)}</li>`).join('')}
      </ul>
    </section>

    <section class="tool-detail__card" style="margin-top: 12px;">
      <h2>FAQ</h2>
      <div class="tool-faq">
        ${faqItems.map((item) => `<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`).join('')}
      </div>
    </section>
  </div>
</section>
`;
}

function buildHomeJsonLd(data) {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Toolboard',
    url: SITE_URL,
    description: 'Toolboard is a Chrome extension with 82 tools across inspect, capture, enhance, utilities, converters, previewers, and AI.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Toolboard',
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome',
    softwareVersion: '2.x',
    url: SITE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    featureList: data.categories.map((c) => `${c.name} (${c.count})`)
  };

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Toolboard',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/favicon-512x512.png`,
    sameAs: [
      'https://github.com/ademisler/toolboard'
    ]
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Toolboard Tools',
    numberOfItems: data.tools.length,
    itemListElement: data.tools.map((tool, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: tool.name,
      url: `${SITE_URL}/tools/${tool.id}/`
    }))
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Toolboard?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Toolboard is a Chrome extension that provides 82 tools for inspection, capture, enhancement, utilities, conversion, preview, and AI workflows.'
        }
      },
      {
        '@type': 'Question',
        name: 'Are Toolboard tools free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Toolboard tools are available at no cost in the Chrome Web Store.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I find a specific tool?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use the search and category filters on the homepage, or browse dedicated category and tool pages.'
        }
      }
    ]
  };

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Toolboard Tool Directory',
    description: 'Browse all Toolboard tools and categories.',
    url: SITE_URL
  };

  return `<script type="application/ld+json">
${JSON.stringify(website)}
</script>
<script type="application/ld+json">
${JSON.stringify(software)}
</script>
<script type="application/ld+json">
${JSON.stringify(organization)}
</script>
<script type="application/ld+json">
${JSON.stringify(itemList)}
</script>
<script type="application/ld+json">
${JSON.stringify(faq)}
</script>
<script type="application/ld+json">
${JSON.stringify(collection)}
</script>
`;
}

function buildToolPage(tool, allTools) {
  const keywords = uniqueList([...tool.keywords, ...tool.tags, tool.category, tool.categoryLabel, tool.name])
    .filter(Boolean)
    .slice(0, 16)
    .join(', ');

  const title = `${tool.name} Tool for Chrome | Toolboard`;
  const description = `${tool.name}: ${tool.description} Learn use cases, workflow steps, related tools, and implementation details in Toolboard.`;

  const useCases = makeUseCases(tool);
  const steps = makeHowTo(tool);
  const faqItems = faqForTool(tool);
  const related = relatedTools(tool, allTools);
  const schema = jsonLdForTool(tool, faqItems);
  const lead = buildLead(tool);
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to use ${tool.name} in Toolboard`,
    description: `Step-by-step workflow for ${tool.name}.`,
    totalTime: 'PT2M',
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: `Step ${index + 1}`,
      text: step
    }))
  };
  const relatedListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Related tools for ${tool.name}`,
    numberOfItems: related.length,
    itemListElement: related.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      url: `${SITE_URL}/tools/${entry.id}/`
    }))
  };

  return `---
layout: default
title: "${escapeYaml(title)}"
description: "${escapeYaml(description)}"
keywords: "${escapeYaml(keywords)}"
og_type: "article"
permalink: /tools/${tool.id}/
canonical: "${SITE_URL}/tools/${tool.id}/"
---

<script type="application/ld+json">
${schema.software}
</script>
<script type="application/ld+json">
${schema.faq}
</script>
<script type="application/ld+json">
${schema.breadcrumb}
</script>
<script type="application/ld+json">
${schema.webPage}
</script>
<script type="application/ld+json">
${JSON.stringify(howToSchema)}
</script>
<script type="application/ld+json">
${JSON.stringify(relatedListSchema)}
</script>

<section class="tool-detail" data-tool-id="${tool.id}">
  <div class="container">
    <nav class="breadcrumb">
      <a href="/">Home</a>
      <span>›</span>
      <a href="/#tools">Tools</a>
      <span>›</span>
      <a href="/categories/${tool.category}/">${escapeHtml(tool.categoryLabel)}</a>
      <span>›</span>
      <span class="is-current">${escapeHtml(tool.name)}</span>
    </nav>

    <div class="tool-detail__header">
      <div id="tool-detail-icon" class="tool-card__icon" aria-hidden="true"></div>
      <div>
        <h1 id="tool-detail-title">${escapeHtml(tool.name)}</h1>
        <p id="tool-detail-description">${escapeHtml(tool.description)}</p>
        <span id="tool-detail-category" class="tool-card__category">${escapeHtml(tool.categoryLabel)}</span>
      </div>
    </div>

    <section class="tool-detail__card tool-detail__lead">
      <h2>${escapeHtml(tool.name)} Overview</h2>
      <p>${escapeHtml(lead.intro)}</p>
      <p>${escapeHtml(lead.detail)}</p>
      <p>${escapeHtml(lead.context)}</p>
    </section>

    <div class="tool-detail__grid">
      <article class="tool-detail__card">
        <h2>Primary Use Cases</h2>
        <ul>${listItems(useCases)}</ul>
      </article>
      <article class="tool-detail__card">
        <h2>How to Use ${escapeHtml(tool.name)}</h2>
        <ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </article>
      <article class="tool-detail__card">
        <h2>Input and Output Profile</h2>
        <ul>
          <li><strong>Category:</strong> ${escapeHtml(tool.categoryLabel)}</li>
          <li><strong>Tags:</strong> ${escapeHtml(uniqueList(tool.tags).join(', ') || '-')}</li>
          <li><strong>Keywords:</strong> ${escapeHtml(uniqueList(tool.keywords).join(', ') || '-')}</li>
          <li><strong>Module:</strong> <code>${escapeHtml(tool.module || '-')}</code></li>
        </ul>
      </article>
      <article class="tool-detail__card">
        <h2>Permissions and Privacy</h2>
        <p>${escapeHtml(permissionSummary(tool))}</p>
      </article>
    </div>

    <section class="tool-detail__card" style="margin-top: 12px;">
      <h2>Related Tools in ${escapeHtml(tool.categoryLabel)}</h2>
      <ul>${toolLinks(related)}</ul>
    </section>

    <section class="tool-detail__card" style="margin-top: 12px;">
      <h2>FAQ</h2>
      <div class="tool-faq">
        ${faqItems.map((item) => `<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`).join('')}
      </div>
    </section>

    <div style="margin: 28px 0 48px; display:flex; gap:12px; flex-wrap:wrap;">
      <a class="btn btn-primary" href="${CWS_URL}" target="_blank" rel="noopener">Install Toolboard</a>
      <a class="btn btn-secondary" href="/">Back to all tools</a>
    </div>
  </div>
</section>
`;
}

function buildSitemap(data) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    `${SITE_URL}/`,
    ...data.categories.map((c) => `${SITE_URL}/categories/${c.id}/`),
    ...data.tools.map((t) => `${SITE_URL}/tools/${t.id}/`)
  ];

  const items = urls.map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${url === `${SITE_URL}/` ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function run() {
  ensureDir(path.dirname(siteToolsPath));
  ensureDir(toolsDir);
  ensureDir(categoriesDir);
  ensureDir(includesDir);

  const extManifest = readJson(extManifestPath);
  const localeEn = readJson(localeEnPath);
  const data = mapTools(extManifest, localeEn);

  fs.writeFileSync(siteToolsPath, `${JSON.stringify(data)}\n`);

  for (const entry of fs.readdirSync(toolsDir)) {
    if (entry.endsWith('.html')) {
      fs.unlinkSync(path.join(toolsDir, entry));
    }
  }

  for (const tool of data.tools) {
    const pagePath = path.join(toolsDir, `${tool.id}.html`);
    fs.writeFileSync(pagePath, buildToolPage(tool, data.tools));
  }

  for (const entry of fs.readdirSync(categoriesDir)) {
    if (entry.endsWith('.html')) {
      fs.unlinkSync(path.join(categoriesDir, entry));
    }
  }

  for (const category of data.categories) {
    const tools = data.tools.filter((tool) => tool.category === category.id);
    const pagePath = path.join(categoriesDir, `${category.id}.html`);
    fs.writeFileSync(pagePath, buildCategoryPage(category, tools));
  }

  fs.writeFileSync(toolLinksIncludePath, buildToolLinksInclude(data));
  fs.writeFileSync(categoryLinksIncludePath, buildCategoryLinksInclude(data));
  fs.writeFileSync(homeJsonLdIncludePath, buildHomeJsonLd(data));
  fs.writeFileSync(sitemapPath, buildSitemap(data));
  fs.writeFileSync(
    robotsPath,
    `User-agent: *\nAllow: /\n\nHost: toolboard.ademisler.com\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );

  console.log(`Synced ${data.tools.length} tools with SEO-rich content.`);
}

run();
