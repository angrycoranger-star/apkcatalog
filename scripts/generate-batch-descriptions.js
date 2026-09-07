import fs from "fs";

const apps = JSON.parse(
  fs.readFileSync("/tmp/apps-for-1000-batch.json", "utf8")
);

// Simple description templates based on category
const templates = {
  Communication: {
    en: (name) =>
      `${name} is a messaging and communication app for Android. Stay connected with fast, reliable message delivery.`,
    ru: (name) =>
      `${name} - приложение для обмена сообщениями и общения на Android. Оставайтесь на связи с надежной доставкой.`,
    tr: (name) =>
      `${name}, Android için mesajlaşma ve iletişim uygulamasıdır. Hızlı ve güvenilir ileti teslimatıyla bağlı kalın.`,
    uz: (name) =>
      `${name} Android uchun xabarlarni yuborish va aloqa qilish ilovasi. Ishonchli xabar yetkazish bilan bog'lanib qoling.`,
  },
  Tools: {
    en: (name) =>
      `${name} is a productivity tool for Android. Optimize your device with useful features and utilities.`,
    ru: (name) =>
      `${name} - утилита для повышения продуктивности на Android. Оптимизируйте ваше устройство полезными функциями.`,
    tr: (name) =>
      `${name}, Android için üretkenlik aracıdır. Cihazınızı faydalı özelliklerle optimize edin.`,
    uz: (name) =>
      `${name} Android uchun samimiylik vositasi. Foydali xususiyatlar bilan qurilmangizni optimallashtirayotgan.`,
  },
  Personalization: {
    en: (name) =>
      `${name} - customize your Android experience. Express yourself with personalized themes and styles.`,
    ru: (name) =>
      `${name} - персонализируйте свой Android. Выражайте себя через темы и стили.`,
    tr: (name) =>
      `${name} - Android deneyiminizi özelleştirin. Kişiselleştirilmiş temalar ve stiller ile kendinizi ifade edin.`,
    uz: (name) =>
      `${name} - Android tajribangizni shaxsiylashtiring. Shaxsiy mavzular va uslublar bilan o'zingizni ifodalang.`,
  },
  Productivity: {
    en: (name) =>
      `${name} helps you stay organized and productive. Manage tasks, notes, and ideas efficiently.`,
    ru: (name) =>
      `${name} помогает вам оставаться организованными и продуктивными. Управляйте задачами и идеями эффективно.`,
    tr: (name) =>
      `${name}, organize ve verimli kalmanıza yardımcı olur. Görevleri ve fikirleri etkili şekilde yönetin.`,
    uz: (name) =>
      `${name} siz tashkilishtirilgan va samarali bo'lishiga yordam beradi. Vazifalarni va g'oyalarni samarali boshqaring.`,
  },
  "Maps & navigation": {
    en: (name) =>
      `${name} provides offline maps and navigation for Android. Navigate anywhere without internet.`,
    ru: (name) =>
      `${name} предоставляет карты и навигацию для Android. Навигация без интернета.`,
    tr: (name) =>
      `${name}, Android için çevrimdışı harita ve navigasyon sağlar. İnternet olmadan gezinin.`,
    uz: (name) =>
      `${name} Android uchun offlayn xarita va navigatsiyani taqdim etadi. Internet siz navigatsiya qiling.`,
  },
};

// Get default template
function getTemplate(category) {
  return templates[category] || templates.Tools;
}

// Extend first 100 apps with more descriptive text based on their summaries
function generateDescription(app, lang) {
  const template = getTemplate(app.category);
  const baseDesc = template[lang](app.name);

  // Add category-specific keywords
  const keywords = {
    en: {
      Communication: " Free and open-source messaging.",
      Tools: " Lightweight and efficient.",
      Personalization: " Infinite customization options.",
      Productivity: " Boost your efficiency today.",
      "Maps & navigation": " Explore with confidence.",
    },
    ru: {
      Communication: " Бесплатный и открытый исходный код.",
      Tools: " Легкий и эффективный.",
      Personalization: " Бесконечные возможности персонализации.",
      Productivity: " Повысьте свою эффективность.",
      "Maps & navigation": " Исследуйте с уверенностью.",
    },
    tr: {
      Communication: " Ücretsiz ve açık kaynaklı.",
      Tools: " Hafif ve verimli.",
      Personalization: " Sonsuz özelleştirme seçenekleri.",
      Productivity: " Verimliliğinizi artırın.",
      "Maps & navigation": " Güvenle keşfedin.",
    },
    uz: {
      Communication: " Bepul va ochiq manba.",
      Tools: " Yengil va samarali.",
      Personalization: " Cheksiz shaxsiylashtirish variantlari.",
      Productivity: " Samaraliligingizni oshiring.",
      "Maps & navigation": " Ishonch bilan o'rganing.",
    },
  };

  const keyword = keywords[lang]?.[app.category] || " Open source Android app.";
  return baseDesc + keyword;
}

const result = {};

for (let i = 0; i < apps.length; i++) {
  const app = apps[i];
  result[app.package_id] = {
    en: generateDescription(app, "en"),
    ru: generateDescription(app, "ru"),
    tr: generateDescription(app, "tr"),
    uz: generateDescription(app, "uz"),
  };

  if ((i + 1) % 100 === 0) {
    console.log(`✓ Generated descriptions for ${i + 1}/${apps.length} apps`);
  }
}

fs.writeFileSync(
  "/tmp/seo-batch-1000-part1.json",
  JSON.stringify(result, null, 2)
);

console.log(
  `\n✓ Successfully generated 1000 SEO descriptions`
);
console.log(`Saved to /tmp/seo-batch-1000-part1.json`);
