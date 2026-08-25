/**
 * Single source of truth shared by the Astro site and the Node.js collector
 * scripts. Everything that both sides must agree on (languages, the discovery
 * matrix, the category taxonomy) lives here so the two can never drift.
 */

/** Languages the catalog is published in. One static build per language. */
export const LANGS = ['ru', 'en', 'tr'];

export const DEFAULT_LANG = 'ru';

/** Subdomain -> language. Each subdomain is an independent build. */
export const LANG_HOSTS = {
  ru: 'ru',
  en: 'en',
  tr: 'tr'
};

/**
 * Google Play locale + country used when fetching card details per language.
 * `country` affects availability and pricing, `lang` affects the copy we read.
 */
export const LANG_LOCALES = {
  ru: { lang: 'ru', country: 'ru' },
  en: { lang: 'en', country: 'us' },
  tr: { lang: 'tr', country: 'tr' }
};

/** Storefronts walked by discovery.js when building the package id list. */
export const DISCOVERY_COUNTRIES = ['ru', 'tr', 'uz'];

/** Top-10 game categories walked per country. */
export const GAME_CATEGORIES = [
  'GAME_ACTION',
  'GAME_ADVENTURE',
  'GAME_ARCADE',
  'GAME_BOARD',
  'GAME_CARD',
  'GAME_CASUAL',
  'GAME_PUZZLE',
  'GAME_RACING',
  'GAME_SIMULATION',
  'GAME_STRATEGY'
];

/** Top-10 application categories walked per country. */
export const APP_CATEGORIES = [
  'COMMUNICATION',
  'ENTERTAINMENT',
  'FINANCE',
  'HEALTH_AND_FITNESS',
  'MAPS_AND_NAVIGATION',
  'PERSONALIZATION',
  'PHOTOGRAPHY',
  'PRODUCTIVITY',
  'SHOPPING',
  'TOOLS'
];

export const DISCOVERY_CATEGORIES = [...GAME_CATEGORIES, ...APP_CATEGORIES];

/** collection + page size used for every country x category combination. */
export const DISCOVERY_COLLECTION = 'TOP_FREE';
export const DISCOVERY_NUM = 50;

/**
 * Catalog taxonomy. `id` matches the Google Play category constant, `slug` is
 * the URL segment used by the site, `type` decides whether a card lives under
 * /games/ or /apps/.
 */
