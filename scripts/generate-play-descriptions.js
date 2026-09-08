import fs from "fs";

const apps = JSON.parse(fs.readFileSync("data/apps.json", "utf8"));

const templates = {
  COMMUNICATION: {
    en: (name) => `${name} is a messaging and communication app. Stay connected with reliable, fast messaging features.`,
    ru: (name) => `${name} - приложение для обмена сообщениями и общения. Оставайтесь на связи с надежной доставкой.`,
    tr: (name) => `${name}, mesajlaşma ve iletişim uygulamasıdır. Hızlı ve güvenilir ileti teslimatıyla bağlı kalın.`,
    uz: (name) => `${name} xabarlarni yuborish va aloqa qilish ilovasi. Ishonchli xabar yetkazish bilan bog'lanib qoling.`,
  },
  TOOLS: {
    en: (name) => `${name} is a useful utility app for Android. Boost your productivity with powerful tools.`,
    ru: (name) => `${name} - полезное приложение для Android. Повысьте производительность с помощью инструментов.`,
    tr: (name) => `${name}, Android için faydalı bir araç uygulamasıdır. Güçlü araçlarla verimliliğinizi artırın.`,
    uz: (name) => `${name} Android uchun foydali ilova. Kuchli vositalar bilan samaraliligingizni oshiring.`,
  },
  PERSONALIZATION: {
    en: (name) => `${name} lets you customize your Android device. Express your style with themes and customization options.`,
    ru: (name) => `${name} позволяет персонализировать ваше устройство. Выражайте себя через темы и стили.`,
    tr: (name) => `${name}, Android cihazınızı özelleştirmenize izin verir. Temalar ve stilleri ile kendinizi ifade edin.`,
    uz: (name) => `${name} Android qurilmangizni shaxsiylashtirish imkonini beradi. Mavzular va uslublar bilan o'zingizni ifodalang.`,
  },
  PRODUCTIVITY: {
    en: (name) => `${name} helps you stay organized and productive. Manage tasks, notes, and ideas efficiently.`,
    ru: (name) => `${name} помогает оставаться организованным. Управляйте задачами, заметками и идеями.`,
    tr: (name) => `${name}, organize ve verimli kalmanıza yardımcı olur. Görevleri ve fikirleri etkili şekilde yönetin.`,
    uz: (name) => `${name} tashkilishtirilgan va samarali bo'lishiga yordam beradi. Vazifalarni va g'oyalarni boshqaring.`,
  },
  GAME_ACTION: {
    en: (name) => `${name} is an exciting action game for Android. Test your reflexes and enjoy thrilling gameplay.`,
    ru: (name) => `${name} - захватывающая экшн-игра для Android. Испытайте свои рефлексы в динамичной игре.`,
    tr: (name) => `${name}, Android için heyecan verici bir aksiyon oyunudur. Reflekslerinizi test edin.`,
    uz: (name) => `${name} Android uchun qiziqarli o'yin. O'zingizning reflekslaringizni sinab ko'ring.`,
  },
  GAME_PUZZLE: {
    en: (name) => `${name} is a challenging puzzle game for Android. Solve puzzles and train your mind.`,
    ru: (name) => `${name} - увлекательная головоломка для Android. Решайте головоломки и тренируйте ум.`,
    tr: (name) => `${name}, Android için zorlayıcı bir bulmaca oyunudur. Bulmacaları çözün ve zihninizi geliştirin.`,
    uz: (name) => `${name} Android uchun qiziqarli bulmaca o'yni. Bulmacalarni eching va fikringizni o'stiring.`,
  },
  GAME_CASUAL: {
    en: (name) => `${name} is a fun casual game for Android. Relax and enjoy easy gameplay.`,
    ru: (name) => `${name} - веселая небольшая игра для Android. Расслабьтесь и наслаждайтесь игрой.`,
    tr: (name) => `${name}, Android için eğlenceli bir oyundur. Rahat oyunPlayin tadını çıkarın.`,
    uz: (name) => `${name} Android uchun qiziqarli o'yun. Oramni qo'l va o'yinning rohatingni ko'ring.`,
  },
  MAPS: {
    en: (name) => `${name} provides maps and navigation for Android. Find your way with ease.`,
    ru: (name) => `${name} предоставляет карты и навигацию. Легко найдите свой путь.`,
    tr: (name) => `${name}, Android için harita ve navigasyon sağlar. Kolaylıkla yolunuzu bulun.`,
    uz: (name) => `${name} xarita va navigatsiyani taqdim etadi. Osongina yo'lingizni toping.`,
  },
  SOCIAL: {
    en: (name) => `${name} is a social networking app. Connect with friends and communities.`,
    ru: (name) => `${name} - приложение социальной сети. Общайтесь с друзьями и сообществами.`,
    tr: (name) => `${name}, sosyal ağ uygulamasıdır. Arkadaşlarla bağlantı kurun.`,
    uz: (name) => `${name} ijtimoiy tarmoq ilovasi. Do'stlar va jamiyatlar bilan bog'lanib qoling.`,
  },
  MEDIA: {
    en: (name) => `${name} is a media player app for Android. Enjoy music, videos, and multimedia.`,
    ru: (name) => `${name} - медиаплеер для Android. Наслаждайтесь музыкой и видео.`,
    tr: (name) => `${name}, Android için bir medya oynatıcısıdır. Müzik ve videoları keyfini çıkarın.`,
    uz: (name) => `${name} Android uchun media pleyer. Musiqа va videoqlarni tinglang.`,
  },
  BUSINESS: {
    en: (name) => `${name} is a business app for Android. Manage work efficiently.`,
    ru: (name) => `${name} - приложение для бизнеса. Управляйте работой эффективно.`,
    tr: (name) => `${name}, Android için bir işletme uygulamasıdır. İşi verimli şekilde yönetin.`,
    uz: (name) => `${name} Android uchun biznes ilova. Ishni samarali boshqaring.`,
  },
};

function getTemplate(categoryId) {
  return templates[categoryId] || templates.TOOLS;
}

function generateDescription(app, lang) {
  const template = getTemplate(app.category);
  const baseDesc = template[lang](app.translations[lang]?.name || app.name);

  const keywords = {
    en: { default: " Download for free." },
    ru: { default: " Скачайте бесплатно." },
    tr: { default: " Ücretsiz indirin." },
    uz: { default: " Bepul yuklab oling." },
  };

  const keyword = keywords[lang]?.default || " Download now.";
  return baseDesc + keyword;
}

const result = {};
let count = 0;

for (const app of apps) {
  result[app.package_id] = {
    en: generateDescription(app, "en"),
    ru: generateDescription(app, "ru"),
    tr: generateDescription(app, "tr"),
    uz: generateDescription(app, "uz"),
  };
  count++;

  if (count % 500 === 0) {
    console.log(`✓ Generated ${count} descriptions`);
  }
}

fs.writeFileSync("/tmp/play-descriptions.json", JSON.stringify(result, null, 2));
console.log(`\n✓ Generated ${count} Play Store app descriptions`);
console.log(`Saved to /tmp/play-descriptions.json`);
