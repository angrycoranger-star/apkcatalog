import Anthropic from '@anthropic-ai/sdk';

/**
 * Generate an original, SEO-friendly description for one of the owner's apps, in
 * all four site languages at once, via Claude. Mirrors the catalog's own
 * facts-first approach: it writes from the facts it is given, never copies or
 * invents, and returns one text per language for the record's translations.
 */
const LANGUAGE_NAMES = { ru: 'Russian', en: 'English', tr: 'Turkish', uz: 'Uzbek' };
const LANGS = ['ru', 'en', 'tr', 'uz'];

const SYSTEM_PROMPT = [
  'You write original descriptions for pages in an Android app catalog.',
  'Write naturally and helpfully for real readers and for search engines: say what the app is, what it does, who it is for, and when someone would use it.',
  'Rules:',
  '- Use only the facts you are given. Never invent features, prices, ratings, or claims you cannot support.',
  '- Do not copy or translate any marketing text. Write your own words.',
  '- No hype or filler ("best ever", "must-have"), no calls to action ("download now"), no emoji.',
  '- 2–3 short paragraphs, separated by a blank line. Plain text, no markdown, no headings.'
].join('\n');

export async function generateDescriptions({ name, developer, categoryLabel, packageId, version, isGame, keywords }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set on the admin project');

  const client = new Anthropic();

  const prompt = [
    'Facts about the app (the only specifics you may state):',
    JSON.stringify(
      {
        name: name || '',
        developer: developer || '',
        category: categoryLabel || '',
        kind: isGame ? 'game' : 'app',
        package_id: packageId || '',
        version: version || ''
      },
      null,
      2
    ),
    keywords ? `\nAngle / keywords to weave in naturally (optional): ${String(keywords).slice(0, 300)}` : '',
    '',
    `Write an original SEO description in each of these languages: ${LANGS.map((l) => LANGUAGE_NAMES[l]).join(', ')}.`,
    `Respond with JSON only, shaped exactly: {${LANGS.map((l) => `"${l}": "..."`).join(', ')}}`
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    // A short marketing blurb is a light task — keep spend low per generation.
    output_config: { effort: 'low' },
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  if (!json) throw new Error('the model did not return usable text');

  const parsed = JSON.parse(json);
  const out = {};
  for (const lang of LANGS) {
    if (typeof parsed[lang] === 'string' && parsed[lang].trim().length > 20) {
      out[lang] = parsed[lang].trim();
    }
  }
  if (!Object.keys(out).length) throw new Error('the model returned no usable descriptions');
  return out;
}
