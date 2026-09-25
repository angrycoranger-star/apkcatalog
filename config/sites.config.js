/**
 * Thematic sites. The one catalog is split into several independent sites,
 * each with its own domain and its own slice of the cards. A build picks its
 * site with SITE_ID; without it the build carries the whole catalog, exactly
 * as before the split.
 *
 * Every card belongs to exactly one site — `match` rules must not overlap, so
 * no page is published twice across domains. `npm run sites` prints the split
 * and fails if a card lands on zero or several sites.
 *
 * Languages stay a separate dimension: each site can still be built for any of
 * the LANGS (one Vercel project per site × language), on <lang>.<site domain>.
 *
 * `match` receives the raw record from data/*.json (before localization), so
 * it can look at `source` and `category`. Keep it dependency-free: this file is
 * shared by the Astro build and the Node.js scripts.
 */
import { isGameCategory } from './catalog.config.js';

/** Where a raw record came from: Google Play scrape, F-Droid, GitHub, owner. */
export function sourceOf(app) {
  if (app.source === 'fdroid' || app.source === 'github') return 'oss';
  if (app.source === 'owner') return 'owner';
  return 'play';
}

const isGame = (app) => isGameCategory(app.category);
const isOss = (app) => sourceOf(app) === 'oss';

export const SITES = {
  games: {
    match: (app) => isGame(app),
    labels: {
      ru: {
        'site.name': 'apk4orge Игры',
        'site.tagline': 'Каталог игр для Android',
        'site.description': 'Каталог Android-игр по жанрам: описания, рейтинги и ссылки на официальные источники загрузки.',
        'home.hero.title': 'Найдите игру для Android',
        'home.hero.subtitle': 'Игры по жанрам — от головоломок до стратегий, с описаниями и рейтингами.'
      },
      en: {
        'site.name': 'apk4orge Games',
        'site.tagline': 'Android games catalog',
        'site.description': 'A catalog of Android games by genre: descriptions, ratings and links to official download sources.',
        'home.hero.title': 'Find an Android game',
        'home.hero.subtitle': 'Games by genre, from puzzles to strategy, with descriptions and ratings.'
      },
      tr: {
        'site.name': 'apk4orge Oyunlar',
        'site.tagline': 'Android oyun kataloğu',
        'site.description': 'Türe göre Android oyunları kataloğu: açıklamalar, puanlar ve resmi indirme kaynaklarına bağlantılar.',
        'home.hero.title': 'Bir Android oyunu bulun',
        'home.hero.subtitle': 'Bulmacadan stratejiye türlere göre oyunlar, açıklamalar ve puanlarla.'
      },
      uz: {
        'site.name': 'apk4orge O‘yinlar',
        'site.tagline': 'Android o‘yinlar katalogi',
        'site.description': 'Janrlar bo‘yicha Android o‘yinlar katalogi: tavsiflar, reytinglar va rasmiy yuklab olish manbalariga havolalar.',
        'home.hero.title': 'Android o‘yinini toping',
        'home.hero.subtitle': 'Boshqotirmalardan strategiyalargacha janrlar bo‘yicha o‘yinlar, tavsif va reytinglar bilan.'
      }
    }
  },

  apps: {
    match: (app) => !isGame(app) && !isOss(app),
    labels: {
      ru: {
        'site.name': 'apk4orge Приложения',
        'site.tagline': 'Каталог приложений для Android',
        'site.description': 'Каталог Android-приложений по категориям: описания, рейтинги и ссылки на официальные источники загрузки.',
        'home.hero.title': 'Найдите приложение для Android',
        'home.hero.subtitle': 'Приложения по категориям — финансы, фото, покупки, навигация и другое.'
      },
      en: {
        'site.name': 'apk4orge Apps',
        'site.tagline': 'Android apps catalog',
        'site.description': 'A catalog of Android apps by category: descriptions, ratings and links to official download sources.',
        'home.hero.title': 'Find an Android app',
        'home.hero.subtitle': 'Apps by category: finance, photo, shopping, navigation and more.'
      },
      tr: {
        'site.name': 'apk4orge Uygulamalar',
        'site.tagline': 'Android uygulama kataloğu',
        'site.description': 'Kategoriye göre Android uygulamaları kataloğu: açıklamalar, puanlar ve resmi indirme kaynaklarına bağlantılar.',
        'home.hero.title': 'Bir Android uygulaması bulun',
        'home.hero.subtitle': 'Finans, fotoğraf, alışveriş, navigasyon ve daha fazlası — kategorilere göre uygulamalar.'
      },
      uz: {
        'site.name': 'apk4orge Ilovalar',
        'site.tagline': 'Android ilovalar katalogi',
        'site.description': 'Turkumlar bo‘yicha Android ilovalar katalogi: tavsiflar, reytinglar va rasmiy yuklab olish manbalariga havolalar.',
        'home.hero.title': 'Android ilovasini toping',
        'home.hero.subtitle': 'Moliya, foto, xaridlar, navigatsiya va boshqa turkumlar bo‘yicha ilovalar.'
      }
    }
  },

  'oss-tools': {
    match: (app) => !isGame(app) && isOss(app) && app.category === 'TOOLS',
    labels: {
      ru: {
        'site.name': 'apk4orge Open Tools',
        'site.tagline': 'Открытые утилиты для Android',
        'site.description': 'Каталог утилит для Android с открытым исходным кодом: системные инструменты, сеть, безопасность, модули.',
        'home.hero.title': 'Утилиты с открытым кодом',
        'home.hero.subtitle': 'Системные инструменты, сетевые утилиты и модули для Android — только open-source.'
      },
      en: {
        'site.name': 'apk4orge Open Tools',
        'site.tagline': 'Open-source Android utilities',
        'site.description': 'A catalog of open-source Android utilities: system tools, networking, security and modules.',
        'home.hero.title': 'Open-source utilities',
        'home.hero.subtitle': 'System tools, network utilities and modules for Android, open-source only.'
      },
      tr: {
        'site.name': 'apk4orge Open Tools',
        'site.tagline': 'Açık kaynaklı Android araçları',
        'site.description': 'Açık kaynaklı Android araçları kataloğu: sistem araçları, ağ, güvenlik ve modüller.',
        'home.hero.title': 'Açık kaynaklı araçlar',
        'home.hero.subtitle': 'Android için sistem araçları, ağ araçları ve modüller — yalnızca açık kaynak.'
      },
      uz: {
        'site.name': 'apk4orge Open Tools',
        'site.tagline': 'Ochiq manbali Android vositalari',
        'site.description': 'Ochiq manbali Android vositalari katalogi: tizim vositalari, tarmoq, xavfsizlik va modullar.',
        'home.hero.title': 'Ochiq manbali vositalar',
        'home.hero.subtitle': 'Android uchun tizim vositalari, tarmoq utilitalari va modullar — faqat ochiq manba.'
      }
    }
  },

  'oss-apps': {
    match: (app) => !isGame(app) && isOss(app) && app.category !== 'TOOLS',
    labels: {
      ru: {
        'site.name': 'apk4orge Open Apps',
        'site.tagline': 'Приложения с открытым кодом для Android',
        'site.description': 'Каталог Android-приложений с открытым исходным кодом: мессенджеры, плееры, карты, обучение и другое.',
        'home.hero.title': 'Приложения с открытым кодом',
        'home.hero.subtitle': 'Мессенджеры, плееры, карты, книги и другие open-source приложения для Android.'
      },
      en: {
        'site.name': 'apk4orge Open Apps',
        'site.tagline': 'Open-source Android apps',
        'site.description': 'A catalog of open-source Android apps: messengers, players, maps, learning and more.',
        'home.hero.title': 'Open-source apps',
        'home.hero.subtitle': 'Messengers, players, maps, books and other open-source apps for Android.'
      },
      tr: {
        'site.name': 'apk4orge Open Apps',
        'site.tagline': 'Açık kaynaklı Android uygulamaları',
        'site.description': 'Açık kaynaklı Android uygulamaları kataloğu: mesajlaşma, oynatıcılar, haritalar, eğitim ve daha fazlası.',
        'home.hero.title': 'Açık kaynaklı uygulamalar',
        'home.hero.subtitle': 'Android için mesajlaşma, oynatıcılar, haritalar, kitaplar ve diğer açık kaynaklı uygulamalar.'
      },
      uz: {
        'site.name': 'apk4orge Open Apps',
        'site.tagline': 'Ochiq manbali Android ilovalari',
        'site.description': 'Ochiq manbali Android ilovalari katalogi: messenjerlar, pleyerlar, xaritalar, ta’lim va boshqalar.',
        'home.hero.title': 'Ochiq manbali ilovalar',
        'home.hero.subtitle': 'Android uchun messenjerlar, pleyerlar, xaritalar, kitoblar va boshqa ochiq manbali ilovalar.'
      }
    }
  }
};

export const SITE_IDS = Object.keys(SITES);

/** The site a build targets, or null for the whole-catalog build. */
export function resolveSiteId(value) {
  return value && SITES[value] ? value : null;
}

/** Filter for raw records: everything when no site is selected. */
export function siteMatcher(siteId) {
  const site = siteId ? SITES[siteId] : null;
  return site ? site.match : () => true;
}

/** Every site a raw record matches — used to check the split is a partition. */
export function sitesOf(app) {
  return SITE_IDS.filter((id) => SITES[id].match(app));
}
