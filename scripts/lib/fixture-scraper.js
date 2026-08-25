/**
 * Offline stand-in for google-play-scraper, used by `npm run smoke` and by CI
 * to exercise discovery.js / fetch-details.js without touching Google.
 *
 * Pass it with --client: node scripts/discovery.js --client ./scripts/lib/fixture-scraper.js
 *
 * It returns deterministic, obviously-fake records and deliberately fails on
 * one package id so the error path gets exercised too.
 */
const CATEGORY_IDS = {};
for (const key of [
  'GAME_ACTION', 'GAME_ADVENTURE', 'GAME_ARCADE', 'GAME_BOARD', 'GAME_CARD',
  'GAME_CASINO', 'GAME_CASUAL', 'GAME_EDUCATIONAL', 'GAME_MUSIC', 'GAME_PUZZLE',
  'GAME_RACING', 'GAME_ROLE_PLAYING', 'GAME_SIMULATION', 'GAME_SPORTS',
  'GAME_STRATEGY', 'GAME_TRIVIA', 'GAME_WORD', 'ART_AND_DESIGN',
  'BOOKS_AND_REFERENCE', 'BUSINESS', 'COMMUNICATION', 'EDUCATION',
  'ENTERTAINMENT', 'FINANCE', 'FOOD_AND_DRINK', 'HEALTH_AND_FITNESS',
  'LIFESTYLE', 'MAPS_AND_NAVIGATION', 'MUSIC_AND_AUDIO', 'NEWS_AND_MAGAZINES',
  'PERSONALIZATION', 'PHOTOGRAPHY', 'PRODUCTIVITY', 'SHOPPING', 'SOCIAL',
  'SPORTS', 'TOOLS', 'TRAVEL_AND_LOCAL', 'VIDEO_PLAYERS', 'WEATHER', 'FAMILY'
]) {
  CATEGORY_IDS[key] = key;
}

/** The one id that always fails, so error handling is covered by the smoke run. */
export const BROKEN_PACKAGE_ID = 'com.example.fixture.broken';

const NAMES = {
  ru: (n) => `Тестовое приложение ${n}`,
  en: (n) => `Fixture App ${n}`,
  tr: (n) => `Örnek Uygulama ${n}`
};

const seedOf = (value) => [...value].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

export async function list({ category: cat = 'GAME_PUZZLE', num = 50, country = 'ru' } = {}) {
  const results = [];
  for (let i = 0; i < num; i += 1) {
    results.push({
      appId: `com.example.fixture.${cat.toLowerCase()}.${country}${i}`,
      title: `${cat} ${country} ${i}`,
      developer: `Fixture Studio ${i % 5}`
    });
  }
  // Give the matrix some overlap so deduplication has something to do.
  results[0].appId = 'com.example.fixture.shared.one';
  if (num > 1) results[1].appId = BROKEN_PACKAGE_ID;
  return results;
}

export async function app({ appId, lang = 'en', country = 'ru' } = {}) {
  if (appId === BROKEN_PACKAGE_ID) {
    const error = new Error('App not found (404)');
    error.status = 404;
    throw error;
  }

  const seed = seedOf(appId);
  const isGame = appId.includes('game');
  const genreId = isGame ? 'GAME_PUZZLE' : 'TOOLS';

  return {
    appId,
    title: NAMES[lang]?.(seed % 1000) ?? NAMES.en(seed % 1000),
    summary: `Fixture summary for ${appId} in ${lang}.`,
    description: `Long fixture description for ${appId}. Not real store text.`,
    icon: `https://play-lh.googleusercontent.com/fixture-${seed % 97}`,
    screenshots: [
      `https://play-lh.googleusercontent.com/fixture-shot-${seed % 13}`,
      `https://play-lh.googleusercontent.com/fixture-shot-${(seed + 1) % 13}`
    ],
    score: 3 + (seed % 20) / 10,
    ratings: 1000 + (seed % 900000),
    size: `${20 + (seed % 200)}M`,
    androidVersion: '8.0',
    genre: isGame ? 'Puzzle' : 'Tools',
    genreId,
    developer: `Fixture Studio ${seed % 5}`,
    developerId: `Fixture+Studio+${seed % 5}`,
    contentRating: 'Everyone',
    version: `${1 + (seed % 5)}.${seed % 9}.0`,
    updated: Date.UTC(2026, seed % 12, 1 + (seed % 27)),
    free: true,
    url: `https://play.google.com/store/apps/details?id=${appId}&hl=${lang}&gl=${country}`
  };
}

export default { list, app, category: CATEGORY_IDS, collection: { TOP_FREE: 'TOP_FREE', TOP_PAID: 'TOP_PAID', GROSSING: 'GROSSING' } };
