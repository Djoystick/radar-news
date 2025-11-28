import feedparser
import json
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
import os
import sys
from lingua import LanguageDetectorBuilder

from config import NEWS_SOURCES, MAX_NEWS_PER_SOURCE, MAX_TOTAL_NEWS

EXCLUDE_KEYWORDS = [
    "политика", "выборы", "депутат", "санкции", "закон", "министр", "парламент", "президент"
]

TECH_KEYWORDS = [
    "технологии", "it", "искусственный интеллект", "ai", "гаджет", "смартфон", "кибер", "разработка",
    "software", "hardware", "стартап", "программирование", "робот", "компьютер", "криптовалюта", "блокчейн",
    "cloud", "дизайн", "ux", "ui", "облако", "наука", "финтех", "инженерия", "цифровой", "электроника"
]

PLACEHOLDER_IMAGE = 'assets/placeholder.jpg'
detector = LanguageDetectorBuilder.from_all_languages().build()

def clean_html(text):
    if not text:
        return ""
    soup = BeautifulSoup(text, 'html.parser')
    return soup.get_text().strip()

def is_russian(text):
    if not text or len(text) < 20:
        return False
    language = detector.detect_language_of(text)
    return str(language) == "Language.RUSSIAN"

def is_political(news_item):
    title = news_item.get('title', '').lower()
    description = news_item.get('description', '').lower()
    for word in EXCLUDE_KEYWORDS:
        if word in title or word in description:
            return True
    return False

def is_technology(news_item):
    text = news_item.get('title', '').lower() + " " + news_item.get('description', '').lower()
    for word in TECH_KEYWORDS:
        if word in text:
            return True
    return False

def extract_hashtags(title, description):
    hashtags = set()
    search_text = (title + ' ' + description).lower()
    for word in TECH_KEYWORDS:
        if word in search_text:
            hashtags.add(f"#{word.replace(' ', '')}")
    return list(hashtags)

def extract_image(entry):
    if hasattr(entry, 'media_content') and entry.media_content:
        return entry.media_content[0].get('url', '')
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        return entry.media_thumbnail[0].get('url', '')
    if hasattr(entry, 'enclosures') and entry.enclosures:
        for enclosure in entry.enclosures:
            if 'image' in enclosure.get('type', ''):
                return enclosure.get('href', '')
    content = entry.get('content', [{}])[0].get('value', '') or entry.get('summary', '')
    if content:
        soup = BeautifulSoup(content, 'html.parser')
        img = soup.find('img')
        if img and img.get('src'):
            return img['src']
    return PLACEHOLDER_IMAGE

def parse_date(date_string):
    try:
        if date_string:
            parsed_date = date_parser.parse(date_string)
            return parsed_date.isoformat()
    except:
        pass
    return datetime.now().isoformat()

def is_only_titles(feed):
    count_only_title = 0
    for entry in feed.entries:
        body = ''
        if 'content' in entry and entry.content:
            body = entry.content[0].value
        elif 'summary' in entry:
            body = entry.summary
        elif 'description' in entry:
            body = entry.description
        body = clean_html(body)
        # Не считаем короткие как текст
        if not body or len(body.strip()) < 20:
            count_only_title += 1
    return (count_only_title / max(len(feed.entries), 1)) > 0.8

def fetch_feed(source):
    news_items = []
    try:
        print(f"Загрузка: {source['name']}...")
        feed = feedparser.parse(source['url'])
        # Проверка: если источник - только заголовки, пропускаем
        if is_only_titles(feed):
            print(f"  ✗ Пропуск {source['name']}: только заголовки")
            return []
        count = 0
        for entry in feed.entries[:MAX_NEWS_PER_SOURCE]:
            title = entry.get('title', '').strip()
            link = entry.get('link', '')
            description = ''
            if 'content' in entry and entry.content:
                description = entry.content[0].value if isinstance(entry.content, list) else entry.content
            elif 'summary' in entry:
                description = entry.summary
            elif 'description' in entry:
                description = entry.description

            description = clean_html(description)
            # Пропуск нерусских новостей
            if not is_russian(description):
                continue
            short_description = description[:300] + '...' if len(description) > 300 else description
            pub_date = entry.get('published', entry.get('updated', ''))
            pub_date_iso = parse_date(pub_date)
            image_url = extract_image(entry)
            hashtags = extract_hashtags(title, description)
            news_item = {
                "id": f"{source['name']}_{count}_{int(datetime.now().timestamp())}",
                "title": title,
                "description": description,
                "shortDescription": short_description,
                "link": link,
                "source": source['name'],
                "category": source['category'],
                "image": image_url,
                "pubDate": pub_date_iso,
                "hashtags": hashtags
            }
            if not is_political(news_item) and is_technology(news_item):
                news_items.append(news_item)
            count += 1
        print(f"  ✓ Получено {len(news_items)} новостей из {source['name']}")
    except Exception as e:
        print(f"  ✗ Ошибка при загрузке {source['name']}: {str(e)}")
    return news_items

def fetch_all_news():
    all_news = []
    print("=" * 60)
    print("СТАРТ СБОРА ТЕХНО-НОВОСТЕЙ ДЛЯ АГРЕГАТОРА 'РАДАР'")
    print("=" * 60)
    for source in NEWS_SOURCES:
        news_items = fetch_feed(source)
        all_news.extend(news_items)
    all_news.sort(key=lambda x: x['pubDate'], reverse=True)
    all_news = all_news[:MAX_TOTAL_NEWS]
    print("=" * 60)
    print(f"ИТОГО СОБРАНО: {len(all_news)} новостей")
    print("=" * 60)
    return all_news

def save_to_json(news_data, output_path):
    output = {
        "lastUpdated": datetime.now().isoformat(),
        "totalNews": len(news_data),
        "categories": list(set([item['category'] for item in news_data])),
        "hashtags": list(set(tag for news in news_data for tag in news.get("hashtags", []))),
        "news": news_data
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n✓ Данные сохранены в: {output_path}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_file = os.path.join(project_root, 'news.json')
    news_data = fetch_all_news()
    if news_data:
        save_to_json(news_data, output_file)
        print("\n✓✓✓ СБОР НОВОСТЕЙ ЗАВЕРШЕН ✓✓✓\n")
    else:
        print("\n✗✗✗ НЕ УДАЛОСЬ СОБРАТЬ НОВОСТИ ✗✗✗\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