export const CATEGORIES = [
  // Games
  { id: 'GAME_ACTION', slug: 'action', type: 'game', labels: { ru: 'Экшен', en: 'Action', tr: 'Aksiyon' } },
  { id: 'GAME_ADVENTURE', slug: 'adventure', type: 'game', labels: { ru: 'Приключения', en: 'Adventure', tr: 'Macera' } },
  { id: 'GAME_ARCADE', slug: 'arcade', type: 'game', labels: { ru: 'Аркады', en: 'Arcade', tr: 'Arcade' } },
  { id: 'GAME_BOARD', slug: 'board', type: 'game', labels: { ru: 'Настольные', en: 'Board', tr: 'Masa oyunları' } },
  { id: 'GAME_CARD', slug: 'card', type: 'game', labels: { ru: 'Карточные', en: 'Card', tr: 'Kart oyunları' } },
  { id: 'GAME_CASINO', slug: 'casino', type: 'game', labels: { ru: 'Казино', en: 'Casino', tr: 'Kumarhane' } },
  { id: 'GAME_CASUAL', slug: 'casual', type: 'game', labels: { ru: 'Казуальные', en: 'Casual', tr: 'Sıradan' } },
  { id: 'GAME_EDUCATIONAL', slug: 'educational-games', type: 'game', labels: { ru: 'Обучающие игры', en: 'Educational', tr: 'Eğitici' } },
  { id: 'GAME_MUSIC', slug: 'music-games', type: 'game', labels: { ru: 'Музыкальные', en: 'Music', tr: 'Müzik' } },
  { id: 'GAME_PUZZLE', slug: 'puzzle', type: 'game', labels: { ru: 'Головоломки', en: 'Puzzle', tr: 'Bulmaca' } },
  { id: 'GAME_RACING', slug: 'racing', type: 'game', labels: { ru: 'Гонки', en: 'Racing', tr: 'Yarış' } },
  { id: 'GAME_ROLE_PLAYING', slug: 'role-playing', type: 'game', labels: { ru: 'Ролевые', en: 'Role playing', tr: 'Rol yapma' } },
  { id: 'GAME_SIMULATION', slug: 'simulation', type: 'game', labels: { ru: 'Симуляторы', en: 'Simulation', tr: 'Simülasyon' } },
  { id: 'GAME_SPORTS', slug: 'sports-games', type: 'game', labels: { ru: 'Спортивные игры', en: 'Sports', tr: 'Spor' } },
  { id: 'GAME_STRATEGY', slug: 'strategy', type: 'game', labels: { ru: 'Стратегии', en: 'Strategy', tr: 'Strateji' } },
  { id: 'GAME_TRIVIA', slug: 'trivia', type: 'game', labels: { ru: 'Викторины', en: 'Trivia', tr: 'Bilgi yarışması' } },
  { id: 'GAME_WORD', slug: 'word', type: 'game', labels: { ru: 'Словесные', en: 'Word', tr: 'Kelime' } },
  // Applications
  { id: 'ART_AND_DESIGN', slug: 'art-and-design', type: 'app', labels: { ru: 'Искусство и дизайн', en: 'Art & design', tr: 'Sanat ve tasarım' } },
  { id: 'BOOKS_AND_REFERENCE', slug: 'books', type: 'app', labels: { ru: 'Книги', en: 'Books & reference', tr: 'Kitaplar' } },
  { id: 'BUSINESS', slug: 'business', type: 'app', labels: { ru: 'Бизнес', en: 'Business', tr: 'İş' } },
  { id: 'COMMUNICATION', slug: 'communication', type: 'app', labels: { ru: 'Общение', en: 'Communication', tr: 'İletişim' } },
  { id: 'EDUCATION', slug: 'education', type: 'app', labels: { ru: 'Образование', en: 'Education', tr: 'Eğitim' } },
  { id: 'ENTERTAINMENT', slug: 'entertainment', type: 'app', labels: { ru: 'Развлечения', en: 'Entertainment', tr: 'Eğlence' } },
  { id: 'FINANCE', slug: 'finance', type: 'app', labels: { ru: 'Финансы', en: 'Finance', tr: 'Finans' } },
  { id: 'FOOD_AND_DRINK', slug: 'food-and-drink', type: 'app', labels: { ru: 'Еда и напитки', en: 'Food & drink', tr: 'Yiyecek ve içecek' } },
  { id: 'HEALTH_AND_FITNESS', slug: 'health', type: 'app', labels: { ru: 'Здоровье и фитнес', en: 'Health & fitness', tr: 'Sağlık ve fitness' } },
  { id: 'LIFESTYLE', slug: 'lifestyle', type: 'app', labels: { ru: 'Стиль жизни', en: 'Lifestyle', tr: 'Yaşam tarzı' } },
  { id: 'MAPS_AND_NAVIGATION', slug: 'maps', type: 'app', labels: { ru: 'Карты и навигация', en: 'Maps & navigation', tr: 'Haritalar' } },
  { id: 'MUSIC_AND_AUDIO', slug: 'music', type: 'app', labels: { ru: 'Музыка и аудио', en: 'Music & audio', tr: 'Müzik ve ses' } },
  { id: 'NEWS_AND_MAGAZINES', slug: 'news', type: 'app', labels: { ru: 'Новости и журналы', en: 'News & magazines', tr: 'Haberler' } },
  { id: 'PERSONALIZATION', slug: 'personalization', type: 'app', labels: { ru: 'Персонализация', en: 'Personalization', tr: 'Kişiselleştirme' } },
  { id: 'PHOTOGRAPHY', slug: 'photography', type: 'app', labels: { ru: 'Фотография', en: 'Photography', tr: 'Fotoğrafçılık' } },
  { id: 'PRODUCTIVITY', slug: 'productivity', type: 'app', labels: { ru: 'Продуктивность', en: 'Productivity', tr: 'Üretkenlik' } },
  { id: 'SHOPPING', slug: 'shopping', type: 'app', labels: { ru: 'Покупки', en: 'Shopping', tr: 'Alışveriş' } },
  { id: 'SOCIAL', slug: 'social', type: 'app', labels: { ru: 'Социальные сети', en: 'Social', tr: 'Sosyal' } },
  { id: 'SPORTS', slug: 'sports', type: 'app', labels: { ru: 'Спорт', en: 'Sports', tr: 'Spor' } },
  { id: 'TOOLS', slug: 'tools', type: 'app', labels: { ru: 'Инструменты', en: 'Tools', tr: 'Araçlar' } },
  { id: 'TRAVEL_AND_LOCAL', slug: 'travel', type: 'app', labels: { ru: 'Путешествия', en: 'Travel & local', tr: 'Seyahat' } },
  { id: 'VIDEO_PLAYERS', slug: 'video', type: 'app', labels: { ru: 'Видеоплееры', en: 'Video players', tr: 'Video oynatıcılar' } },
  { id: 'WEATHER', slug: 'weather', type: 'app', labels: { ru: 'Погода', en: 'Weather', tr: 'Hava durumu' } }
];

/** Fallback bucket for anything Google returns that is not in the taxonomy. */
export const FALLBACK_CATEGORY = {
  id: 'OTHER',
  slug: 'other',
  type: 'app',
  labels: { ru: 'Другое', en: 'Other', tr: 'Diğer' }
};

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function categoryById(id) {
  return byId.get(id) ?? FALLBACK_CATEGORY;
}

export function categoryBySlug(slug) {
  return bySlug.get(slug) ?? null;
}

export function categoriesByType(type) {
  return CATEGORIES.filter((c) => c.type === type);
}

/** Google sometimes reports a genreId we do not track; keep it addressable. */
export function isGameCategory(id) {
  return typeof id === 'string' && id.startsWith('GAME');
}
