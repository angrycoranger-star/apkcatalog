/**
 * Card summaries.
 *
 * The catalog never republishes a developer's store description. Two ways to
 * get an original 2-3 sentence blurb per language:
 *
 *   1. composeSummary() — the default. Writes from structured facts only
 *      (kind, genre, developer, rating, installs, size, age rating). Because
 *      it never reads the store text, it cannot paraphrase it. Sentence
 *      patterns are picked from a stable hash of the package id so the corpus
 *      does not read like one sentence repeated a thousand times.
 *
 *   2. summarizeWithClaude() — opt-in via --llm. Sends the same facts plus the
 *      store text as background and asks for an independent summary. Better
 *      copy, costs money, needs ANTHROPIC_API_KEY.
 */

/** FNV-1a: small, stable across runs, good enough to spread pattern choices. */
function hash(value) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const pick = (list, seed) => list[(seed >>> 0) % list.length];

function tidyInstalls(installs) {
  return String(installs ?? '').replace(/\+$/, '').trim();
}

const PATTERNS = {
  ru: {
    kind: (isGame) => (isGame ? 'Игра' : 'Приложение'),
    kindLower: (isGame) => (isGame ? 'игра' : 'приложение'),
    subject: (name, isGame, category) =>
      isGame ? `игра в жанре «${category}»` : `приложение категории «${category}»`,
    opening: [
      (f) => `${f.kind} «${f.name}» относится к разделу «${f.category}».`,
      (f) => `«${f.name}» — ${f.subject} от разработчика ${f.developer}.`,
      (f) => `${f.kind} «${f.name}» от ${f.developer} входит в раздел «${f.category}».`,
      (f) => `В каталоге — ${f.subject} под названием «${f.name}».`
    ],
    author: [
      (f) => `Разработчик — ${f.developer}.`,
      (f) => `Издатель: ${f.developer}.`,
      (f) => `За выпуск отвечает ${f.developer}.`
    ],
    rating: [
      (f) => `Средняя оценка в Google Play — ${f.rating} из 5 по ${f.ratingsCount} отзывам.`,
      (f) => `Пользователи Google Play выставили оценку ${f.rating} из 5 (${f.ratingsCount} отзывов).`,
      (f) => `Рейтинг магазина — ${f.rating} из 5 на основе ${f.ratingsCount} оценок.`
    ],
    ratingShort: [
      (f) => `Оценка в Google Play — ${f.rating} из 5.`,
      (f) => `Средний балл в магазине — ${f.rating} из 5.`
    ],
    noRating: [
      () => 'Оценок в Google Play пока накоплено немного.',
      () => 'Рейтинг в магазине ещё формируется.'
    ],
    facts: {
      both: [
        (f) => `Число установок превышает ${f.installs}, размер загрузки — ${f.size}.`,
        (f) => `Установок: более ${f.installs}; занимает около ${f.size}.`
      ],
      installs: [
        (f) => `Количество установок превышает ${f.installs}.`,
        (f) => `Загрузок в магазине — более ${f.installs}.`
      ],
      size: [
        (f) => `Размер загрузки — около ${f.size}.`,
        (f) => `Дистрибутив занимает примерно ${f.size}.`
      ],
      none: [
        () => 'Страница обновляется по мере появления новых данных в Google Play.'
      ]
    },
    age: [
      (f) => `Возрастная категория — ${f.contentRating}.`,
      (f) => `Возрастной рейтинг: ${f.contentRating}.`
    ]
  },

  en: {
    kind: (isGame) => (isGame ? 'Game' : 'App'),
    kindLower: (isGame) => (isGame ? 'game' : 'app'),
    subject: (name, isGame, category) =>
      isGame ? `an Android game in the ${category} genre` : `an Android app in the ${category} category`,
    opening: [
      (f) => `${f.name} is ${f.subject}.`,
      (f) => `${f.name} — ${f.subject} published by ${f.developer}.`,
      (f) => `Listed under ${f.category}, ${f.name} is an Android ${f.kindLower}.`,
      (f) => `In the ${f.category} section: ${f.name}, by ${f.developer}.`
    ],
    author: [
      (f) => `It is published by ${f.developer}.`,
      (f) => `Developer: ${f.developer}.`,
      (f) => `${f.developer} maintains the listing.`
    ],
    rating: [
      (f) => `Google Play users rate it ${f.rating} out of 5 across ${f.ratingsCount} reviews.`,
      (f) => `The store rating is ${f.rating} of 5 from ${f.ratingsCount} ratings.`,
      (f) => `It holds ${f.rating} out of 5 on Google Play (${f.ratingsCount} reviews).`
    ],
    ratingShort: [
      (f) => `Its Google Play rating is ${f.rating} out of 5.`,
      (f) => `The store score is ${f.rating} of 5.`
    ],
    noRating: [
      () => 'It has not gathered many Google Play ratings yet.',
      () => 'The store rating is still taking shape.'
    ],
    facts: {
      both: [
        (f) => `Installs are past ${f.installs} and the download weighs about ${f.size}.`,
        (f) => `More than ${f.installs} installs; the download is roughly ${f.size}.`
      ],
      installs: [
        (f) => `Installs are past ${f.installs}.`,
        (f) => `The listing reports more than ${f.installs} installs.`
      ],
      size: [
        (f) => `The download weighs about ${f.size}.`,
        (f) => `Expect a download of roughly ${f.size}.`
      ],
      none: [
        () => 'This page refreshes as new Google Play data arrives.'
      ]
    },
    age: [
      (f) => `Content rating: ${f.contentRating}.`,
      (f) => `Age rating is ${f.contentRating}.`
    ]
  },

  tr: {
    kind: (isGame) => (isGame ? 'Oyun' : 'Uygulama'),
    kindLower: (isGame) => (isGame ? 'oyunu' : 'uygulaması'),
    subject: (name, isGame, category) =>
      isGame ? `${category} türünde bir Android oyunu` : `${category} kategorisinde bir Android uygulaması`,
    opening: [
      (f) => `${f.name} — ${f.subject}.`,
      (f) => `${f.name}: ${f.subject}.`,
      (f) => `Katalogda yer alan ${f.subject}: ${f.name}.`,
      (f) => `${f.name} — Android için bir ${f.category} ${f.kindLower}.`
    ],
    author: [
      (f) => `Geliştirici: ${f.developer}.`,
      (f) => `Yayıncı: ${f.developer}.`,
      (f) => `Kaydı ${f.developer} yönetiyor.`
    ],
    rating: [
      (f) => `Google Play puanı 5 üzerinden ${f.rating} (${f.ratingsCount} değerlendirme).`,
      (f) => `Mağaza puanı: 5 üzerinden ${f.rating}, toplam ${f.ratingsCount} değerlendirme.`,
      (f) => `Kullanıcı puanı 5 üzerinden ${f.rating}; değerlendirme sayısı ${f.ratingsCount}.`
    ],
    ratingShort: [
      (f) => `Google Play puanı: 5 üzerinden ${f.rating}.`,
      (f) => `Mağaza puanı 5 üzerinden ${f.rating}.`
    ],
    noRating: [
      () => 'Google Play puanı henüz yeterince oluşmadı.',
      () => 'Mağaza puanı hâlâ şekilleniyor.'
    ],
    facts: {
      both: [
        (f) => `Yükleme sayısı ${f.installs} üzerinde, indirme boyutu yaklaşık ${f.size}.`,
        (f) => `${f.installs} üzerinde yükleme; indirme boyutu ${f.size} civarında.`
      ],
      installs: [
        (f) => `Yükleme sayısı ${f.installs} üzerinde.`,
        (f) => `Mağaza ${f.installs} üzerinde yükleme bildiriyor.`
      ],
      size: [
        (f) => `İndirme boyutu yaklaşık ${f.size}.`,
        (f) => `Dosya boyutu ${f.size} civarında.`
      ],
      none: [
        () => 'Bu sayfa yeni Google Play verileri geldikçe güncellenir.'
      ]
    },
    age: [
      (f) => `İçerik derecelendirmesi: ${f.contentRating}.`,
      (f) => `Yaş derecelendirmesi: ${f.contentRating}.`
    ]
  },
  uz: {
    kind: (isGame) => (isGame ? 'O‘yin' : 'Ilova'),
    kindLower: (isGame) => (isGame ? 'o‘yini' : 'ilovasi'),
    subject: (name, isGame, category) =>
      isGame ? `${category} turkumidagi Android o‘yini` : `${category} turkumidagi Android ilovasi`,
    opening: [
      (f) => `${f.name} — ${f.subject}.`,
      (f) => `${f.name}: ${f.subject}.`,
      (f) => `Katalogning «${f.category}» bo‘limida: ${f.name}.`,
      (f) => `${f.kind}: ${f.name}, ${f.subject}.`
    ],
    author: [
      (f) => `Dasturchi: ${f.developer}.`,
      (f) => `Nashriyotchi: ${f.developer}.`,
      (f) => `Yozuvni ${f.developer} yuritadi.`
    ],
    rating: [
      (f) => `Google Play reytingi 5 balldan ${f.rating} (${f.ratingsCount} ta baho).`,
      (f) => `Do‘kondagi bahosi: 5 balldan ${f.rating}, jami ${f.ratingsCount} ta baho.`,
      (f) => `Foydalanuvchilar bahosi 5 balldan ${f.rating}; baholar soni ${f.ratingsCount}.`
    ],
    ratingShort: [
      (f) => `Google Play reytingi: 5 balldan ${f.rating}.`,
      (f) => `Do‘kondagi o‘rtacha ball: 5 balldan ${f.rating}.`
    ],
    noRating: [
      () => 'Google Play’da baholar hali yetarlicha to‘planmagan.',
      () => 'Do‘kondagi reyting hali shakllanmoqda.'
    ],
    facts: {
      both: [
        (f) => `O‘rnatishlar soni ${f.installs} dan oshgan, yuklab olish hajmi taxminan ${f.size}.`,
        (f) => `${f.installs} dan ortiq o‘rnatish; hajmi ${f.size} atrofida.`
      ],
      installs: [
        (f) => `O‘rnatishlar soni ${f.installs} dan oshgan.`,
        (f) => `Do‘kon ${f.installs} dan ortiq o‘rnatishni ko‘rsatmoqda.`
      ],
      size: [
        (f) => `Yuklab olish hajmi taxminan ${f.size}.`,
        (f) => `Fayl hajmi ${f.size} atrofida.`
      ],
      none: [
        () => 'Bu sahifa Google Play’dan yangi ma’lumot kelgani sari yangilanadi.'
      ]
    },
    age: [
      (f) => `Kontent reytingi: ${f.contentRating}.`,
      (f) => `Yosh chegarasi: ${f.contentRating}.`
    ]
  }
};

