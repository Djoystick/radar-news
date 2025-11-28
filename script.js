const newsListEl = document.getElementById('news-list');
const tagCloudEl = document.getElementById('tag-cloud');
const categoryFiltersEl = document.getElementById('category-filters');
const searchInputEl = document.getElementById('search-input');

const modalEl = document.getElementById('modal');
const modalContentEl = document.getElementById('modal-content');
const modalTitleEl = document.getElementById('modal-title');
const modalImageEl = document.getElementById('modal-image');
const modalSummaryEl = document.getElementById('modal-summary');
const modalLinkEl = document.getElementById('modal-link');
const modalCloseBtn = document.getElementById('modal-close');

const errorMessageEl = document.getElementById('error-message');
const emptyMessageEl = document.getElementById('empty-message');

let newsData = [];
let filteredData = [];
let currentCategory = 'all';

// детектор touch-устройств
const isTouchDevice =
  matchMedia('(hover: none)').matches || 'ontouchstart' in window;
if (isTouchDevice) {
  document.body.classList.add('touch');
} else {
  document.body.classList.add('no-touch');
}

// сообщения

function showError(message) {
  if (!errorMessageEl) return;
  errorMessageEl.textContent = message;
  errorMessageEl.style.display = 'block';
}

function hideError() {
  if (!errorMessageEl) return;
  errorMessageEl.style.display = 'none';
}

function showEmpty(message) {
  if (!emptyMessageEl) return;
  emptyMessageEl.textContent = message;
  emptyMessageEl.style.display = 'block';
}

function hideEmpty() {
  if (!emptyMessageEl) return;
  emptyMessageEl.style.display = 'none';
}

// облако тегов

function createTagCloud(news) {
  if (!tagCloudEl) return;

  const tagCounts = {};
  news.forEach(item => {
    (item.hashtags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  tagCloudEl.innerHTML = '';
  topTags.forEach(([tag]) => {
    const tagEl = document.createElement('span');
    tagEl.textContent = tag;
    tagEl.classList.add('tag');
    tagEl.onclick = () => filterByTag(tag);
    tagCloudEl.appendChild(tagEl);
  });
}

// фильтры по категориям

function createCategoryFilters(categories) {
  if (!categoryFiltersEl) return;

  categoryFiltersEl.innerHTML = '';

  const allChip = document.createElement('span');
  allChip.textContent = 'Все новости';
  allChip.classList.add('filter-chip', 'filter-chip-active');
  allChip.onclick = () => filterNews('all', searchInputEl?.value || '');
  categoryFiltersEl.appendChild(allChip);

  categories.forEach(cat => {
    const chip = document.createElement('span');
    chip.textContent = cat;
    chip.classList.add('filter-chip');
    chip.onclick = () => filterNews(cat, searchInputEl?.value || '');
    categoryFiltersEl.appendChild(chip);
  });
}

function setActiveFilter(category) {
  if (!categoryFiltersEl) return;
  const chips = categoryFiltersEl.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.classList.remove('filter-chip-active');
    if (
      (category === 'all' && chip.textContent === 'Все новости') ||
      chip.textContent === category
    ) {
      chip.classList.add('filter-chip-active');
    }
  });
}

// фильтр по тегу

function filterByTag(tag) {
  currentCategory = 'all';
  setActiveFilter('all');

  const query = (searchInputEl?.value || '').trim().toLowerCase();
  filteredData = newsData.filter(item => {
    const byTag = (item.hashtags || []).includes(tag);
    if (!byTag) return false;
    if (!query) return true;
    const text =
      (item.title || '') +
      ' ' +
      (item.description || '') +
      ' ' +
      (item.source || '');
    return text.toLowerCase().includes(query);
  });

  renderNewsList(filteredData);

  if (!filteredData.length) {
    showEmpty('Новости с таким тегом не найдены.');
  } else {
    hideEmpty();
  }
}

// основной фильтр

function filterNews(category, searchQuery) {
  currentCategory = category;
  setActiveFilter(category);
  hideEmpty();

  const query = (searchQuery || '').trim().toLowerCase();

  filteredData = newsData.filter(item => {
    const byCategory = category === 'all' ? true : item.category === category;
    if (!byCategory) return false;

    if (!query) return true;

    const text =
      (item.title || '') +
      ' ' +
      (item.description || '') +
      ' ' +
      (item.source || '');
    return text.toLowerCase().includes(query);
  });

  renderNewsList(filteredData);

  if (!filteredData.length) {
    showEmpty('По вашему запросу ничего не найдено.');
  }
}

// рендер списка новостей

function renderNewsList(list) {
  if (!newsListEl) return;

  newsListEl.innerHTML = '';

  list.forEach(item => {
    const card = document.createElement('article');
    card.className = 'news-item';

    const meta = document.createElement('div');
    meta.className = 'news-item__meta';
    const category = item.category || '';
    const source = item.source || '';
    meta.textContent = [category, source].filter(Boolean).join(' • ');

    const title = document.createElement('h3');
    title.className = 'news-item__title';
    title.textContent = item.title || '';

    const descr = document.createElement('p');
    descr.className = 'news-item__descr';
    descr.textContent = item.shortDescription || item.description || '';

    const more = document.createElement('div');
    more.className = 'news-item__more';
    more.textContent = 'Читать далее →';

    card.appendChild(meta);
    card.appendChild(title);
    card.appendChild(descr);
    card.appendChild(more);

    card.addEventListener('click', () => showModal(item));

    newsListEl.appendChild(card);
  });
}

// модальное окно

function showModal(item) {
  if (!modalEl) return;

  modalTitleEl.textContent = item.title || '';
  modalSummaryEl.textContent = item.description || item.shortDescription || '';
  modalLinkEl.href = item.link || '#';
  modalImageEl.src = item.image || 'assets/placeholder.jpg';

  modalEl.classList.remove('modal-hidden');
}

if (modalCloseBtn && modalEl) {
  modalCloseBtn.addEventListener('click', () => {
    modalEl.classList.add('modal-hidden');
  });

  modalEl.addEventListener('click', e => {
    if (e.target === modalEl) {
      modalEl.classList.add('modal-hidden');
    }
  });
}

// поиск

if (searchInputEl) {
  searchInputEl.addEventListener('input', () =>
    filterNews(currentCategory, searchInputEl.value),
  );
}

// загрузка news.json

async function loadNews() {
  try {
    const res = await fetch('news.json');
    const data = await res.json();

    newsData = Array.isArray(data) ? data : data.news || [];
    if (!newsData.length) {
      showEmpty('Новости пока не найдены.');
    }

    const categories = Array.from(
      new Set(newsData.map(n => n.category).filter(Boolean)),
    );

    createCategoryFilters(categories);
    createTagCloud(newsData);

    filterNews('all', '');
  } catch (e) {
    console.error(e);
    showError('Не удалось загрузить новости. Попробуйте обновить страницу.');
  }
}

loadNews();
