# Запуск всех сайтов на своей машине (и дальше на VPS)

Одна сборка, один веб-сервер (Caddy) и все тематические сайты
(`config/sites.config.js`) на всех языках, каждый на своём домене. Локально
используются домены `*.localhost`: браузеры сами направляют их на 127.0.0.1,
так что ни DNS, ни файл hosts настраивать не нужно.

## Что нужно установить

1. **Node.js 20+** и зависимости проекта: `npm ci`.
2. **Caddy 2**:

   | Система | Команда |
   |---|---|
   | macOS | `brew install caddy` |
   | Windows | `winget install CaddyServer.Caddy` (или `scoop install caddy`) |
   | Ubuntu/Debian | инструкция на https://caddyserver.com/docs/install |
   | любая | бинарник из https://github.com/caddyserver/caddy/releases, путь к нему — в переменной `CADDY_BIN` |

## Запуск

```bash
npm run sites:build    # собрать все сайты × языки в dist-sites/ (~8 мин)
npm run sites:serve    # поднять Caddy на :8080
```

После этого сайты открываются в браузере:

| Сайт | Адреса |
|---|---|
| Игры | http://ru.games.localhost:8080/ (en., tr., uz.) |
| Приложения Google Play | http://ru.apps.localhost:8080/ |
| Open-source утилиты | http://ru.tools.localhost:8080/ |
| Open-source приложения | http://ru.open.localhost:8080/ |

Адрес без языка (например, http://games.localhost:8080/) перенаправляет на
язык браузера по тем же правилам, что и `config/geo.js`. Переключатель языка,
hreflang и sitemap ведут на локальные адреса.

Остановить сервер: Ctrl+C.

### Быстрая пересборка части сайтов

Полная сборка — это 16 вариантов по ~30 секунд. Пока правишь что-то одно,
можно собирать только нужное:

```bash
npm run sites:build -- --sites games --langs ru
npm run sites:build -- --sites games,apps --langs ru,en
```

Остальные варианты в `dist-sites/` остаются от прошлой сборки.

## Как это устроено

| Файл | Что делает |
|---|---|
| `config/sites.config.js` | какие приложения попадают на какой сайт, название и тексты сайта |
| `deploy/environments.js` | домены сайтов, протокол и порт для `local` и `production` |
| `scripts/build-sites.js` | собирает `dist-sites/<сайт>/<язык>/` с нужными доменами в ссылках |
| `scripts/caddyfile.js` | генерирует конфиг Caddy из трёх файлов выше и `config/geo.js` |
| `scripts/serve-sites.js` | генерирует локальный конфиг и запускает Caddy |

Сгенерированный конфиг можно посмотреть без запуска:
`npm run sites:caddyfile -- --env local` или `--env production`.

## Частые проблемы

- **Safari не открывает `*.localhost`.** Safari, в отличие от Chrome, Edge и
  Firefox, не направляет поддомены localhost на свою машину. Либо открой сайт в
  другом браузере, либо добавь строки в `/etc/hosts`
  (`127.0.0.1 ru.games.localhost` и т. д.).
- **Порт 8080 занят.** Поменяй `port` у `local` в `deploy/environments.js`
  и пересобери: порт входит в ссылки внутри страниц.
- **`Caddy is not installed`.** Caddy не найден в PATH; укажи путь к нему:
  `CADDY_BIN=/путь/к/caddy npm run sites:serve`.

## Дальше: VPS

Для продакшена используется та же схема, окружение `production`:

1. Вписать настоящие домены в `deploy/environments.js` → `production.domains`.
2. `npm run sites:build -- --env production`: те же 16 вариантов, но с
   `https://`-ссылками и заранее сжатыми копиями `.br`/`.gz`.
3. `npm run sites:caddyfile -- --env production --out deploy/Caddyfile`:
   конфиг для сервера (HTTPS-сертификаты Caddy выпустит сам).

Настройка сервера, автодеплой из GitHub Actions и перенос админки — следующие
шаги.