/**
 * Build an original 2-3 sentence summary from facts alone.
 * `facts` needs: name, developer, categoryLabel, isGame, rating, ratingsCount,
 * installs, size, contentRating, packageId.
 */
export function composeSummary(facts, lang) {
  const pattern = PATTERNS[lang] ?? PATTERNS.en;
  const seed = hash(`${facts.packageId}:${lang}`);

  const values = {
    name: facts.name,
    developer: facts.developer || '—',
    category: facts.categoryLabel,
    kind: pattern.kind(facts.isGame),
    kindLower: pattern.kindLower(facts.isGame),
    subject: pattern.subject(facts.name, facts.isGame, facts.categoryLabel),
    rating: typeof facts.rating === 'number' ? facts.rating.toFixed(1) : null,
    ratingsCount:
      typeof facts.ratingsCount === 'number' && facts.ratingsCount > 0
        ? facts.ratingsCount.toLocaleString(lang)
        : null,
    installs: tidyInstalls(facts.installs),
    size: facts.size,
    contentRating: facts.contentRating
  };

  const sentences = [pick(pattern.opening, seed)(values)];

  // The opening variants that already name the developer make a second
  // mention redundant, so only add one when it is still missing.
  if (values.developer !== '—' && !sentences[0].includes(values.developer)) {
    sentences.push(pick(pattern.author, seed >>> 3)(values));
  }

  if (values.rating && values.ratingsCount) {
    sentences.push(pick(pattern.rating, seed >>> 5)(values));
  } else if (values.rating) {
    sentences.push(pick(pattern.ratingShort, seed >>> 5)(values));
  } else {
    sentences.push(pick(pattern.noRating, seed >>> 5)(values));
  }

  if (sentences.length < 3) {
    const bucket =
      values.installs && values.size
        ? pattern.facts.both
        : values.installs
          ? pattern.facts.installs
          : values.size
            ? pattern.facts.size
            : values.contentRating
              ? pattern.age
              : pattern.facts.none;
    sentences.push(pick(bucket, seed >>> 7)(values));
  }

  return sentences.slice(0, 3).join(' ');
}

