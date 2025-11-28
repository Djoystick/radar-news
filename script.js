const PLACEHOLDER_IMAGE = '/assets/placeholder.jpg';

let allNews = [];
let filteredNews = [];
let allHashtags = [];
let currentCategory = 'all';
let currentHashtag = null;
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    loadNews();
    setupEventListeners();
    setupSearch();
});

async function loadNews() {
    try {
        const response = await fetch('news.json');
        if (!response.ok) throw new Error('Не удалось загрузить новости');
        const data = await response.json();
        allNews = data.news || [];
        allHashtags = data.hashtags || [];
        updateLastUpdateTime(data.lastUpdated);
        createCategoryFilters(data.categories);
        createHashtagCloud(allHashtags);
        filterNews('all', null);
    } catch (error) {
        showError('Не удалось загрузить новости. Попробуйте обновить страницу.');
    }
}


function createCategoryFilters(categories) {
    const filtersContainer = document.getElementById('categoryFilters');
    if (!filtersContainer) return;
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.dataset.category = 'all';
    allButton.textContent = 'Все новости';
    allButton.addEventListener('click', () => {
        currentCategory = 'all';
        currentHashtag = null;
        filterNews('all', null);
    });
    filtersContainer.innerHTML = '';
    filtersContainer.appendChild(allButton);
    categories.sort().forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.dataset.category = category;
        button.textContent = category;
        button.addEventListener('click', () => {
            currentHashtag = null;
            filterNews(category, null);
        });
        filtersContainer.appendChild(button);
    });
}

function createHashtagCloud(hashtags) {
    const cloud = document.getElementById('hashtagCloud');
    if (!cloud) return;
    cloud.innerHTML = '';
    hashtags.sort().forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'hashtag-btn';
        btn.textContent = tag;
        btn.addEventListener('click', () => {
            currentCategory = 'all';
            filterNews('all', tag);
            document.querySelectorAll('.hashtag-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        cloud.appendChild(btn);
    });
}

function setupSearch() {
    const searchInput = document.getElementById('newsSearchInput');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
        currentSearchQuery = searchInput.value.trim().toLowerCase();
        filterNews(currentCategory, currentHashtag);
    });
}

function filterNews(category, hashtag) {
    currentCategory = category;
    currentHashtag = hashtag;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (hashtag) {
            if (btn.dataset.category === 'all') btn.classList.add('active');
        } else {
            if (btn.dataset.category === category) btn.classList.add('active');
        }
    });

    document.querySelectorAll('.hashtag-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === hashtag) btn.classList.add('active');
    });

    let newsToShow = [...allNews];
    if (category !== 'all') newsToShow = newsToShow.filter(news => news.category === category);
    if (hashtag) newsToShow = newsToShow.filter(news => news.hashtags && news.hashtags.includes(hashtag));
    if (currentSearchQuery.length > 0) {
        newsToShow = newsToShow.filter(news =>
            (news.title && news.title.toLowerCase().includes(currentSearchQuery)) ||
            (news.description && news.description.toLowerCase().includes(currentSearchQuery))
        );
    }
    filteredNews = newsToShow;
    renderNews();
}

function renderNews() {
    const newsGrid = document.getElementById('newsGrid');
    if (!newsGrid) return;
    newsGrid.innerHTML = '';
    if (filteredNews.length === 0) {
        newsGrid.innerHTML = '<div class="no-news">Новостей по выбранной теме нет</div>';
        return;
    }
    filteredNews.forEach((news, index) => {
        newsGrid.appendChild(createNewsCard(news, index));
    });
}

function createNewsCard(news, index) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.addEventListener('click', () => openModal(news));
    const image = document.createElement('img');
    image.className = 'news-card__image';
    image.src = news.image || PLACEHOLDER_IMAGE;
    image.alt = news.title;
    image.loading = 'lazy';
    image.onerror = () => { image.src = PLACEHOLDER_IMAGE; };
    const content = document.createElement('div');
    content.className = 'news-card__content';
    const meta = document.createElement('div');
    meta.className = 'news-card__meta';
    const category = document.createElement('span');
    category.className = 'news-card__category';
    category.textContent = news.category;
    const source = document.createElement('span');
    source.className = 'news-card__source';
    source.textContent = news.source;
    const date = document.createElement('span');
    date.className = 'news-card__date';
    date.textContent = formatDate(news.pubDate);
    meta.appendChild(category);
    meta.appendChild(source);
    meta.appendChild(date);
    const title = document.createElement('h3');
    title.className = 'news-card__title';
    title.textContent = news.title;
    const description = document.createElement('p');
    description.className = 'news-card__description';
    description.textContent = news.shortDescription;
    const hashtagsDiv = document.createElement('div');
    hashtagsDiv.className = 'news-card__hashtags';
    (news.hashtags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'hashtag';
        span.textContent = tag;
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            filterNews('all', tag);
        });
        hashtagsDiv.appendChild(span);
    });
    const footer = document.createElement('div');
    footer.className = 'news-card__footer';
    const readMore = document.createElement('span');
    readMore.className = 'news-card__read-more';
    readMore.textContent = 'Читать далее →';
    footer.appendChild(readMore);
    content.appendChild(meta);
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(hashtagsDiv);
    content.appendChild(footer);
    card.appendChild(image);
    card.appendChild(content);
    return card;
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffHours < 1) return 'только что';
    else if (diffHours < 24) return `${diffHours} ч. назад`;
    else if (diffDays < 7) return `${diffDays} дн. назад`;
    else return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function openModal(news) {
    const modal = document.getElementById('newsModal');
    if (!modal) return;
    const modalImage = document.getElementById('modalImage');
    const modalCategory = document.getElementById('modalCategory');
    const modalSource = document.getElementById('modalSource');
    const modalDate = document.getElementById('modalDate');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalLink = document.getElementById('modalLink');
    const modalHashtags = document.getElementById('modalHashtags');
    if (modalImage) {
        modalImage.src = news.image || PLACEHOLDER_IMAGE;
        modalImage.alt = news.title;
        modalImage.style.display = news.image ? 'block' : 'none';
        modalImage.onerror = () => { modalImage.src = PLACEHOLDER_IMAGE; };
    }
    if (modalCategory) modalCategory.textContent = news.category;
    if (modalSource) modalSource.textContent = news.source;
    if (modalDate) modalDate.textContent = new Date(news.pubDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (modalTitle) modalTitle.textContent = news.title;
    if (modalDescription) modalDescription.textContent = news.description;
    if (modalLink) modalLink.href = news.link;
    if (modalHashtags) {
        modalHashtags.innerHTML = '';
        (news.hashtags || []).forEach(tag => {
            const span = document.createElement('span');
            span.className = 'hashtag';
            span.textContent = tag;
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                filterNews('all', tag);
                closeModal();
            });
            modalHashtags.appendChild(span);
        });
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('newsModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function setupEventListeners() {
    const modalClose = document.getElementById('modalClose');
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function showError(message) {
    const newsGrid = document.getElementById('newsGrid');
    if (!newsGrid) return;
    newsGrid.innerHTML = `<div class="no-news"><p>${message}</p></div>`;
}

