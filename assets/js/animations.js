const state = {
  tools: [],
  categories: [],
  filtered: [],
  activeCategory: 'all',
  query: '',
  currentPage: 1,
  toolsPerPage: 6
};
let searchDebounceTimer = null;

function withBase(pathname) {
  const base = document.querySelector('meta[name="site-baseurl"]')?.getAttribute('content') || '';
  return `${base}${pathname}`;
}

function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  const category = params.get('category');
  if (q) state.query = q;
  if (category) state.activeCategory = category;
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeToolAvatar(tool, target) {
  const initials = (tool.name || 'Tool')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  target.innerHTML = `<span class="tool-card__icon-label">${escapeHtml(initials || 'T')}</span>`;
}

async function loadToolsData() {
  const res = await fetch(withBase('/assets/data/tools.json'), { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Unable to load tools.json (${res.status})`);
  const data = await res.json();
  state.tools = Array.isArray(data.tools) ? data.tools : [];
  state.categories = Array.isArray(data.categories) ? data.categories : [];
  state.filtered = [...state.tools];
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  state.filtered = state.tools.filter((tool) => {
    if (state.activeCategory !== 'all' && tool.category !== state.activeCategory) return false;
    if (!query) return true;

    const haystack = [
      tool.name,
      tool.description,
      tool.category,
      tool.categoryLabel,
      ...(tool.tags || []),
      ...(tool.keywords || [])
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });
  state.currentPage = 1;
}

function updateSearchFeedback() {
  const countEl = document.getElementById('search-result-count');
  const chipsEl = document.getElementById('search-chips');
  if (countEl) {
    countEl.textContent = `${state.filtered.length} tool${state.filtered.length === 1 ? '' : 's'} shown`;
  }
  if (chipsEl) {
    chipsEl.innerHTML = '';
    if (state.activeCategory !== 'all') {
      const category = state.categories.find((c) => c.id === state.activeCategory);
      const chip = document.createElement('button');
      chip.className = 'search-chip';
      chip.type = 'button';
      chip.textContent = category?.name || state.activeCategory;
      chip.addEventListener('click', () => {
        state.activeCategory = 'all';
        const btnSpan = document.querySelector('#category-menu-btn span');
        if (btnSpan) btnSpan.textContent = 'All Categories';
        applyFilters();
        renderTools();
        updateSearchFeedback();
      });
      chipsEl.appendChild(chip);
    }
  }
}

function renderStats() {
  const statsGrid = document.getElementById('stats-grid');
  if (!statsGrid) return;
  const converterCount = state.tools.filter((t) => t.category === 'converters').length;
  const previewerCount = state.tools.filter((t) => t.category === 'previewers').length;
  statsGrid.innerHTML = `
    <div class="stat-card"><h3>${state.tools.length}</h3><p>Total tools</p></div>
    <div class="stat-card"><h3>${state.categories.length}</h3><p>Categories</p></div>
    <div class="stat-card"><h3>${converterCount}</h3><p>Converters</p></div>
    <div class="stat-card"><h3>${previewerCount}</h3><p>Previewers</p></div>
  `;
}

function renderQuickCategories() {
  const quickCategories = document.getElementById('quick-categories');
  if (!quickCategories) return;

  const featured = state.categories
    .slice()
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 6);

  quickCategories.innerHTML = '';

  featured.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quick-category';
    button.innerHTML = `<span>${escapeHtml(category.name)}</span><strong>${category.count || 0}</strong>`;
    button.addEventListener('click', () => {
      state.activeCategory = category.id;
      const btnSpan = document.querySelector('#category-menu-btn span');
      if (btnSpan) btnSpan.textContent = category.name;
      applyFilters();
      renderTools();
      updateSearchFeedback();
      const toolsSection = document.getElementById('tools');
      toolsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    quickCategories.appendChild(button);
  });
}

function buildCategoryMenu() {
  const menu = document.getElementById('category-menu');
  if (!menu) return;

  const items = [
    { id: 'all', name: 'All Categories', count: state.tools.length },
    ...state.categories
  ];

  menu.innerHTML = '';
  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'category-menu-item';
    button.type = 'button';
    button.dataset.category = item.id;
    button.innerHTML = `<span>${escapeHtml(item.name)} (${item.count || 0})</span>`;
    button.addEventListener('click', () => {
      state.activeCategory = item.id;
      const btnSpan = document.querySelector('#category-menu-btn span');
      if (btnSpan) btnSpan.textContent = item.name;
      menu.classList.remove('show');
      applyFilters();
      renderTools();
      updateSearchFeedback();
    });
    menu.appendChild(button);
  });
}

function showToolModal(tool) {
  const modal = document.getElementById('tool-modal');
  if (!modal) return;

  const title = document.getElementById('tool-modal-title');
  const category = document.getElementById('tool-modal-category');
  const description = document.getElementById('tool-modal-description');
  const features = document.getElementById('tool-modal-features');
  const icon = document.getElementById('tool-modal-icon');
  const pageLink = document.getElementById('tool-modal-page-link');

  if (title) title.textContent = tool.name;
  if (category) category.textContent = tool.categoryLabel || tool.category;
  if (description) description.textContent = tool.description || '';
  if (features) {
    const lines = [
      `ID: ${tool.id}`,
      `Module: ${tool.module || '-'}`,
      `Tags: ${(tool.tags || []).join(', ') || '-'}`,
      `Permissions: ${(tool.permissions || []).join(', ') || '-'}`
    ];
    features.innerHTML = lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  }
  if (icon) makeToolAvatar(tool, icon);
  if (pageLink) pageLink.href = withBase(`/tools/${tool.id}/`);

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeToolModal() {
  const modal = document.getElementById('tool-modal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderTools() {
  const grid = document.getElementById('tools-grid');
  if (!grid) return;

  grid.innerHTML = '';
  if (!state.filtered.length) {
    grid.innerHTML = `
      <article class="tools-empty">
        <h3>No tools found</h3>
        <p>Try a different keyword or clear the category filter.</p>
      </article>
    `;
    updatePagination();
    return;
  }

  const start = (state.currentPage - 1) * state.toolsPerPage;
  const visibleTools = state.filtered.slice(start, start + state.toolsPerPage);
  const fragment = document.createDocumentFragment();
  visibleTools.forEach((tool) => {
    const card = document.createElement('article');
    card.className = 'tool-card';
    card.tabIndex = 0;
    card.dataset.toolId = tool.id;
    card.style.setProperty('--stagger', String(grid.children.length));

    const icon = document.createElement('div');
    icon.className = 'tool-card__icon';
    makeToolAvatar(tool, icon);

    const content = document.createElement('div');
    content.className = 'tool-card__content';
    content.innerHTML = `
      <h3 class="tool-card__title">${escapeHtml(tool.name)}</h3>
      <p class="tool-card__description">${escapeHtml(tool.description || '')}</p>
      <span class="tool-card__category">${escapeHtml(tool.categoryLabel || tool.category)}</span>
    `;

    const openBtn = document.createElement('a');
    openBtn.className = 'btn btn-secondary';
    openBtn.href = withBase(`/tools/${tool.id}/`);
    openBtn.textContent = 'Details';
    openBtn.addEventListener('click', (event) => event.stopPropagation());

    card.appendChild(icon);
    card.appendChild(content);
    card.appendChild(openBtn);

    card.addEventListener('click', () => showToolModal(tool));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showToolModal(tool);
      }
    });

    fragment.appendChild(card);
    requestAnimationFrame(() => card.classList.add('is-visible'));
  });
  grid.appendChild(fragment);
  updatePagination();
}

function updatePagination() {
  const wrapper = document.getElementById('tools-pagination');
  const prevBtn = document.getElementById('tools-prev-page');
  const nextBtn = document.getElementById('tools-next-page');
  const currentEl = document.getElementById('tools-current-page');
  const totalEl = document.getElementById('tools-total-pages');
  if (!wrapper || !prevBtn || !nextBtn || !currentEl || !totalEl) return;

  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.toolsPerPage));
  wrapper.hidden = state.filtered.length <= state.toolsPerPage;

  if (state.currentPage > totalPages) state.currentPage = totalPages;
  currentEl.textContent = String(state.currentPage);
  totalEl.textContent = String(totalPages);
  prevBtn.disabled = state.currentPage <= 1;
  nextBtn.disabled = state.currentPage >= totalPages;
}

function initToolDetailPage() {
  const detail = document.querySelector('.tool-detail[data-tool-id]');
  if (!detail) return;

  const toolId = detail.getAttribute('data-tool-id');
  const tool = state.tools.find((t) => t.id === toolId);
  if (!tool) return;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const fillList = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    const normalized = Array.isArray(items) && items.length ? items : ['-'];
    el.innerHTML = normalized.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  };

  setText('tool-detail-title', tool.name);
  setText('tool-detail-description', tool.description || '');
  setText('tool-detail-category', tool.categoryLabel || tool.category);
  setText('tool-detail-module', tool.module || '-');
  fillList('tool-detail-tags', tool.tags);
  fillList('tool-detail-permissions', tool.permissions);
  fillList('tool-detail-keywords', tool.keywords);

  const icon = document.getElementById('tool-detail-icon');
  if (icon) makeToolAvatar(tool, icon);
}

function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  const body = document.body;
  const savedTheme = localStorage.getItem('toolboard-theme') || 'dark';
  body.className = savedTheme;

  themeToggle.addEventListener('click', () => {
    const newTheme = body.className === 'dark' ? 'light' : 'dark';
    body.className = newTheme;
    localStorage.setItem('toolboard-theme', newTheme);
  });
}

function bindStaticEvents() {
  const searchInput = document.getElementById('tool-search');
  const categoryMenuBtn = document.getElementById('category-menu-btn');
  const categoryMenu = document.getElementById('category-menu');
  const modal = document.getElementById('tool-modal');
  const modalClose = document.getElementById('tool-modal-close');
  const prevPageBtn = document.getElementById('tools-prev-page');
  const nextPageBtn = document.getElementById('tools-next-page');

  if (searchInput) {
    if (state.query) searchInput.value = state.query;
    searchInput.addEventListener('input', (event) => {
      state.query = event.target.value || '';
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        applyFilters();
        renderTools();
        updateSearchFeedback();
      }, 110);
    });
  }

  if (categoryMenuBtn && categoryMenu) {
    categoryMenuBtn.addEventListener('click', () => categoryMenu.classList.toggle('show'));
    document.addEventListener('click', (event) => {
      if (!categoryMenu.contains(event.target) && !categoryMenuBtn.contains(event.target)) {
        categoryMenu.classList.remove('show');
      }
    });
  }

  if (modal && modalClose) {
    modalClose.addEventListener('click', closeToolModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeToolModal();
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
        renderTools();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.toolsPerPage));
      if (state.currentPage < totalPages) {
        state.currentPage += 1;
        renderTools();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeToolModal();
  });
}

async function init() {
  initThemeToggle();
  bindStaticEvents();
  try {
    await loadToolsData();
    applyUrlFilters();
    applyFilters();
    buildCategoryMenu();
    if (state.activeCategory !== 'all') {
      const category = state.categories.find((c) => c.id === state.activeCategory);
      const btnSpan = document.querySelector('#category-menu-btn span');
      if (btnSpan) btnSpan.textContent = category?.name || 'All Categories';
    }
    renderStats();
    renderQuickCategories();
    renderTools();
    updateSearchFeedback();
    initToolDetailPage();
  } catch (error) {
    console.error('Toolboard site init failed', error);
    const grid = document.getElementById('tools-grid');
    if (grid) {
      grid.innerHTML = `<article class="tool-card"><div class="tool-card__content"><h3 class="tool-card__title">Unable to load tool data</h3><p class="tool-card__description">Please refresh this page.</p></div></article>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
