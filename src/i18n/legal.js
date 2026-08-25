/**
 * Long-form legal copy. Rendered generically by src/pages/privacy.astro and
 * src/pages/disclaimer.astro, so adding a language only means adding a key.
 */
export const LEGAL_UPDATED = '2026-08-01';

export const LEGAL = {
  ru: {
    privacy: [
      {
        h: 'Какие данные мы собираем',
        p: [
          'Сайт представляет собой статический каталог. Мы не просим регистрироваться, не создаём личных кабинетов и не собираем имена, адреса или платёжные данные.',
          'Наш хостинг-провайдер автоматически фиксирует технические данные запроса: IP-адрес, тип браузера, страницу перехода и время визита. Эти записи используются только для защиты от злоупотреблений и оценки нагрузки.'
        ]
      },
      {
        h: 'Файлы cookie и локальное хранилище',
        p: [
          'Собственные рекламные или отслеживающие cookie мы не устанавливаем. Выбор языка и другие мелкие настройки интерфейса при необходимости сохраняются в localStorage вашего браузера и не покидают устройство.',
          'Очистка данных сайта в настройках браузера полностью удаляет эти значения.'
        ]
      },
      {
        h: 'Внешние ресурсы',
        p: [
          'Иконки и скриншоты приложений загружаются напрямую с серверов Google. Открывая страницу карточки, ваш браузер обращается к этим серверам, и на такие запросы распространяется политика конфиденциальности Google.',
          'Переход по кнопке «Открыть в Google Play» уводит вас на сайт Google. Дальнейшая обработка данных регулируется правилами Google, а не нашими.'
        ]
      },
      {
        h: 'Аналитика',
        p: [
          'Если на сайте включена веб-аналитика, используется решение без cookie, агрегирующее обезличенную статистику посещений. Профилирование отдельных пользователей не ведётся.'
        ]
      },
      {
        h: 'Дети',
        p: [
          'Каталог не адресован детям младше 13 лет и намеренно не собирает их персональные данные.'
        ]
      },
      {
        h: 'Ваши права и обращения',
        p: [
          'Вы вправе запросить сведения о данных, связанных с вашими визитами, или их удаление. Напишите нам на адрес, указанный на странице «Контакты», и мы ответим в разумный срок.',
          'При изменении политики мы обновляем дату в начале страницы.'
        ]
      }
    ],
    disclaimer: [
      {
        h: 'Независимость от Google',
        p: [
          'Этот каталог — независимый проект. Он не аффилирован с Google LLC, не спонсируется и не поддерживается ею, а также не связан с разработчиками перечисленных приложений.',
          'Google Play, логотип Google Play и Android являются товарными знаками Google LLC. Названия приложений, иконки и скриншоты принадлежат их правообладателям и используются исключительно для идентификации карточек.'
        ]
      },
      {
        h: 'APK-файлы: чужие — нет, свои — сами',
        p: [
          'Для карточек-агрегатов кнопка ведёт исключительно на официальную страницу приложения в Google Play. Чужие APK-файлы мы не храним, не распространяем и не даём на них ссылок.',
          'Отдельные приложения, помеченные как «Приложение автора», разрабатываем и распространяем мы сами. Их установочный файл мы раздаём напрямую или через сторонний магазин; для прямой загрузки на карточке указана контрольная сумма SHA-256, чтобы вы могли проверить целостность файла.',
          'Установка APK из файла требует включить в системе «Неизвестные источники» и остаётся на ваше усмотрение. Любые сторонние ресурсы, предлагающие «скачать APK» от нашего имени, к нам отношения не имеют.'
        ]
      },
      {
        h: 'Точность информации',
        p: [
          'Данные карточек (рейтинг, размер, версия, разработчик) собираются из общедоступных списков Google Play автоматически и обновляются периодически. Между обновлениями значения могут расходиться с актуальными.',
          'Описания представляют собой наш краткий самостоятельный пересказ назначения приложения, а не текст разработчика. Это редакционная оценка, которая может быть неполной.'
        ]
      },
      {
        h: 'Ответственность',
        p: [
          'Материалы предоставляются «как есть», без гарантий пригодности для конкретных целей. Решение об установке приложения и проверка его разрешений остаются за вами.',
          'Мы не несём ответственности за содержание, работу или политику приложений и сторонних сайтов, на которые ведут ссылки.'
        ]
      },
      {
        h: 'Удаление карточки',
        p: [
          'Правообладатель может запросить удаление карточки из каталога. Порядок обращения описан на странице «Контакты»; мы обрабатываем такие запросы в течение 5 рабочих дней.'
        ]
      }
    ]
  },

  en: {
    privacy: [
      {
        h: 'What we collect',
        p: [
          'The site is a static catalog. There is no sign-up, no user account, and we do not collect names, addresses or payment details.',
          'Our hosting provider automatically records technical request data: IP address, browser type, referring page and visit time. Those logs are used only to prevent abuse and to size capacity.'
        ]
      },
      {
        h: 'Cookies and local storage',
        p: [
          'We set no advertising or tracking cookies of our own. Language choice and similar small interface preferences may be kept in your browser localStorage and never leave your device.',
          'Clearing site data in your browser settings removes those values entirely.'
        ]
      },
      {
        h: 'Third-party resources',
        p: [
          'App icons and screenshots are loaded directly from Google servers. Opening a listing page makes your browser contact those servers, and those requests are covered by Google privacy terms.',
          'Following the "Open in Google Play" button takes you to a Google property, where Google rules apply instead of ours.'
        ]
      },
      {
        h: 'Analytics',
        p: [
          'Where web analytics is enabled, it is a cookie-free solution that aggregates anonymous visit statistics. We do not build profiles of individual visitors.'
        ]
      },
      {
        h: 'Children',
        p: [
          'The catalog is not directed at children under 13 and does not knowingly collect their personal data.'
        ]
      },
      {
        h: 'Your rights and requests',
        p: [
          'You may ask what data relates to your visits or request its deletion. Write to the address on the Contact page and we will reply within a reasonable time.',
          'When this policy changes, we update the date shown at the top of the page.'
        ]
      }
    ],
    disclaimer: [
      {
        h: 'Independent from Google',
        p: [
          'This catalog is an independent project. It is not affiliated with, sponsored or endorsed by Google LLC, nor associated with the developers of the listed apps.',
          'Google Play, the Google Play logo and Android are trademarks of Google LLC. App names, icons and screenshots belong to their respective owners and are used solely to identify listings.'
        ]
      },
      {
        h: 'APK files: not others’, only our own',
        p: [
          'For aggregated listings the button opens the official Google Play page and nothing else. We do not store, distribute or link to anyone else’s APK files.',
          'A small number of apps, marked "Author’s app", are developed and distributed by us. Their installer we serve directly or through a third-party store; for a direct download the listing shows a SHA-256 checksum so you can verify the file’s integrity.',
          'Installing an APK from a file requires enabling "Unknown sources" and remains your decision. Any third-party site offering "APK downloads" in our name is unrelated to this project.'
        ]
      },
      {
        h: 'Accuracy of information',
        p: [
          'Listing data (rating, size, version, developer) is collected automatically from public Google Play listings and refreshed periodically. Between refreshes the values may differ from what Google shows today.',
          'Summaries are our own short retelling of what an app does, not the developer text. They are editorial and may be incomplete.'
        ]
      },
      {
        h: 'Liability',
        p: [
          'Content is provided "as is", without warranty of fitness for a particular purpose. Deciding to install an app and reviewing its permissions remains your responsibility.',
          'We are not responsible for the content, behaviour or policies of the apps and third-party sites we link to.'
        ]
      },
      {
        h: 'Listing removal',
        p: [
          'A rights holder may request removal of a listing from the catalog. The procedure is described on the Contact page; we handle such requests within 5 business days.'
        ]
      }
    ]
  },

  tr: {
    privacy: [
      {
        h: 'Hangi verileri topluyoruz',
        p: [
          'Site statik bir katalogdur. Kayıt istemiyoruz, kullanıcı hesabı oluşturmuyoruz; ad, adres veya ödeme bilgisi toplamıyoruz.',
          'Barındırma sağlayıcımız istek verilerini otomatik olarak kaydeder: IP adresi, tarayıcı türü, yönlendiren sayfa ve ziyaret zamanı. Bu kayıtlar yalnızca kötüye kullanımı önlemek ve kapasite planlamak için kullanılır.'
        ]
      },
      {
        h: 'Çerezler ve yerel depolama',
        p: [
          'Kendimize ait reklam veya izleme çerezi yerleştirmiyoruz. Dil seçimi gibi küçük arayüz tercihleri gerektiğinde tarayıcınızın localStorage alanında tutulur ve cihazınızdan çıkmaz.',
          'Tarayıcı ayarlarından site verilerini temizlemek bu değerleri tamamen siler.'
        ]
      },
      {
        h: 'Üçüncü taraf kaynaklar',
        p: [
          'Uygulama simgeleri ve ekran görüntüleri doğrudan Google sunucularından yüklenir. Bir kayıt sayfasını açtığınızda tarayıcınız bu sunuculara bağlanır ve bu istekler Google gizlilik koşullarına tabidir.',
          '"Google Play\'de aç" düğmesi sizi bir Google sayfasına götürür; orada bizim değil Google kuralları geçerlidir.'
        ]
      },
      {
        h: 'Analitik',
        p: [
          'Web analitiği etkinse, çerez kullanmayan ve yalnızca anonim ziyaret istatistiklerini toplayan bir çözüm kullanılır. Bireysel ziyaretçi profili oluşturulmaz.'
        ]
      },
      {
        h: 'Çocuklar',
        p: [
          'Katalog 13 yaşından küçük çocuklara yönelik değildir ve bilerek onların kişisel verilerini toplamaz.'
        ]
      },
      {
        h: 'Haklarınız ve başvuru',
        p: [
          'Ziyaretlerinizle ilgili verileri sorabilir veya silinmesini talep edebilirsiniz. İletişim sayfasındaki adrese yazın, makul bir süre içinde yanıtlayalım.',
          'Politika değiştiğinde sayfanın başındaki tarihi güncelleriz.'
        ]
      }
    ],
    disclaimer: [
      {
        h: "Google'dan bağımsızlık",
        p: [
          'Bu katalog bağımsız bir projedir. Google LLC ile bağlantılı değildir, onun tarafından desteklenmez veya onaylanmaz; listelenen uygulamaların geliştiricileriyle de ilişkili değildir.',
          'Google Play, Google Play logosu ve Android, Google LLC şirketinin ticari markalarıdır. Uygulama adları, simgeleri ve ekran görüntüleri hak sahiplerine aittir ve yalnızca kayıtları tanımlamak için kullanılır.'
        ]
      },
      {
        h: 'APK dosyaları: başkasınınki değil, yalnızca kendimizinki',
        p: [
          'Toplu kayıtlarda düğme yalnızca resmi Google Play sayfasını açar. Başkalarının APK dosyalarını saklamaz, dağıtmaz veya bunlara bağlantı vermeyiz.',
          '"Yazarın uygulaması" olarak işaretlenen az sayıda uygulama tarafımızdan geliştirilip dağıtılır. Kurulum dosyasını doğrudan veya üçüncü taraf bir mağaza üzerinden sunarız; doğrudan indirme için kayıtta, dosyanın bütünlüğünü doğrulayabilmeniz adına SHA-256 sağlama toplamı gösterilir.',
          'APK’yı dosyadan kurmak "Bilinmeyen kaynaklar" iznini gerektirir ve kararı size aittir. Adımızı kullanarak "APK indirme" sunan üçüncü taraf siteler bu projeyle ilgisizdir.'
        ]
      },
      {
        h: 'Bilgilerin doğruluğu',
        p: [
          'Kayıt verileri (puan, boyut, sürüm, geliştirici) herkese açık Google Play listelerinden otomatik olarak toplanır ve düzenli aralıklarla yenilenir. Yenilemeler arasında değerler güncel olandan farklı olabilir.',
          'Özetler, geliştirici metni değil, uygulamanın ne işe yaradığına dair kendi kısa anlatımımızdır. Editoryaldir ve eksik olabilir.'
        ]
      },
      {
        h: 'Sorumluluk',
        p: [
          'İçerik, belirli bir amaca uygunluk garantisi olmaksızın "olduğu gibi" sunulur. Bir uygulamayı kurma kararı ve izinlerini inceleme sorumluluğu size aittir.',
          'Bağlantı verdiğimiz uygulamaların ve üçüncü taraf sitelerin içeriğinden, davranışından veya politikalarından sorumlu değiliz.'
        ]
      },
      {
        h: 'Kaydın kaldırılması',
        p: [
          'Hak sahibi, bir kaydın katalogdan kaldırılmasını talep edebilir. Başvuru yöntemi İletişim sayfasında açıklanmıştır; bu talepleri 5 iş günü içinde ele alırız.'
        ]
      }
    ]
  },
uz: {
    privacy: [
      {
        h: 'Qanday ma’lumot to‘playmiz',
        p: [
          'Sayt statik katalogdan iborat. Ro‘yxatdan o‘tishni so‘ramaymiz, shaxsiy kabinet yaratmaymiz hamda ism, manzil yoki to‘lov ma’lumotlarini yig‘maymiz.',
          'Xosting provayderimiz so‘rovning texnik ma’lumotlarini avtomatik qayd etadi: IP manzil, brauzer turi, o‘tish sahifasi va tashrif vaqti. Bu yozuvlar faqat suiiste’molning oldini olish va yuklamani baholash uchun ishlatiladi.'
        ]
      },
      {
        h: 'Cookie fayllar va mahalliy xotira',
        p: [
          'O‘zimizning reklama yoki kuzatuv cookie fayllarimizni o‘rnatmaymiz. Til tanlovi va shunga o‘xshash kichik interfeys sozlamalari zarur bo‘lganda brauzeringizning localStorage’ida saqlanadi va qurilmangizdan chiqmaydi.',
          'Brauzer sozlamalarida sayt ma’lumotlarini tozalash bu qiymatlarni butunlay o‘chiradi.'
        ]
      },
      {
        h: 'Uchinchi tomon resurslari',
        p: [
          'Ilova belgilari va ekran suratlari to‘g‘ridan-to‘g‘ri Google serverlaridan yuklanadi. Yozuv sahifasini ochganingizda brauzeringiz o‘sha serverlarga murojaat qiladi va bunday so‘rovlarga Google maxfiylik shartlari tatbiq etiladi.',
          '«Google Play’da ochish» tugmasi sizni Google saytiga olib o‘tadi. U yerda bizning emas, Google qoidalari amal qiladi.'
        ]
      },
      {
        h: 'Tahlil',
        p: [
          'Agar saytda veb-tahlil yoqilgan bo‘lsa, cookie ishlatmaydigan va faqat anonim tashrif statistikasini jamlaydigan yechim qo‘llanadi. Alohida foydalanuvchilar profili yuritilmaydi.'
        ]
      },
      {
        h: 'Bolalar',
        p: [
          'Katalog 13 yoshgacha bo‘lgan bolalarga mo‘ljallanmagan va ularning shaxsiy ma’lumotlarini bilib turib to‘plamaydi.'
        ]
      },
      {
        h: 'Huquqlaringiz va murojaat',
        p: [
          'Tashriflaringizga oid ma’lumotlar haqida so‘rashingiz yoki ularni o‘chirishni talab qilishingiz mumkin. «Aloqa» sahifasidagi manzilga yozing, oqilona muddatda javob beramiz.',
          'Siyosat o‘zgarganda sahifa boshidagi sanani yangilaymiz.'
        ]
      }
    ],
    disclaimer: [
      {
        h: 'Google’dan mustaqillik',
        p: [
          'Ushbu katalog mustaqil loyiha. U Google LLC bilan aloqador emas, u tomonidan homiylik qilinmaydi yoki qo‘llab-quvvatlanmaydi, shuningdek ro‘yxatdagi ilovalar dasturchilari bilan bog‘liq emas.',
          'Google Play, Google Play logotipi va Android — Google LLC savdo belgilari. Ilova nomlari, belgilari va ekran suratlari ularning huquq egalariga tegishli bo‘lib, faqat yozuvlarni aniqlash uchun ishlatiladi.'
        ]
      },
      {
        h: 'APK fayllar: begonasi emas, faqat o‘zimizniki',
        p: [
          'Yig‘ma yozuvlarda tugma faqat rasmiy Google Play sahifasini ochadi. Boshqalarning APK fayllarini saqlamaymiz, tarqatmaymiz va ularga havola bermaymiz.',
          '«Muallif ilovasi» deb belgilangan bir nechta ilova biz tomonimizdan ishlab chiqiladi va tarqatiladi. O‘rnatish faylini to‘g‘ridan-to‘g‘ri yoki uchinchi tomon do‘koni orqali beramiz; to‘g‘ridan-to‘g‘ri yuklab olish uchun yozuvda fayl yaxlitligini tekshirishingiz mumkin bo‘lgan SHA-256 nazorat summasi ko‘rsatiladi.',
          'APK’ni fayldan o‘rnatish «Noma’lum manbalar» ruxsatini talab qiladi va bu sizning qaroringiz. Bizning nomimizdan «APK yuklab olish» taklif qiluvchi uchinchi tomon saytlarining loyihaga aloqasi yo‘q.'
        ]
      },
      {
        h: 'Ma’lumotlarning aniqligi',
        p: [
          'Yozuv ma’lumotlari (reyting, hajm, versiya, dasturchi) Google Play’ning ochiq ro‘yxatlaridan avtomatik yig‘iladi va vaqti-vaqti bilan yangilanadi. Yangilanishlar orasida qiymatlar joriy holatdan farq qilishi mumkin.',
          'Tavsiflar — ilova nima uchun ekanini o‘z so‘zimiz bilan qisqacha bayon qilganimiz, dasturchi matni emas. Bu tahririy baho bo‘lib, to‘liq bo‘lmasligi mumkin.'
        ]
      },
      {
        h: 'Javobgarlik',
        p: [
          'Materiallar muayyan maqsadga yaroqlilik kafolatisiz «bor holicha» taqdim etiladi. Ilovani o‘rnatish qarori va uning ruxsatlarini tekshirish sizning zimmangizda qoladi.',
          'Havola berilgan ilovalar va uchinchi tomon saytlarining mazmuni, ishlashi yoki siyosati uchun javobgar emasmiz.'
        ]
      },
      {
        h: 'Yozuvni o‘chirish',
        p: [
          'Huquq egasi yozuvni katalogdan olib tashlashni so‘rashi mumkin. Murojaat tartibi «Aloqa» sahifasida keltirilgan; bunday so‘rovlarni 5 ish kuni ichida ko‘rib chiqamiz.'
        ]
      }
    ]
  }
};
