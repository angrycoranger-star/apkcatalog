# Добавление своих приложений

Быстро добавляй 5-20 своих приложений и обновляй их когда угодно.

## 1️⃣ Добавить приложение (5 секунд)

```bash
node scripts/add-own-app.js
```

Скрипт спросит:
```
App name: MyApp
Package ID (com.example.app): com.mycompany.myapp
Category: TOOLS
APK path (leave empty to add later): 
Icon path (leave empty to extract from APK):
```

✅ Приложение добавлено в `data/custom-apps.json` с автоматическим описанием

## 2️⃣ Обновить приложение (когда APK готов)

### Если есть APK файл:
```bash
node scripts/update-own-app.js --slug my-app --apk ./myapp.apk
```
- Автоматически парсит версию, размер, разрешения
- Извлекает иконку если есть

### Если есть ссылка для скачивания:
```bash
node scripts/update-own-app.js --slug my-app --url https://example.com/app.apk
```

### Если есть иконка:
```bash
node scripts/update-own-app.js --slug my-app --icon https://example.com/icon.png
```

## 📋 Примеры

**Сценарий 1: Быстрое добавление (APK есть сразу)**
```bash
node scripts/add-own-app.js --name "Calculator" --package "com.example.calc"
# → выбрать категорию → указать path to app.apk
# → готово! Приложение на сайте с иконкой и описанием
```

**Сценарий 2: Добавить без APK, обновить потом**
```bash
# День 1: добавить
node scripts/add-own-app.js
# → оставить APK path пустым

# День 5: APK готов
node scripts/update-own-app.js --slug my-app --apk ./app.apk

# День 10: обновить версию
node scripts/update-own-app.js --slug my-app --apk ./app-v2.apk
```

**Сценарий 3: Добавить 5 приложений быстро**
```bash
node scripts/add-own-app.js  # приложение 1
node scripts/add-own-app.js  # приложение 2
...и т.д.

# Потом по одному обновлять когда нужно
node scripts/update-own-app.js --slug app-1 --apk ./app1.apk
node scripts/update-own-app.js --slug app-2 --apk ./app2.apk
```

## 🎯 Что происходит внутри

### add-own-app.js
- ✅ Парсит APK и извлекает: версию, размер, иконку, разрешения
- ✅ Генерирует уникальный slug
- ✅ Создаёт мультиязычные описания (en, ru, tr, uz)
- ✅ Сохраняет в `data/custom-apps.json`
- ✅ Показывает slug для обновления потом

### update-own-app.js
- ✅ Обновляет версию, размер, разрешения из APK
- ✅ Сохраняет download URL
- ✅ Обновляет иконку
- ✅ Меняет дату обновления

## 📁 Структура данных

После добавления приложение выглядит так:

```json
{
  "slug": "my-calculator",
  "custom": true,
  "package_id": "com.example.calc",
  "category": "TOOLS",
  "developer": "You",
  "version": "1.2.0",
  "size": "4.5 MB",
  "min_android": "8.0",
  "permissions": ["INTERNET", "READ_CONTACTS"],
  "icon_url": "/img/custom/my-calculator.png",
  "translations": {
    "en": {
      "name": "My Calculator",
      "summary": "Fast and reliable calculator app..."
    },
    "ru": {
      "name": "My Calculator",
      "summary": "Быстрый и надежный калькулятор..."
    }
  },
  "download": {
    "type": "direct",
    "url": "https://example.com/app.apk",
    "checksum_sha256": "abc123...",
    "updated": "2026-09-10"
  }
}
```

## 🚀 Как это выглядит на сайте

После добавления приложение автоматически:
- 📱 Появляется на главной странице
- 🌍 Доступно во всех 4 языках
- 🔍 Оптимизировано для SEO
- 📊 Считается в статистике каталога

## ⚡ Советы

1. **Есть много приложений?** Добавляй их все сразу, обновляй параллельно
2. **APK парсится медленно?** Это нормально - происходит один раз
3. **Нужно изменить описание?** Отредактируй вручную в `data/custom-apps.json`
4. **Хочешь автоматические обновления?** Можно добавить GitHub Actions workflow

## 🔗 Связанные команды

```bash
# Проверить валидность данных
npm run validate

# Собрать сайт
npm run build

# Просмотр локально
npm run dev
```
