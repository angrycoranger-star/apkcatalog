#!/usr/bin/env node
/**
 * Writes a small demo dataset so the site can be built and reviewed before the
 * collectors have ever run. Everything it emits is fictional: the package ids
 * belong to the reserved com.example namespace, the media are local SVG
 * placeholders and the numbers are made up. `sample: true` marks each record,
 * and the layout shows a banner while any sample record is present.
 *
 * Running `npm run fetch-details` replaces this file with real collected data.
 *
 * Usage: node scripts/seed-sample-data.js [--force]
 */
import { writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPS_PATH = path.join(ROOT, 'data', 'apps.json');
const META_PATH = path.join(ROOT, 'data', 'apps.meta.json');

const CONCEPTS = [
  { slug: 'nova-messenger', category: 'COMMUNICATION', dev: 'Nova Labs', rating: 4.6, count: 812_400, size: '38 MB',
    ru: ['Nova Мессенджер', 'Мессенджер со сквозным шифрованием, групповыми чатами до 500 человек и звонками. Сообщения синхронизируются между телефоном и планшетом.'],
    en: ['Nova Messenger', 'An end-to-end encrypted messenger with group chats of up to 500 people and voice calls. Conversations stay in sync across phone and tablet.'],
    tr: ['Nova Mesajlaşma', 'Uçtan uca şifreli, 500 kişiye kadar grup sohbeti ve sesli arama sunan bir mesajlaşma uygulaması. Sohbetler telefon ve tablet arasında eşitlenir.'] },
  { slug: 'lumen-photo-editor', category: 'PHOTOGRAPHY', dev: 'Lumen Studio', rating: 4.4, count: 431_900, size: '72 MB',
    ru: ['Lumen Фоторедактор', 'Редактор с ручной цветокоррекцией, пресетами и удалением лишних объектов. Работает без подписки для базового набора инструментов.'],
    en: ['Lumen Photo Editor', 'A photo editor with manual color grading, presets and object removal. The core toolset works without a subscription.'],
    tr: ['Lumen Fotoğraf Düzenleyici', 'Manuel renk düzenleme, hazır ayarlar ve nesne silme sunan bir fotoğraf düzenleyici. Temel araçlar abonelik olmadan çalışır.'] },
  { slug: 'ledgerly-budget', category: 'FINANCE', dev: 'Ledgerly', rating: 4.7, count: 208_300, size: '24 MB',
    ru: ['Ledgerly Бюджет', 'Учёт расходов с категориями, лимитами и отчётами по месяцам. Данные можно хранить локально без привязки к аккаунту.'],
    en: ['Ledgerly Budget', 'Expense tracking with categories, spending limits and monthly reports. Data can stay on the device with no account required.'],
    tr: ['Ledgerly Bütçe', 'Kategoriler, harcama limitleri ve aylık raporlarla gider takibi. Veriler hesap gerekmeden cihazda tutulabilir.'] },
  { slug: 'trailmap-navigator', category: 'MAPS_AND_NAVIGATION', dev: 'Trailmap', rating: 4.5, count: 156_700, size: '96 MB',
    ru: ['Trailmap Навигатор', 'Офлайн-карты для пеших и велосипедных маршрутов с профилем высот. Треки записываются и экспортируются в GPX.'],
    en: ['Trailmap Navigator', 'Offline maps for hiking and cycling routes with elevation profiles. Tracks are recorded and exported as GPX.'],
    tr: ['Trailmap Navigasyon', 'Yürüyüş ve bisiklet rotaları için yükseklik profilli çevrimdışı haritalar. Rotalar kaydedilir ve GPX olarak dışa aktarılır.'] },
  { slug: 'focusflow-tasks', category: 'PRODUCTIVITY', dev: 'Focusflow', rating: 4.3, count: 97_200, size: '19 MB',
    ru: ['Focusflow Задачи', 'Планировщик задач с таймером фокуса и повторяющимися делами. Виджет показывает ближайшие пункты на сегодня.'],
    en: ['Focusflow Tasks', 'A task planner with a focus timer and recurring to-dos. A home-screen widget shows what is due today.'],
    tr: ['Focusflow Görevler', 'Odak zamanlayıcısı ve tekrarlayan görevler içeren bir görev planlayıcı. Widget bugün yapılacakları gösterir.'] },
  { slug: 'pulse-fitness', category: 'HEALTH_AND_FITNESS', dev: 'Pulse Health', rating: 4.2, count: 143_800, size: '58 MB',
    ru: ['Pulse Фитнес', 'Тренировки дома и в зале с подсчётом подходов и историей прогресса. Есть программы для начинающих на 4 недели.'],
    en: ['Pulse Fitness', 'Home and gym workouts with set tracking and a progress history. Includes four-week beginner programmes.'],
    tr: ['Pulse Fitness', 'Set takibi ve ilerleme geçmişiyle ev ve salon antrenmanları. Yeni başlayanlar için dört haftalık programlar içerir.'] },
  { slug: 'kite-weather', category: 'WEATHER', dev: 'Kite Apps', rating: 4.5, count: 264_100, size: '31 MB',
    ru: ['Kite Погода', 'Почасовой прогноз, карта осадков и предупреждения о резкой смене погоды. Уведомления настраиваются по времени суток.'],
    en: ['Kite Weather', 'Hourly forecasts, a precipitation map and alerts for sharp weather changes. Notifications can be scheduled by time of day.'],
    tr: ['Kite Hava Durumu', 'Saatlik tahmin, yağış haritası ve ani hava değişimi uyarıları. Bildirimler günün saatine göre ayarlanabilir.'] },
  { slug: 'shelfmark-reader', category: 'BOOKS_AND_REFERENCE', dev: 'Shelfmark', rating: 4.6, count: 88_400, size: '27 MB',
    ru: ['Shelfmark Читалка', 'Читалка EPUB и FB2 с ночной темой, закладками и синхронизацией позиции чтения между устройствами.'],
    en: ['Shelfmark Reader', 'An EPUB and FB2 reader with a night theme, bookmarks and reading-position sync across devices.'],
    tr: ['Shelfmark Okuyucu', 'Gece teması, yer imleri ve cihazlar arası okuma konumu eşitlemesi olan EPUB ve FB2 okuyucu.'] },
  { slug: 'cartline-shopping', category: 'SHOPPING', dev: 'Cartline', rating: 4.1, count: 312_500, size: '45 MB',
    ru: ['Cartline Покупки', 'Сравнение цен в магазинах рядом и списки покупок для всей семьи. Штрихкоды сканируются камерой.'],
    en: ['Cartline Shopping', 'Price comparison across nearby stores plus shared family shopping lists. Barcodes scan with the camera.'],
    tr: ['Cartline Alışveriş', 'Yakındaki mağazalarda fiyat karşılaştırma ve aile için ortak alışveriş listeleri. Barkodlar kamerayla taranır.'] },
  { slug: 'toolkit-utilities', category: 'TOOLS', dev: 'Toolkit Dev', rating: 4.4, count: 176_600, size: '15 MB',
    ru: ['Toolkit Утилиты', 'Набор из линейки, уровня, шумомера и конвертера величин в одном приложении. Работает без доступа к сети.'],
    en: ['Toolkit Utilities', 'A ruler, spirit level, sound meter and unit converter bundled in one app. Works with no network access.'],
    tr: ['Toolkit Araçlar', 'Cetvel, su terazisi, ses ölçer ve birim dönüştürücüyü tek uygulamada toplar. Ağ erişimi olmadan çalışır.'] },
  { slug: 'canvas-themes', category: 'PERSONALIZATION', dev: 'Canvas Team', rating: 4.0, count: 64_900, size: '41 MB',
    ru: ['Canvas Темы', 'Обои, наборы иконок и виджеты в едином стиле. Тема применяется к экрану блокировки и рабочему столу сразу.'],
    en: ['Canvas Themes', 'Wallpapers, icon packs and widgets in a single visual style. A theme applies to the lock screen and home screen at once.'],
    tr: ['Canvas Temalar', 'Tek bir görsel stilde duvar kağıtları, simge paketleri ve widget\'lar. Tema kilit ve ana ekrana birlikte uygulanır.'] },
  { slug: 'streamside-player', category: 'VIDEO_PLAYERS', dev: 'Streamside', rating: 4.3, count: 121_000, size: '35 MB',
    ru: ['Streamside Плеер', 'Плеер с поддержкой большинства кодеков, внешних субтитров и жестов управления яркостью и громкостью.'],
    en: ['Streamside Player', 'A player covering most codecs, external subtitles and swipe gestures for brightness and volume.'],
    tr: ['Streamside Oynatıcı', 'Çoğu kodeği, harici altyazıları ve parlaklık ile ses için kaydırma hareketlerini destekleyen oynatıcı.'] },
  { slug: 'stellar-drift', category: 'GAME_ARCADE', dev: 'Bluebox Games', rating: 4.5, count: 528_300, size: '112 MB',
    ru: ['Stellar Drift', 'Аркада с бесконечным полётом сквозь пояса астероидов. Управление в одно касание, корабли открываются за очки.'],
    en: ['Stellar Drift', 'An endless arcade flight through asteroid belts. One-touch controls, with ships unlocked by score.'],
    tr: ['Stellar Drift', 'Asteroit kuşakları arasında sonsuz bir arcade uçuşu. Tek dokunuşla kontrol, gemiler puanla açılır.'] },
  { slug: 'tile-quest', category: 'GAME_PUZZLE', dev: 'Roundtable Studio', rating: 4.7, count: 964_100, size: '87 MB',
    ru: ['Tile Quest', 'Головоломка на совпадение плиток с 500 уровнями и режимом без таймера. Прогресс сохраняется офлайн.'],
    en: ['Tile Quest', 'A tile-matching puzzle with 500 levels and a no-timer mode. Progress is saved offline.'],
    tr: ['Tile Quest', '500 bölüm ve zamanlayıcısız mod sunan bir eşleştirme bulmacası. İlerleme çevrimdışı kaydedilir.'] },
  { slug: 'apex-circuit', category: 'GAME_RACING', dev: 'Redline Interactive', rating: 4.2, count: 377_800, size: '640 MB',
    ru: ['Apex Circuit', 'Гонки по кольцевым трассам с настройкой подвески и коробки передач. Есть заезды по сети на четверых.'],
    en: ['Apex Circuit', 'Circuit racing with suspension and gearbox tuning. Includes four-player online races.'],
    tr: ['Apex Circuit', 'Süspansiyon ve şanzıman ayarlı pist yarışları. Dört kişilik çevrimiçi yarışlar içerir.'] },
  { slug: 'kingdom-lanes', category: 'GAME_STRATEGY', dev: 'Ironwood Games', rating: 4.4, count: 289_200, size: '420 MB',
    ru: ['Kingdom Lanes', 'Пошаговая стратегия с обороной линий и развитием замка. Кампания рассчитана примерно на 20 часов.'],
    en: ['Kingdom Lanes', 'A turn-based strategy about holding lanes and upgrading a castle. The campaign runs roughly 20 hours.'],
    tr: ['Kingdom Lanes', 'Hatları savunma ve kale geliştirme üzerine sıra tabanlı strateji. Kampanya yaklaşık 20 saat sürer.'] },
  { slug: 'farm-harbor', category: 'GAME_SIMULATION', dev: 'Sunfield Studio', rating: 4.3, count: 645_400, size: '310 MB',
    ru: ['Farm Harbor', 'Симулятор фермы у моря: посевы, рыбалка и обмен товарами с соседями. Играется короткими сессиями.'],
    en: ['Farm Harbor', 'A seaside farm simulator with crops, fishing and trading with neighbours. Built for short sessions.'],
    tr: ['Farm Harbor', 'Ekinler, balıkçılık ve komşularla takas içeren deniz kenarı çiftlik simülasyonu. Kısa oturumlar için tasarlandı.'] },
  { slug: 'blade-of-ember', category: 'GAME_ACTION', dev: 'Emberforge', rating: 4.1, count: 402_700, size: '780 MB',
    ru: ['Blade of Ember', 'Экшен от третьего лица с комбо-боями и открытыми локациями. Управление адаптируется под геймпад.'],
    en: ['Blade of Ember', 'A third-person action game with combo combat and open areas. Controls adapt to a gamepad.'],
    tr: ['Blade of Ember', 'Kombo dövüşleri ve açık alanlar içeren üçüncü şahıs aksiyon oyunu. Kontroller oyun kumandasına uyum sağlar.'] },
  { slug: 'word-atlas', category: 'GAME_WORD', dev: 'Paper Owl', rating: 4.6, count: 187_500, size: '64 MB',
    ru: ['Word Atlas', 'Словесная игра с ежедневными заданиями на трёх языках. Подсказки не требуют покупок.'],
    en: ['Word Atlas', 'A word game with daily challenges in three languages. Hints require no purchases.'],
    tr: ['Word Atlas', 'Üç dilde günlük görevler sunan bir kelime oyunu. İpuçları satın alma gerektirmez.'] },
  { slug: 'card-vault', category: 'GAME_CARD', dev: 'Roundtable Studio', rating: 4.0, count: 73_600, size: '128 MB',
    ru: ['Card Vault', 'Коллекционная карточная игра с сезонными наборами и матчами один на один. Колоды собираются без ставок.'],
    en: ['Card Vault', 'A collectible card game with seasonal sets and one-on-one matches. Decks are built without wagering.'],
    tr: ['Card Vault', 'Sezonluk setler ve birebir maçlar içeren koleksiyon kart oyunu. Desteler bahis olmadan kurulur.'] },
  { slug: 'sky-blocks', category: 'GAME_CASUAL', dev: 'Bluebox Games', rating: 4.4, count: 731_200, size: '54 MB',
    ru: ['Sky Blocks', 'Казуальный тетрис-подобный конструктор с режимом на время и спокойным режимом без проигрыша.'],
    en: ['Sky Blocks', 'A casual block-stacking game with a timed mode and a relaxed mode you cannot lose.'],
    tr: ['Sky Blocks', 'Zamanlı mod ve kaybedilmeyen sakin mod sunan sıradan blok dizme oyunu.'] },
  { slug: 'chess-parlor', category: 'GAME_BOARD', dev: 'Ironwood Games', rating: 4.8, count: 244_900, size: '48 MB',
    ru: ['Chess Parlor', 'Шахматы с разбором партий, задачами и игрой против движка десяти уровней сложности.'],
    en: ['Chess Parlor', 'Chess with game analysis, puzzles and an engine offering ten difficulty levels.'],
    tr: ['Chess Parlor', 'Oyun analizi, bulmacalar ve on zorluk seviyeli motorla satranç.'] },
  { slug: 'echo-runner', category: 'GAME_ADVENTURE', dev: 'Paper Owl', rating: 4.5, count: 158_300, size: '520 MB',
    ru: ['Echo Runner', 'Приключение с исследованием пещер и головоломками на эхолокацию. Сюжет проходится за один вечер.'],
    en: ['Echo Runner', 'An adventure about exploring caves and solving echolocation puzzles. The story fits one evening.'],
    tr: ['Echo Runner', 'Mağara keşfi ve yankı bulmacaları üzerine bir macera. Hikâye bir akşamda bitiyor.'] },
  { slug: 'social-loop', category: 'SOCIAL', dev: 'Loop Networks', rating: 3.9, count: 519_400, size: '66 MB',
    ru: ['Social Loop', 'Лента коротких заметок по интересам и локальные сообщества. Подписки настраиваются по темам, а не по людям.'],
    en: ['Social Loop', 'A feed of short notes by interest plus local communities. You follow topics rather than people.'],
    tr: ['Social Loop', 'İlgi alanına göre kısa not akışı ve yerel topluluklar. Kişileri değil konuları takip edersiniz.'] }
];

const ICONS = [
  '/img/sample/icon-1.svg',
  '/img/sample/icon-2.svg',
  '/img/sample/icon-3.svg',
  '/img/sample/icon-4.svg',
  '/img/sample/icon-5.svg',
  '/img/sample/icon-6.svg'
];

const SHOTS = [
  '/img/sample/shot-1.svg',
  '/img/sample/shot-2.svg',
  '/img/sample/shot-3.svg',
  '/img/sample/shot-4.svg'
];

function build() {
  const now = new Date();
  return CONCEPTS.map((c, index) => {
    const packageId = `com.example.${c.slug.replace(/-/g, '')}`;
    const updated = new Date(now.getTime() - index * 36 * 60 * 60 * 1000);
    return {
      slug: c.slug,
      package_id: packageId,
      icon_url: ICONS[index % ICONS.length],
      screenshots: [SHOTS[index % 4], SHOTS[(index + 1) % 4], SHOTS[(index + 2) % 4]],
      category: c.category,
      rating: c.rating,
      ratings_count: c.count,
      size: c.size,
      version: `${1 + (index % 4)}.${index % 10}.0`,
      installs: '1 000 000+',
      developer: c.dev,
      content_rating: c.category.startsWith('GAME') ? 'Everyone' : 'Everyone',
      translations: {
        ru: { name: c.ru[0], summary: c.ru[1] },
        en: { name: c.en[0], summary: c.en[1] },
        tr: { name: c.tr[0], summary: c.tr[1] }
      },
      google_play_url: `https://play.google.com/store/apps/details?id=${packageId}`,
      updated: updated.toISOString(),
      added_at: updated.toISOString(),
      sample: true
    };
  });
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

const force = process.argv.includes('--force');
if ((await exists(APPS_PATH)) && !force) {
  console.log('data/apps.json already exists — pass --force to overwrite it with sample data.');
  process.exit(0);
}

const apps = build();
await writeFile(APPS_PATH, `${JSON.stringify(apps, null, 2)}\n`, 'utf8');
await writeFile(
  META_PATH,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: 'seed-sample-data.js',
      sample: true,
      count: apps.length,
      languages: ['ru', 'en', 'tr']
    },
    null,
    2
  )}\n`,
  'utf8'
);
console.log(`Wrote ${apps.length} sample records to data/apps.json`);