const SYSTEM_PROMPT = `You write short catalog blurbs for an independent Android app directory.

Rules:
- Write 2-3 complete sentences describing what the app is for and who it suits.
- Write from your own understanding of the app's purpose. Never translate, paraphrase, or restructure the developer's store text sentence by sentence, and never reuse its distinctive phrases, slogans, or feature lists verbatim.
- Stay factual and neutral. No marketing superlatives, no invented features, no claims about price, safety, or ranking that the facts do not support.
- Never mention downloading an APK. This catalog links to Google Play only.
- Return only the requested JSON.`;

/**
 * Ask Claude for a summary per language in one call.
 * Returns { ru: string, en: string, tr: string } or null when unavailable.
 */
export async function summarizeWithClaude({ facts, storeText, langs, client, model = 'claude-opus-5' }) {
  const languageNames = { ru: 'Russian', en: 'English', tr: 'Turkish', uz: 'Uzbek' };
  const wanted = langs.filter((lang) => languageNames[lang]);

  const prompt = [
    'Facts about the app (the only things you may state as specifics):',
    JSON.stringify(
      {
        name: facts.name,
        developer: facts.developer,
        category: facts.categoryLabel,
        kind: facts.isGame ? 'game' : 'app',
        rating: facts.rating,
        installs: facts.installs,
        size: facts.size,
        content_rating: facts.contentRating
      },
      null,
      2
    ),
    '',
    'Background only — do NOT paraphrase or translate this text, use it solely to understand what the app does:',
    (storeText || '').slice(0, 1200),
    '',
    `Write an original 2-3 sentence summary in each of these languages: ${wanted
      .map((lang) => languageNames[lang])
      .join(', ')}.`,
    `Respond with JSON only, shaped exactly: {${wanted.map((lang) => `"${lang}": "..."`).join(', ')}}`
  ].join('\n');

  const response = await client.messages.create({
    model,
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    // Blurb writing is a simple task, so keep spend low per app.
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  if (!json) return null;

  const parsed = JSON.parse(json);
  const result = {};
  for (const lang of wanted) {
    if (typeof parsed[lang] === 'string' && parsed[lang].trim().length > 20) {
      result[lang] = parsed[lang].trim();
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Lazily loads the Anthropic SDK so the package stays optional. */
export async function createClaudeClient() {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    return new Anthropic();
  } catch {
    return null;
  }
}
