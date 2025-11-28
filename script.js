// Элементы DOM
const newsListEl = document.getElementById('news-list');
const searchInputEl = document.getElementById('search-input');

const modalEl = document.getElementById('modal');
const modalTitleEl = document.getElementById('modal-title');
const modalImageEl = document.getElementById('modal-image');
const modalSummaryEl = document.getElementById('modal-summary');
const modalLinkEl = document.getElementById('modal-link');
const modalCloseBtn = document.getElementById('modal-close');

// Данные
let newsData = [];
let filteredData = [];

// ----------------------------------------------------
// Детектор touch-устройств для адаптивного поведения
// ----------------------------------------------------
const isTouchDevice =
  matchMedia('(hover: none)').matches || 'ontouchstart' in window;

if (isTouchDevice) {
  document.body.classList.add('touch');
} else {
  document.body.classList.add('no-touch');
}

// ----------------------------------------------------
// Рендер списка новостей
// ----------------------------------------------------
function renderNewsList(list) {
  if (!newsListEl) return;

  newsListEl.innerHTML = '';

  if (!list || list.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Новости не найдены.';
    newsListEl.appendChild(empty);
    return;
  }

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

// ----------------------------------------------------
// Поиск по заголовкам и описаниям
// ----------------------------------------------------
function applyFilter() {
  const q = (searchInputEl?.value || '').trim().toLowerCase();

  if (!q) {
    filteredData = newsData.slice();
  } else {
    filteredData = newsData.filter(item => {
      const text =
        (item.title || '') +
        ' ' +
        (item.description || '') +
        ' ' +
        (item.source || '');
      return text.toLowerCase().includes(q);
    });
  }

  renderNewsList(filteredData);
}

if (searchInputEl) {
  searchInputEl.addEventListener('input', () => applyFilter());
}

// ----------------------------------------------------
// Модальное окно
// ----------------------------------------------------
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

// ----------------------------------------------------
// Загрузка news.json
// ----------------------------------------------------
async function loadNews() {
  try {
    const res = await fetch('news.json');
    const data = await res.json();

    // news.json может быть массивом или объектом { news: [...] }
    newsData = Array.isArray(data) ? data : (data.news || []);
    applyFilter();
  } catch (e) {
    console.error('Ошибка загрузки news.json', e);
    if (newsListEl) {
      newsListEl.textContent = 'Ошибка загрузки новостей.';
    }
  }
}

loadNews();
