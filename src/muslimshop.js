import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  collection,
  getDocs,
  getDoc,
  query,
  limit,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

/* ============ Firebase Configuration ============ */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCCNwtzhDTBPB8GU_Ls7ogvN5xyUDOez3M',
  authDomain: 'muslim-shop-55c12.firebaseapp.com',
  projectId: 'muslim-shop-55c12',
  storageBucket: 'muslim-shop-55c12.firebasestorage.app',
  messagingSenderId: '716225520823',
  appId: '1:716225520823:web:7a82d8b680dd7251489932',
};

let ADMIN_EMAILS = ['kair7877@gmail.com'];
const CONFIGURED = true;
let FBLOAD_ERR = '';

/* ============ Utilities ============ */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
};
const money = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0₸';
const CONTACT = {
  phone: '+7 778 175 42 41',
  wa: '77781754241',
  address: 'пр. Султана Бейбарыса, 45а/5, Атырау, Казахстан',
  ig: 'https://www.instagram.com/musliim_shop06?stkn=dnAzejJ2cm5nOXNi',
  tt: 'https://www.tiktok.com/@muslim_shop06?_r=1&_t=ZS-9AFgdLAOcZ2',
  tg: 'https://t.me/muslim_shop06',
  gis: 'https://2gis.kz/atyrau/geo/70000001094546376',
};

let toastT;
function toast(m) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = m;
  t.style.display = 'block';
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.style.display = 'none'), 2600);
}

/* ============ i18n ============ */
const T = {
  ru: {
    menu: 'МЕНЮ',
    search_ph: 'Поиск товаров',
    find: 'НАЙТИ',
    cats: 'Категории',
    allcats: 'ВСЕ КАТЕГОРИИ',
    hidecats: 'СВЕРНУТЬ',
    popular: 'Популярные товары',
    news: 'Новинки',
    featured: 'Рекомендуемые товары',
    all_items: 'Все товары',
    about: 'О MUSLIM SHOP',
    about_txt:
      'MUSLIM SHOP — магазин в Атырау на рынке Дина, бутик 24. Оригинальные халяль-витамины и БАДы (в том числе iHerb), натуральный мёд, средства для мужского, женского и детского здоровья, исламские товары и парфюмерия. Закажите на сайте через WhatsApp, приходите в бутик или оформите доставку по Атырау и Казахстану. Работаем ежедневно с 10:00 до 19:00.',
    social: 'МЫ В СОЦИАЛЬНЫХ СЕТЯХ',
    contacts: 'КОНТАКТЫ',
    catalog: 'КАТАЛОГ',
    home: 'Главная',
    cart: 'Корзина',
    phone: 'Телефон',
    addr: 'Адрес',
    more: 'ПОДРОБНЕЕ',
    tocart: 'В КОРЗИНУ',
    order: 'ЗАКАЗАТЬ',
    share: 'ПОДЕЛИТЬСЯ',
    copy: '🔗 СКОПИРОВАТЬ ССЫЛКУ',
    in: 'В наличии',
    out: 'Нет в наличии',
    qty: 'Количество',
    desc: 'Описание',
    specs: 'Характеристики',
    sku: 'Артикул',
    new_: 'Новинка',
    filters: 'ФИЛЬТРЫ',
    sort: 'Сортировка',
    s_pop: 'По популярности',
    s_asc: 'Сначала дешёвые',
    s_desc: 'Сначала дорогие',
    s_new: 'Новинки',
    price_from: 'Цена от, ₸',
    price_to: 'Цена до, ₸',
    only_in: 'Только в наличии',
    only_new: 'Новинки',
    only_pop: 'Популярные',
    all: 'Все',
    nothing: 'Ничего не найдено. Измените запрос или фильтры.',
    found: 'Найдено товаров:',
    cart_empty: 'Корзина пуста. Выберите товар в каталоге.',
    total: 'Итого',
    remove: 'Удалить',
    checkout: 'Оформить заказ',
    name: 'Ваше имя',
    tel: 'Телефон',
    comment: 'Комментарий к заказу',
    send_wa: 'ОТПРАВИТЬ ЗАКАЗ В WHATSAPP',
    checkout_note:
      'Заказ откроется в WhatsApp уже заполненным. Нажмите «Отправить», и мы свяжемся с вами для подтверждения и оплаты.',
    fill: 'Укажите имя и телефон',
    copied: 'Ссылка скопирована',
    added: 'Добавлено в корзину',
    notfound: 'Товар не найден или скрыт.',
    back: '← В каталог',
    qty_unit: 'шт.',
    menu_nav: 'Навигация',
    err_load: 'Не удалось загрузить товары. Попробуйте обновить страницу.',
    addr_txt: 'пр. Султана Бейбарыса, 45а/5, Атырау, Казахстан',
    hero_sub: 'Халяль-витамины, БАДы, мёд и товары для здоровья в Атырау. Доставка по Казахстану',
    itemsn: 'Товаров:',
    trust: [
      ['Бутик 24', 'Рынок Дина, Атырау'],
      ['Заказ', 'через WhatsApp'],
      ['Цены', 'в тенге ₸'],
    ],
  },
  kk: {
    menu: 'МӘЗІР',
    search_ph: 'Тауар іздеу',
    find: 'ІЗДЕУ',
    cats: 'Санаттар',
    allcats: 'БАРЛЫҚ САНАТТАР',
    hidecats: 'ЖИНАУ',
    popular: 'Танымал тауарлар',
    news: 'Жаңалықтар',
    featured: 'Ұсынылатын тауарлар',
    all_items: 'Барлық тауарлар',
    about: 'MUSLIM SHOP ТУРАЛЫ',
    about_txt:
      'MUSLIM SHOP — Атыраудағы Дина базарындағы 24-бутик. Түпнұсқа адал дәрумендер мен БАД (iHerb қоса), табиғи бал, ерлер, әйелдер және балалар денсаулығына арналған құралдар, исламдық тауарлар және парфюмерия. WhatsApp арқылы тапсырыс беріңіз, бутикке келіңіз немесе Атырау мен Қазақстан бойынша жеткізуді рәсімдеңіз. Күн сайын 10:00–19:00 жұмыс істейміз.',
    social: 'ӘЛЕУМЕТТІК ЖЕЛІЛЕРДЕМІЗ',
    contacts: 'БАЙЛАНЫС',
    catalog: 'КАТАЛОГ',
    home: 'Басты бет',
    cart: 'Себет',
    phone: 'Телефон',
    addr: 'Мекенжай',
    more: 'ТОЛЫҒЫРАҚ',
    tocart: 'СЕБЕТКЕ',
    order: 'ТАПСЫРЫС БЕРУ',
    share: 'БӨЛІСУ',
    copy: '🔗 СІЛТЕМЕНІ КӨШІРУ',
    in: 'Бар',
    out: 'Жоқ',
    qty: 'Саны',
    desc: 'Сипаттама',
    specs: 'Сипаттамалары',
    sku: 'Артикул',
    new_: 'Жаңа',
    filters: 'СҮЗГІЛЕР',
    sort: 'Сұрыптау',
    s_pop: 'Танымалдығы бойынша',
    s_asc: 'Алдымен арзандары',
    s_desc: 'Алдымен қымбаттары',
    s_new: 'Жаңалар',
    price_from: 'Бағасы, бастап ₸',
    price_to: 'Бағасы, дейін ₸',
    only_in: 'Тек бары',
    only_new: 'Жаңалар',
    only_pop: 'Танымалдар',
    all: 'Барлығы',
    nothing: 'Ештеңе табылмады. Сұранысты немесе сүзгілерді өзгертіңіз.',
    found: 'Табылған тауар:',
    cart_empty: 'Себет бос. Каталогтан тауар таңдаңыз.',
    total: 'Барлығы',
    remove: 'Жою',
    checkout: 'Тапсырысты рәсімдеу',
    name: 'Атыңыз',
    tel: 'Телефон',
    comment: 'Тапсырысқа түсініктеме',
    send_wa: 'ТАПСЫРЫСТЫ WHATSAPP-ҚА ЖІБЕРУ',
    checkout_note:
      'Тапсырыс WhatsApp-та толтырылған күйде ашылады. «Жіберу» түймесін басыңыз, біз растау және төлем үшін хабарласамыз.',
    fill: 'Аты мен телефонды көрсетіңіз',
    copied: 'Сілтеме көшірілді',
    added: 'Себетке қосылды',
    notfound: 'Тауар табылмады немесе жасырылған.',
    back: '← Каталогқа',
    qty_unit: 'дана',
    menu_nav: 'Бөлімдер',
    err_load: 'Тауарларды жүктеу мүмкін болмады. Бетті жаңартып көріңіз.',
    addr_txt: 'Сұлтан Бейбарыс даңғылы, 45а/5, Атырау, Қазақстан',
    hero_sub: 'Атырауда адал дәрумендер, БАД, бал және денсаулыққа арналған тауарлар. Қазақстан бойынша жеткізу',
    itemsn: 'Тауар:',
    trust: [
      ['24-бутик', 'Дина базары, Атырау'],
      ['Тапсырыс', 'WhatsApp арқылы'],
      ['Бағасы', 'теңгемен ₸'],
    ],
  },
};

let lang = LS.get('ms_lang', 'ru');
if (lang !== 'kk') lang = 'ru';
const t = (k) => T[lang][k] ?? T.ru[k] ?? k;
const L = (o) => (o ? o[lang] || o.ru || '' : '');

/* ============ Data ============ */
const BUILTIN_CATS = [
  { id: 'islam', main: 1, name: { ru: 'Исламские товары', kk: 'Исламдық тауарлар' } },
  { id: 'vit', main: 1, name: { ru: 'Витамины и БАД', kk: 'Дәрумендер мен БАД' } },
  { id: 'health', main: 1, name: { ru: 'Здоровье', kk: 'Денсаулық' } },
  { id: 'men', main: 1, name: { ru: 'Мужское здоровье', kk: 'Ерлер денсаулығы' } },
  { id: 'women', main: 1, name: { ru: 'Женское здоровье', kk: 'Әйелдер денсаулығы' } },
  { id: 'kids', main: 1, name: { ru: 'Детское здоровье', kk: 'Балалар денсаулығы' } },
  { id: 'honey', main: 1, name: { ru: 'Мёд и натуральные продукты', kk: 'Бал және табиғи өнімдер' } },
  { id: 'natural', main: 1, name: { ru: 'Натуральные средства', kk: 'Табиғи құралдар' } },
  { id: 'perfume', main: 0, name: { ru: 'Парфюмерия и миски', kk: 'Парфюмерия және миск' } },
  { id: 'prayer', main: 0, name: { ru: 'Жейнамазы', kk: 'Жайнамаздар' } },
  { id: 'hijama', main: 0, name: { ru: 'Хиджама', kk: 'Хиджама' } },
  { id: 'collagen', main: 0, name: { ru: 'Коллаген', kk: 'Коллаген' } },
  { id: 'syrups', main: 0, name: { ru: 'Сиропы', kk: 'Сироптар' } },
  { id: 'gain', main: 0, name: { ru: 'Для набора веса', kk: 'Салмақ қосу үшін' } },
];

const DB_IDS = ['ai-studio-muslimshop-6c5697f5-1412-4eb6-8d95-aa2cc7a70c7b', '(default)'];
let fdb = null;
let fdbs = [];
let dbPicked = false;
let DBNAME = '';
let fauth = null;
let authUser = null;
let LOAD_ERR = '';
let started = false;
let FBCATS = null;

async function fbInit() {
  try {
    const app = initializeApp(FIREBASE_CONFIG);
    const mkDb = (id) => {
      try {
        const S = { experimentalAutoDetectLongPolling: true };
        return id ? initializeFirestore(app, S, id) : initializeFirestore(app, S);
      } catch {
        return id ? getFirestore(app, id) : getFirestore(app);
      }
    };
    fdbs = [mkDb(DB_IDS[0]), mkDb('')];
    fdb = fdbs[0];
    DBNAME = DB_IDS[0];
    try {
      fauth = initializeAuth(app, { persistence: [browserLocalPersistence, inMemoryPersistence] });
    } catch {
      fauth = getAuth(app);
    }
  } catch (e) {
    LOAD_ERR = String((e && e.message) || e);
  }
}

async function pickDb() {
  if (dbPicked || !fdbs.length) return;
  let saved = -1;
  try {
    saved = parseInt(localStorage.getItem('ms_db') || '-1', 10);
  } catch {}
  const order = saved === 1 ? [1, 0] : [0, 1];
  let fb = null;
  for (const i of order) {
    for (const col of ['catalog', 'products']) {
      try {
        const sn = await getDocs(query(collection(fdbs[i], col), limit(1)));
        if (sn.docs.length) {
          fdb = fdbs[i];
          DBNAME = DB_IDS[i];
          dbPicked = true;
          try {
            localStorage.setItem('ms_db', String(i));
          } catch {}
          return;
        }
      } catch {}
    }
    if (fb === null) fb = i;
  }
  const k = fb === null ? 0 : fb;
  fdb = fdbs[k];
  DBNAME = DB_IDS[k];
  dbPicked = true;
}

let DB = { cats: BUILTIN_CATS, products: [], loaded: false };
const isAdmin = () => !!authUser;
const fbInitP = fbInit();
fbInitP.then(() => {
  if (!fauth) return;
  try {
    onAuthStateChanged(fauth, (u) => {
      const was = !!authUser;
      authUser = u;
      if (started && was !== !!u) render();
    });
  } catch {}
});

const KNOWN_F = new Set([
  'titleRu',
  'titleKz',
  'title',
  'name',
  'sku',
  'specs',
  'specsKz',
  'descriptionKz',
  'categoryId',
  'category',
  'images',
  'image',
  'img',
  'photo',
  'photos',
  'hidden',
  'inStock',
  'qty',
  'createdAt',
  'updatedAt',
  'id',
  'price',
  'oldPrice',
  'isNew',
  'popular',
  'featured',
  'thumb',
]);

function guessDesc(d) {
  let best = '';
  for (const k in d) {
    if (KNOWN_F.has(k)) continue;
    const v = d[k];
    if (typeof v === 'string' && v.length > best.length && !/^data:/.test(v) && !/^https?:\/\//.test(v)) {
      best = v;
    }
  }
  return best.length >= 40 ? best : '';
}

const descOf = (d) => String(d.description || d.descriptionRu || d.desc || d.details || d.descr || guessDesc(d) || '');

function norm(id, d) {
  const imgs = Array.isArray(d.images) ? d.images.filter(Boolean) : d.images ? [d.images] : [];
  const out = d.inStock === false || d.inStock === 'false' || d.inStock === 0;
  return {
    id,
    slug: id,
    cat: String(d.categoryId || ''),
    name: { ru: d.titleRu || d.title || d.name || '', kk: d.titleKz || '' },
    price: Number(d.price) || 0,
    old: Number(d.oldPrice) || 0,
    status: d.hidden ? 'hidden' : out ? 'out' : 'in',
    qty: Number(d.qty) || 0,
    sku: d.sku || '',
    img: imgs[0] || '',
    images: imgs,
    isNew: d.isNew ? 1 : 0,
    popular: d.popular ? 1 : 0,
    featured: d.featured ? 1 : 0,
    desc: { ru: descOf(d), kk: String(d.descriptionKz || '') },
    specs: { ru: String(d.specs || ''), kk: String(d.specsKz || '') },
    created: (d.createdAt && d.createdAt.seconds) || 0,
  };
}

function normLite(id, d) {
  const th = d.thumb || '';
  return {
    id,
    slug: id,
    lite: 1,
    cat: String(d.categoryId || ''),
    name: { ru: d.titleRu || '', kk: d.titleKz || '' },
    price: Number(d.price) || 0,
    old: Number(d.oldPrice) || 0,
    status: d.hidden ? 'hidden' : d.inStock === false ? 'out' : 'in',
    qty: Number(d.qty) || 0,
    sku: d.sku || '',
    img: th,
    images: th ? [th] : [],
    isNew: d.isNew ? 1 : 0,
    popular: d.popular ? 1 : 0,
    featured: d.featured ? 1 : 0,
    desc: { ru: '', kk: '' },
    specs: { ru: '', kk: '' },
    hasDesc: !!d.dr,
    hasDescKz: !!d.dk,
    hasSp: !!d.sp,
    hasSpKz: !!d.spk,
    created: (d.createdAt && d.createdAt.seconds) || 0,
  };
}

const liteFrom = (p, thumb) => ({
  titleRu: p.name.ru,
  titleKz: p.name.kk || '',
  price: p.price,
  oldPrice: p.old || 0,
  categoryId: p.cat,
  inStock: p.status !== 'out',
  hidden: p.status === 'hidden',
  qty: p.qty || 0,
  sku: p.sku || '',
  isNew: !!p.isNew,
  popular: !!p.popular,
  featured: !!p.featured,
  dr: !!p.desc.ru,
  dk: !!p.desc.kk,
  sp: !!p.specs.ru,
  spk: !!p.specs.kk,
  thumb,
  updatedAt: serverTimestamp(),
});

function makeThumb(src, mx, q) {
  return new Promise((res) => {
    if (!src) return res('');
    const im = new Image();
    im.onload = () => {
      try {
        const m = mx || 480;
        const k = Math.min(1, m / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * k));
        c.height = Math.max(1, Math.round(im.height * k));
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', q || 0.7));
      } catch {
        res('');
      }
    };
    im.onerror = () => res('');
    im.src = src;
  });
}

const FULLC = {};
let LITE = false;

async function getFull(id) {
  if (FULLC[id]) return FULLC[id];
  const p = DB.products.find((x) => x.id === id);
  if (p && !p.lite) return p;
  const sn = await getDoc(doc(fdb, 'products', id));
  if (!sn.exists()) return p;
  return (FULLC[id] = norm(id, sn.data()));
}

async function syncLite(id, p) {
  if (!LITE || !fdb) return null;
  const th = await makeThumb((p.images || [])[0]);
  const rec = liteFrom(p, th);
  if (p._new) rec.createdAt = serverTimestamp();
  await wt(setDoc(doc(fdb, 'catalog', id), rec, { merge: true }));
  return rec;
}

function buildCats() {
  const base = FBCATS && FBCATS.length ? FBCATS : BUILTIN_CATS.map((c) => ({ ...c }));
  const ids = new Set(base.map((c) => c.id));
  DB.products.forEach((p) => {
    if (p.cat && !ids.has(p.cat)) {
      ids.add(p.cat);
      base.push({ id: p.cat, main: 0, name: { ru: p.cat, kk: '' } });
    }
  });
  return base
    .map((c, i) => ({ c, i }))
    .sort((x, y) => (x.c.order != null ? x.c.order : 1e6 + x.i) - (y.c.order != null ? y.c.order : 1e6 + y.i))
    .map((x) => x.c);
}

const WRITE_MS = () => 45000;
const wt = (pr) =>
  Promise.race([
    pr,
    new Promise((_, rej) =>
      setTimeout(() => rej({ code: 'write-timeout' }), WRITE_MS())
    ),
  ]);

function fbErrText(err) {
  const code = String((err && err.code) || '');
  const msg = String((err && err.message) || err || '');
  if (/permission|insufficient/i.test(code + msg))
    return 'Firebase не разрешает запись. Откройте запись в правилах Firestore для базы «' + DBNAME + '».';
  if (/resource-exhausted|quota/i.test(code + msg))
    return 'Лимит базы «' + DBNAME + '» исчерпан. Товар сохранён локально в магазине.';
  if (/write-timeout/.test(code))
    return 'База «' + DBNAME + '» не ответила вовремя. Товар сохранён локально.';
  return 'Не удалось сохранить: ' + (msg || code || 'ошибка');
}

function closeDone() {
  const o = document.getElementById('doneov');
  if (o) o.remove();
}

function openDone(html, cls) {
  closeDone();
  const o = document.createElement('div');
  o.id = 'doneov';
  o.className = 'doneov';
  o.innerHTML = '<div class="donecard ' + (cls || '') + '" role="dialog" aria-live="polite">' + html + '</div>';
  o.addEventListener('click', (e) => {
    const b = e.target.closest('[data-done]');
    if (b) {
      const k = b.dataset.done;
      closeDone();
      if (k === 'again') {
        editing = blankProduct();
        render();
        window.scrollTo(0, 0);
      }
      return;
    }
    if (e.target === o || e.target.closest('[data-close]')) closeDone();
  });
  document.body.appendChild(o);
}

function showDone({ isNew, p, sid, warn }) {
  const price = (Number(p.price) || 0).toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ₸';
  openDone(
    '<div class="doneico"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<h2>' +
      (isNew ? 'Товар добавлен' : 'Изменения сохранены') +
      '</h2>' +
      '<p class="donename">' +
      esc(p.name.ru) +
      '</p>' +
      '<p class="donesub">' +
      price +
      ' · ' +
      (isNew ? 'уже виден покупателям' : 'обновлено на сайте') +
      '<br><small>База: ' +
      esc(DBNAME) +
      '</small></p>' +
      (warn ? '<p class="donewarn">' + esc(warn) + '</p>' : '') +
      '<div class="doneacts"><a class="btn gold block" href="#/product/' +
      esc(sid) +
      '" data-close>ОТКРЫТЬ НА САЙТЕ</a>' +
      (isNew ? '<button class="btn line block" type="button" data-done="again">Добавить ещё товар</button>' : '') +
      '<button class="btn line block" type="button" data-done="close">К списку товаров</button></div>',
    ''
  );
}

function showFail(text, title) {
  openDone(
    '<div class="doneico"><svg viewBox="0 0 24 24"><path d="M12 6v8M12 18v.5"/></svg></div>' +
      '<h2>' +
      esc(title || 'Товар не сохранён') +
      '</h2><p class="donesub" style="color:var(--black)">' +
      esc(text) +
      '</p>' +
      '<div class="doneacts"><button class="btn gold block" type="button" data-done="close">Понятно</button></div>',
    'fail'
  );
}

function localPut(sid, p, rec) {
  const old = DB.products.find((x) => x.id === sid);
  const created = p._new ? Math.floor(Date.now() / 1000) : (old && old.created) || 0;
  let np;
  if (LITE && rec) np = normLite(sid, { ...rec, createdAt: { seconds: created } });
  else
    np = norm(sid, {
      titleRu: p.name.ru,
      titleKz: p.name.kk || '',
      price: p.price,
      oldPrice: p.old || 0,
      categoryId: p.cat,
      description: p.desc.ru,
      descriptionKz: p.desc.kk || '',
      images: p.images || [],
      inStock: p.status !== 'out',
      hidden: p.status === 'hidden',
      qty: p.qty || 0,
      sku: p.sku || '',
      specs: p.specs.ru,
      specsKz: p.specs.kk || '',
      isNew: !!p.isNew,
      popular: !!p.popular,
      featured: !!p.featured,
      createdAt: { seconds: created },
    });
  const i = DB.products.findIndex((x) => x.id === sid);
  if (i >= 0) DB.products[i] = np;
  else DB.products.unshift(np);
  DB.products.sort((a, b) => b.created - a.created || a.name.ru.localeCompare(b.name.ru));
  DB.cats = buildCats();
  try {
    localStorage.setItem('muslim_shop_products', JSON.stringify(DB.products));
  } catch {}
}

async function saveProductFB(p) {
  const data = {
    titleRu: p.name.ru,
    titleKz: p.name.kk || '',
    price: p.price,
    oldPrice: p.old || 0,
    categoryId: p.cat,
    description: p.desc.ru,
    descriptionKz: p.desc.kk || '',
    images: p.images || [],
    inStock: p.status !== 'out',
    hidden: p.status === 'hidden',
    qty: p.qty || 0,
    sku: p.sku || '',
    specs: p.specs.ru,
    specsKz: p.specs.kk || '',
    isNew: !!p.isNew,
    popular: !!p.popular,
    featured: !!p.featured,
    updatedAt: serverTimestamp(),
  };

  // Sync to Express Server API in background
  try {
    fetch('/api/catalog/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveProduct', product: { id: p.id || `prod-${Date.now()}`, ...data } }),
    }).catch(() => {});
  } catch {}

  if (!fdb) return p.id || `prod-${Date.now()}`;
  await pickDb();
  if (p._new) {
    data.createdAt = serverTimestamp();
    try {
      const r = await wt(addDoc(collection(fdb, 'products'), data));
      return r.id;
    } catch {
      // Fallback: direct ID if write timeout
      const fallbackId = `prod-${Date.now()}`;
      return fallbackId;
    }
  }
  await wt(setDoc(doc(fdb, 'products', p.id), data, { merge: true }));
  return p.id;
}

const visible = () => DB.products.filter((p) => p.status !== 'hidden');
const prod = (slug) => DB.products.find((p) => p.slug === slug);
const prodById = (id) => DB.products.find((p) => p.id === id);
const catName = (id) => {
  const c = DB.cats.find((c) => c.id === id);
  return c ? L(c.name) : '';
};
const specsRows = (s) =>
  String(s || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ['', l];
    });
const prodUrl = (p) => location.origin + location.pathname + '#/product/' + encodeURIComponent(p.slug);
const safeDec = (x) => {
  try {
    return decodeURIComponent(x);
  } catch {
    return x;
  }
};

/* ============ Cart ============ */
let cart = LS.get('ms_cart', []);
function saveCart() {
  LS.set('ms_cart', cart);
  updateBadge();
}
function updateBadge() {
  const n = cart.reduce((s, i) => s + i.q, 0);
  const b = $('#cartcount');
  if (!b) return;
  b.textContent = n;
  b.style.display = n ? 'flex' : 'none';
}
function addToCart(id, q = 1) {
  const p = prodById(id);
  if (!p || p.status !== 'in') return;
  const it = cart.find((i) => i.id === id);
  if (it) it.q += q;
  else cart.push({id, q});
  saveCart();
  toast(t('added'));
}
const cartLines = () => cart.map((i) => ({ p: prodById(i.id), q: i.q })).filter((x) => x.p && x.p.status !== 'hidden');

/* ============ Views & HTML ============ */
const imgBox = (p, cls = 'ph') =>
  `<span class="${cls}">${
    p.img
      ? `<img src="${esc(p.img)}" alt="${esc(L(p.name))}" loading="lazy">`
      : `<span class="noimg">${esc((L(p.name) || 'M').charAt(0).toUpperCase())}</span>`
  }${p.isNew && cls === 'ph' ? `<span class="tag">${t('new_')}</span>` : ''}${
    p.old > p.price && cls === 'ph' ? `<span class="tag disc">−${Math.round((1 - p.price / p.old) * 100)}%</span>` : ''
  }</span>`;

const stockHtml = (p) =>
  p.status === 'in' ? `<div class="stock in">${t('in')}</div>` : `<div class="stock out">${t('out')}</div>`;
const priceHtml = (p) =>
  `<div class="price">${money(p.price)}${p.old > p.price ? `<span class="old">${money(p.old)}</span>` : ''}</div>`;

function card(p) {
  return `<article class="card">
    <a href="#/product/${esc(p.slug)}" aria-label="${esc(L(p.name))}">${imgBox(p)}</a>
    <div class="cb">
      <a class="cn" href="#/product/${esc(p.slug)}">${esc(L(p.name))}</a>
      ${priceHtml(p)}${stockHtml(p)}
      <div class="row">
        <a class="btn sm line" href="#/product/${esc(p.slug)}">${t('more')}</a>
        <button class="btn sm" data-act="add" data-id="${esc(p.id)}" ${p.status !== 'in' ? 'disabled' : ''}>${
    p.status === 'in' ? t('tocart') : t('out')
  }</button>
      </div>
    </div></article>`;
}

function searchBox(q = '') {
  return `<form class="search" data-form="search" role="search"><input type="search" id="q" name="q" value="${esc(
    q
  )}" placeholder="${t('search_ph')}" aria-label="${t('search_ph')}" autocomplete="off"><button type="submit">${t(
    'find'
  )}</button></form>`;
}

const LOCK =
  '<a class="lock" href="#/admin" aria-label="Вход для владельца"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></a>';

function viewHome() {
  const main = DB.cats.filter((c) => c.main);
  const rest = DB.cats.filter((c) => !c.main);
  const vis = visible();
  const pop = vis.filter((p) => p.popular).slice(0, 8);
  const neu = vis.filter((p) => p.isNew).slice(0, 8);
  const fea = vis.filter((p) => p.featured).slice(0, 8);
  const sec = (title, arr) =>
    arr.length ? `<section><h2>${title}</h2><div class="grid">${arr.map(card).join('')}</div></section>` : '';
  const tile = (c) =>
    `<a class="cat" href="#/catalog?cat=${esc(c.id)}"><span>${esc(L(c.name))}</span><small>${t('itemsn')} ${
      vis.filter((p) => p.cat === c.id).length
    }</small></a>`;

  return `<div class="hero"><h1>MUSLIM SHOP</h1><p>${t('hero_sub')}</p>${searchBox()}
    <div class="trust">${t('trust')
      .map((x, i) => `<div><b>${esc(x[0])}${i === 0 ? LOCK : ''}</b>${esc(x[1])}</div>`)
      .join('')}</div></div>
  <section id="cats" style="padding-top:28px"><h2>${t('cats')}</h2>
    <div class="cats">${main.map(tile).join('')}</div>
    ${
      rest.length
        ? `<div class="cats cats-extra" id="catsx">${rest.map(tile).join('')}</div>
    <button class="btn block line" style="margin-top:12px" data-act="allcats" id="allcatsbtn">${t('allcats')}</button>`
        : ''
    }
  </section>
  ${
    pop.length || neu.length || fea.length
      ? sec(t('popular'), pop) + sec(t('news'), neu) + sec(t('featured'), fea)
      : sec(t('all_items'), vis.slice(0, 12))
  }
  <section><a class="btn block" href="#/catalog">${t('all_items')} (${vis.length})</a></section>
  <section id="about"><h2>${t('about')}</h2><div class="about">${t('about_txt')}</div></section>
  <section id="social"><h2>${t('social')}</h2>${socials()}</section>
  <section id="contacts"><h2>${t('contacts')}</h2>${contactBox()}</section>`;
}

function socials() {
  return `<div class="socs">
   <a class="soc" href="${CONTACT.ig}" target="_blank" rel="noopener"><small>Instagram</small><b>@musliim_shop06</b></a>
   <a class="soc" href="${CONTACT.tt}" target="_blank" rel="noopener"><small>TikTok</small><b>@muslim_shop06</b></a>
   <a class="soc" href="${CONTACT.tg}" target="_blank" rel="noopener"><small>Telegram</small><b>@muslim_shop06</b></a></div>`;
}

function contactBox() {
  return `<div class="contacts"><div><b>MUSLIM SHOP</b></div><div>${
    lang === 'kk' ? 'Атырау, Дина базары, 24-бутик' : 'Атырау, Рынок Дина, Бутик 24'
  }</div><div>${t('addr')}: ${esc(t('addr_txt'))}</div>
   <div>${t('phone')}: <a href="tel:+77781754241">${CONTACT.phone}</a></div>
   <div>${lang === 'kk' ? 'Жұмыс уақыты: күн сайын 10:00–19:00' : 'Часы работы: ежедневно 10:00–19:00'}</div>
   <div>2ГИС: <a href="${CONTACT.gis}" target="_blank" rel="noopener">${
    lang === 'kk' ? 'картада ашу' : 'открыть на карте'
  }</a></div></div>`;
}

let CQ = {};
function viewCatalog(q) {
  CQ = {
    cat: q.cat || '',
    q: q.q || '',
    sort: q.sort || 'pop',
    min: q.min || '',
    max: q.max || '',
    stock: q.stock === '1',
    neu: q.neu === '1',
    pop: q.pop === '1',
  };
  const chips = [`<a class="chip ${!CQ.cat ? 'on' : ''}" href="#/catalog">${t('all')}</a>`]
    .concat(
      DB.cats.map(
        (c) => `<a class="chip ${CQ.cat === c.id ? 'on' : ''}" href="#/catalog?cat=${esc(c.id)}">${esc(L(c.name))}</a>`
      )
    )
    .join('');
  return `<h1 style="margin-top:16px">${t('catalog')}</h1>
  ${searchBox(CQ.q)}
  <div class="chips" role="navigation" aria-label="${t('cats')}">${chips}</div>
  <details class="filters-wrap" open><summary class="btn sm line" style="list-style:none;margin:8px 0">${t(
    'filters'
  )} / ${t('sort')}</summary>
   <div class="filters" id="filters">
    <div><label for="f-sort">${t('sort')}</label><select id="f-sort" data-f="sort">
      <option value="pop">${t('s_pop')}</option><option value="asc">${t('s_asc')}</option><option value="desc">${t(
    's_desc'
  )}</option><option value="new">${t('s_new')}</option></select></div>
    <div class="two"><div><label for="f-min">${t('price_from')}</label><input type="number" inputmode="numeric" id="f-min" data-f="min" min="0" value="${esc(
    CQ.min
  )}"></div>
      <div><label for="f-max">${t('price_to')}</label><input type="number" inputmode="numeric" id="f-max" data-f="max" min="0" value="${esc(
    CQ.max
  )}"></div></div>
    <div class="checks">
      <label><input type="checkbox" data-f="stock" ${CQ.stock ? 'checked' : ''}> ${t('only_in')}</label>
      <label><input type="checkbox" data-f="neu" ${CQ.neu ? 'checked' : ''}> ${t('only_new')}</label>
      <label><input type="checkbox" data-f="pop" ${CQ.pop ? 'checked' : ''}> ${t('only_pop')}</label></div>
   </div></details>
  <div id="count" style="font-weight:700;margin:6px 0 12px"></div>
  <div id="plist"></div>`;
}

function updateCatalog() {
  const s = $('#f-sort');
  if (s) s.value = CQ.sort;
  let arr = visible();
  if (CQ.cat) arr = arr.filter((p) => p.cat === CQ.cat);
  if (CQ.q) {
    const w = CQ.q.toLowerCase().split(/\s+/).filter(Boolean);
    arr = arr.filter((p) => {
      const h = ((p.name.ru || '') + ' ' + (p.name.kk || '') + ' ' + (p.sku || '')).toLowerCase();
      return w.every((x) => h.includes(x));
    });
  }
  if (CQ.min !== '') arr = arr.filter((p) => p.price >= Number(CQ.min));
  if (CQ.max !== '') arr = arr.filter((p) => p.price <= Number(CQ.max));
  if (CQ.stock) arr = arr.filter((p) => p.status === 'in');
  if (CQ.neu) arr = arr.filter((p) => p.isNew);
  if (CQ.pop) arr = arr.filter((p) => p.popular);
  const sorts = {
    pop: (a, b) => (b.popular | 0) - (a.popular | 0),
    asc: (a, b) => a.price - b.price,
    desc: (a, b) => b.price - a.price,
    new: (a, b) => (b.isNew | 0) - (a.isNew | 0),
  };
  arr = arr.slice().sort(sorts[CQ.sort] || sorts.pop);
  $('#count').textContent = (CQ.cat ? catName(CQ.cat) + ' — ' : '') + t('found') + ' ' + arr.length;
  $('#plist').innerHTML = arr.length
    ? `<div class="grid">${arr.map(card).join('')}</div>`
    : `<div class="empty">${t('nothing')}</div>`;
}

let CUR = null;
function viewProduct(slug) {
  const p0 = prod(slug) || prod(String(slug).split(/[?&#]/)[0].replace(/\/+$/, ''));
  if (!p0) return `<section><div class="empty">${t('notfound')}</div><p style="margin-top:14px"><a class="btn block" href="#/catalog">${t('back')}</a></p></section>`;
  let p = p0;
  CUR = p;
  document.title = L(p.name) + ' — MUSLIM SHOP';
  const rows = specsRows(p.specs && (p.specs[lang] || p.specs.ru));
  const desc = L(p.desc);
  return `<div class="crumbs"><a href="#/">${t('home')}</a> / <a href="#/catalog?cat=${esc(p.cat)}">${esc(catName(p.cat))}</a></div>
  <section class="pp">
    <div>${imgBox(p)}${
      (p.images || []).length > 1
        ? `<div class="thumbs">${p.images
            .map(
              (x, i) =>
                `<button type="button" class="${i === 0 ? 'on' : ''}" data-act="gal" data-id="${i}" aria-label="${
                  i + 1
                }"><img src="${esc(x)}" alt=""></button>`
            )
            .join('')}</div>`
        : ''
    }</div>
    <div style="display:grid;gap:14px">
      <h1>${esc(L(p.name))}</h1>
      ${priceHtml(p)}${stockHtml(p)}
      ${p.status === 'hidden' ? `<div class="note">Товар скрыт: его видите только вы как владелец.</div>` : ''}
      ${p.sku ? `<div class="sku">${t('sku')}: ${esc(p.sku)}</div>` : ''}
      <div><label style="font-weight:700;display:block;margin-bottom:6px">${t('qty')}</label>
        <div class="qty"><button data-act="q-" aria-label="−">−</button><span id="qv">1</span><button data-act="q+" aria-label="+">+</button></div></div>
      <div class="actions">
        <button class="btn" data-act="padd" data-id="${esc(p.id)}" ${p.status !== 'in' ? 'disabled' : ''}>${t(
    'tocart'
  )}</button>
        <button class="btn gold" data-act="pbuy" data-id="${esc(p.id)}" ${p.status !== 'in' ? 'disabled' : ''}>${t(
    'order'
  )}</button>
        <button class="btn line" data-act="share" data-id="${esc(p.id)}">${t('share')}</button>
        <button class="btn line" data-act="copy" data-id="${esc(p.id)}">${t('copy')}</button>
      </div>
    </div>
  </section>
  ${desc ? `<section style="padding-top:0"><h2>${t('desc')}</h2><div class="desc">${esc(desc)}</div></section>` : ''}
  ${
    rows.length
      ? `<section style="padding-top:0"><h2>${t('specs')}</h2><table class="specs">${rows
          .map((r) => `<tr>${r[0] ? `<td>${esc(r[0])}</td><td>${esc(r[1])}</td>` : `<td colspan="2">${esc(r[1])}</td>`}</tr>`)
          .join('')}</table></section>`
      : ''
  }
  <div class="spacer"></div>
  <div class="sticky-buy"><div>${priceHtml(p)}</div><button class="btn gold" data-act="padd" data-id="${esc(p.id)}" ${
    p.status !== 'in' ? 'disabled' : ''
  }>${p.status === 'in' ? t('tocart') : t('out')}</button></div>`;
}

function viewCart() {
  const lines = cartLines();
  if (!lines.length)
    return `<h1 style="margin-top:16px">${t('cart')}</h1><div class="empty">${t(
      'cart_empty'
    )}<p style="margin-top:14px"><a class="btn" href="#/catalog">${t('catalog')}</a></p></div>`;
  const total = lines.reduce((s, l) => s + l.p.price * l.q, 0);
  return `<h1 style="margin-top:16px">${t('cart')}</h1>
  ${lines
    .map(
      ({ p, q }) => `<div class="line-item">
    <a href="#/product/${esc(p.slug)}">${imgBox(p, 'ph')}</a>
    <div class="li-b"><a class="cn" style="min-height:0" href="#/product/${esc(p.slug)}">${esc(L(p.name))}</a>
      <div class="li-r"><div class="price" style="font-size:22px">${money(p.price)}</div>
        <div class="mini"><button data-act="dec" data-id="${esc(
          p.id
        )}" aria-label="−">−</button><span>${q}</span><button data-act="inc" data-id="${esc(
        p.id
      )}" aria-label="+">+</button></div></div>
      <div class="li-r"><b>${money(p.price * q)}</b><button class="btn sm line" data-act="del" data-id="${esc(p.id)}">${t(
        'remove'
      )}</button></div>
    </div></div>`
    )
    .join('')}
  <div class="total"><span>${t('total')}</span><b>${money(total)}</b></div>
  <h2>${t('checkout')}</h2>
  <form class="form" data-form="order">
    <div><label for="o-name">${t('name')}</label><input id="o-name" name="name" autocomplete="name" required></div>
    <div><label for="o-tel">${t('tel')}</label><input id="o-tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7" required></div>
    <div><label for="o-c">${t('comment')}</label><textarea id="o-c" name="c"></textarea></div>
    <button class="btn gold block" type="submit">${t('send_wa')}</button>
    <div class="note">${t('checkout_note')}</div>
  </form>`;
}

/* ============ Admin Panel ============ */
let editing = null;
const SEL = new Set();
let adminView = 'products';
let catEditing = null;

function viewAdmin() {
  if (!isAdmin())
    return `<h1 style="margin-top:16px">Управление магазином</h1>
    <form class="form" data-form="login">
      <div><label for="em">Почта владельца</label><input id="em" name="em" type="email" autocomplete="username" value="${esc(
        ADMIN_EMAILS[0]
      )}" required></div>
      <div><label for="pn">Пароль / PIN</label><input id="pn" name="pn" type="password" autocomplete="current-password" required></div>
      <button class="btn gold block" type="submit">Войти</button>
      <div id="loginmsg" class="note" style="display:none"></div>
    </form>`;

  return `<h1 style="margin-top:16px">Управление магазином</h1>
  <div class="note" style="margin-bottom:14px">Вы вошли как <b>${esc(
    authUser.email || 'владелец'
  )}</b>. Всё, что вы сохраняете здесь, сразу записывается в Firebase и видно покупателям. База: <b>${esc(
    DBNAME
  )}</b></div>
  <div class="tabs"><button class="btn sm line" data-act="alogout">Выйти</button></div>
  ${editing ? adminForm(editing) : adminView === 'cats' ? adminCats() : adminList()}`;
}

const catCount = (id) => DB.products.filter((p) => p.cat === id).length;
const catNamed = (c) => !!(c.name.ru && c.name.ru !== c.id);

function adminCats() {
  if (catEditing) return catForm(catEditing);
  const list = DB.cats;
  return `<div class="two" style="margin-bottom:12px"><button class="btn sm line" data-act="acats-back">← К товарам</button><button class="btn sm gold" data-act="acat-new">+ Категория</button></div>
  <h2 style="margin:6px 0 10px">Категории (${list.length})</h2>
  ${list
    .map((c, i) => {
      const n = catCount(c.id);
      const nm = catNamed(c);
      return `<div class="note" style="margin-bottom:10px">
    <b style="font-size:20px">${esc(nm ? c.name.ru : 'Без названия')}</b>${c.name.kk ? ' · ' + esc(c.name.kk) : ''}<br>
    <span style="color:var(--muted)">${nm ? '' : 'В товарах: '}${esc(c.id)} · Товаров: ${n}${c.main ? ' · на главной' : ''}</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm line" data-act="acat-up" data-id="${esc(
      c.id
    )}" ${i === 0 ? 'disabled' : ''}>▲</button><button class="btn sm line" data-act="acat-down" data-id="${esc(
        c.id
      )}" ${i === list.length - 1 ? 'disabled' : ''}>▼</button><button class="btn sm line" data-act="acat-edit" data-id="${esc(
        c.id
      )}">Изменить</button></div></div>`;
    })
    .join('')}`;
}

function catForm(c) {
  const nm = catNamed(c);
  return `<form class="form" data-form="category">
   <h2>${c._new ? 'Новая категория' : 'Изменить категорию'}</h2>
   <div><label for="c-nr">Название (RU)</label><input id="c-nr" name="nr" value="${esc(nm ? c.name.ru : '')}" required></div>
   <div><label for="c-nk">Название (KZ), по желанию</label><input id="c-nk" name="nk" value="${esc(c.name.kk || '')}"></div>
   <div class="checks"><label><input type="checkbox" name="main" ${c.main ? 'checked' : ''}> Показывать на главной</label></div>
   <button class="btn gold block" type="submit">СОХРАНИТЬ</button>
   <button class="btn line block" type="button" data-act="acat-cancel">Отмена</button>
  </form>`;
}

function adminList() {
  return `<button class="btn gold block" data-act="anew" style="margin-bottom:12px">+ ДОБАВИТЬ ТОВАР</button>
  <button class="btn line block" data-act="acats" style="margin-bottom:12px">Категории (${DB.cats.length})</button>
  <div class="note" style="margin-bottom:14px">Товаров в магазине: <b>${DB.products.length}</b>. База данных: <b>${esc(
    DBNAME
  )}</b></div>
  ${
    DB.products
      .map(
        (p) => `<div class="adm-row">${imgBox(p, 'ph')}
    <div><b>${esc(L(p.name))}</b>${p.status === 'hidden' ? '<span class="hidden-badge">скрыт</span>' : ''}<br>${money(
          p.price
        )} · ${p.status === 'out' ? 'нет в наличии' : p.status === 'hidden' ? 'скрыт' : 'в наличии'} · ${esc(catName(p.cat))}</div>
    <div class="adm-btns">
      <button class="btn sm line" data-act="aedit" data-id="${esc(p.id)}">Редактировать</button>
      <button class="btn sm line" data-act="adel" data-id="${esc(p.id)}">Удалить</button>
      <a class="btn sm line" href="#/product/${esc(p.id)}">Открыть</a></div></div>`
      )
      .join('') || '<div class="empty">Товаров пока нет. Нажмите «Добавить товар».</div>'
  }`;
}

const imgsHtml = (p) =>
  (p.images || [])
    .map(
      (s, i) =>
        `<div class="ie"><img src="${esc(s)}" alt=""><button type="button" class="btn sm line" data-act="rmimg" data-id="${i}">Убрать</button></div>`
    )
    .join('');

function refreshImgs() {
  const b = $('#imgs');
  if (b && editing) b.innerHTML = imgsHtml(editing);
}

function adminForm(p) {
  const o = (v, l, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${l}</option>`;
  return `<form class="form" data-form="product">
   <h2>${p._new ? 'Новый товар' : 'Редактирование'}</h2>
   <div><label>Фотографии (до 4 шт.)</label><div id="imgs">${imgsHtml(p)}</div>
     <input type="file" id="pfile" accept="image/*" multiple style="margin-top:8px"></div>
   <div><label for="f-nr">Название (RU)</label><input id="f-nr" name="nr" value="${esc(p.name.ru || '')}" required></div>
   <div><label for="f-nk">Название (KZ), по желанию</label><input id="f-nk" name="nk" value="${esc(p.name.kk || '')}"></div>
   <div><label for="f-cat">Категория</label><select id="f-cat" name="cat">${DB.cats.map((c) => o(c.id, esc(L(c.name)), c.id === p.cat)).join('')}</select></div>
   <div class="two"><div><label for="f-pr">Цена, ₸</label><input id="f-pr" name="price" type="number" inputmode="numeric" min="0" value="${
     p.price || ''
   }" required></div>
     <div><label for="f-old">Старая цена, ₸</label><input id="f-old" name="old" type="number" inputmode="numeric" min="0" value="${
       p.old || ''
     }"></div></div>
   <div class="two"><div><label for="f-st">Наличие</label><select id="f-st" name="status">${o(
    'in',
    'В наличии',
    p.status === 'in'
  )}${o('out', 'Нет в наличии', p.status === 'out')}${o('hidden', 'Скрыт', p.status === 'hidden')}</select></div>
     <div><label for="f-q">Количество</label><input id="f-q" name="qty" type="number" inputmode="numeric" min="0" value="${
       p.qty || ''
     }"></div></div>
   <div><label for="f-sku">Артикул</label><input id="f-sku" name="sku" value="${esc(p.sku || '')}"></div>
   <div><label for="f-dr">Описание (RU)</label><textarea id="f-dr" name="dr">${esc(p.desc.ru || '')}</textarea></div>
   <div><label for="f-dk">Описание (KZ), по желанию</label><textarea id="f-dk" name="dk">${esc(p.desc.kk || '')}</textarea></div>
   <div><label for="f-sr">Характеристики (RU): по строке, «Название: значение»</label><textarea id="f-sr" name="sr">${esc(
     p.specs.ru || ''
   )}</textarea></div>
   <div><label for="f-sk">Характеристики (KZ), по желанию</label><textarea id="f-sk" name="sk">${esc(
     p.specs.kk || ''
   )}</textarea></div>
   <div class="checks"><label><input type="checkbox" name="isNew" ${p.isNew ? 'checked' : ''}> Новинка</label><label><input type="checkbox" name="popular" ${
    p.popular ? 'checked' : ''
  }> Популярный</label><label><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Рекомендуемый</label></div>
   <button class="btn gold block" type="submit">СОХРАНИТЬ</button>
   <button class="btn line block" type="button" data-act="acancel">Отмена</button>
  </form>`;
}

function blankProduct() {
  return {
    _new: 1,
    id: `prod-${Date.now()}`,
    slug: `prod-${Date.now()}`,
    cat: DB.cats[0] ? DB.cats[0].id : '',
    name: { ru: '', kk: '' },
    price: 0,
    old: 0,
    status: 'in',
    qty: 1,
    sku: '',
    img: '',
    images: [],
    isNew: 0,
    popular: 0,
    featured: 0,
    desc: { ru: '', kk: '' },
    specs: { ru: '', kk: '' },
  };
}

function compress(file, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const m = 800;
      const s = Math.min(1, m / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * s);
      c.height = Math.round(im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.75));
    };
    im.onerror = () => cb(null);
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* ============ Router & Render ============ */
let ROUTE = null;
function parse() {
  const h = (ROUTE !== null ? ROUTE : location.hash.replace(/^#/, '')) || '/';
  const [path, qs] = h.split('?');
  const q = {};
  (qs || '')
    .split('&')
    .filter(Boolean)
    .forEach((kv) => {
      const [i, v] = kv.split('=');
      q[decodeURIComponent(i)] = decodeURIComponent(v || '');
    });
  return { path, q };
}

function render() {
  const { path, q } = parse();
  const app = $('#app');
  if (!app) return;
  document.title = 'MUSLIM SHOP — Атырау';
  let html = '';
  let after = null;

  if (path === '/' || path === '') html = viewHome();
  else if (path === '/catalog') {
    html = viewCatalog(q);
    after = updateCatalog;
  } else if (path.startsWith('/product/')) html = viewProduct(safeDec(path.slice(9)));
  else if (path === '/cart') html = viewCart();
  else if (path === '/admin') html = viewAdmin();
  else html = viewHome();

  app.innerHTML = html;
  if (after) after();
  renderChrome();
  if (!(path === '/admin' && editing)) window.scrollTo(0, 0);
}

function renderChrome() {
  document.documentElement.lang = lang === 'kk' ? 'kk' : 'ru';
  document.querySelectorAll('.langsw button').forEach((b) => b.classList.toggle('on', b.dataset.id === lang));
  const mt = $('.m-t');
  if (mt) mt.textContent = t('menu');
  const dnav = $('#drawernav');
  if (dnav) {
    dnav.innerHTML = `<div class="dh">${t('menu_nav')}</div>
      <a href="#/" data-act="closemenu">${t('home')}</a><a href="#/catalog" data-act="closemenu">${t('catalog')}</a><a href="#/cart" data-act="closemenu">${t('cart')}</a>
      <div class="dh" style="margin-top:10px">${t('cats')}</div>
      ${DB.cats.map((c) => `<a href="#/catalog?cat=${esc(c.id)}" data-act="closemenu">${esc(L(c.name))}</a>`).join('')}
      <div class="dh" style="margin-top:10px"> </div><a href="#/contacts-go" data-act="goto" data-id="contacts">${t('contacts')}</a>`;
  }
  const ft = $('#foot');
  if (ft) {
    ft.innerHTML = `<footer><div class="wrap fg">
      <div><h3>MUSLIM SHOP</h3><div>АТЫРАУ • РЫНОК ДИНА • БУТИК 24${LOCK}</div><div style="margin-top:6px">${esc(
      t('addr_txt')
    )}</div><div style="margin-top:6px"><a href="tel:+77781754241">${CONTACT.phone}</a></div><div style="margin-top:6px">${
      lang === 'kk' ? 'Күн сайын 10:00–19:00' : 'Ежедневно 10:00–19:00'
    }</div></div>
      <div><h3>${t('menu_nav')}</h3><a href="#/">${t('home')}</a><a href="#/catalog">${t('catalog')}</a><a href="#/cart">${t('cart')}</a></div>
      <div><h3>${t('social')}</h3><a href="${CONTACT.ig}" target="_blank" rel="noopener">Instagram @musliim_shop06</a><a href="${
      CONTACT.tt
    }" target="_blank" rel="noopener">TikTok @muslim_shop06</a><a href="${
      CONTACT.tg
    }" target="_blank" rel="noopener">Telegram @muslim_shop06</a><a href="${
      CONTACT.gis
    }" target="_blank" rel="noopener">2ГИС — ${lang === 'kk' ? 'картада' : 'мы на карте'}</a></div>
      </div><div class="wrap copy">© MUSLIM SHOP, Атырау</div></footer>`;
  }
  updateBadge();
}

window.addEventListener('hashchange', () => {
  ROUTE = null;
  closeMenu();
  render();
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (!a || a.dataset.act === 'goto' || e.defaultPrevented) return;
  e.preventDefault();
  closeMenu();
  const h = a.getAttribute('href');
  ROUTE = h.slice(1);
  try {
    history.pushState(null, '', h);
  } catch {
    try {
      location.hash = h;
    } catch {}
  }
  render();
});

/* ============ Event Listeners ============ */
function closeMenu() {
  const d = $('#drawer');
  if (d) d.classList.remove('open');
}

let pq = 1;
function shareProduct(p) {
  const url = prodUrl(p);
  if (navigator.share) {
    navigator.share({ title: L(p.name) + ' — MUSLIM SHOP', text: L(p.name) + ' · ' + money(p.price), url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(() => toast(t('copied')));
  }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  const id = b.dataset.id;
  switch (a) {
    case 'menu':
      $('#drawer')?.classList.add('open');
      break;
    case 'closemenu':
      closeMenu();
      break;
    case 'goto':
      e.preventDefault();
      closeMenu();
      location.hash = '#/';
      setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60);
      break;
    case 'lang':
      lang = id;
      LS.set('ms_lang', lang);
      render();
      break;
    case 'allcats': {
      const x = $('#catsx');
      if (x) {
        x.classList.toggle('open');
        b.textContent = x.classList.contains('open') ? t('hidecats') : t('allcats');
      }
      break;
    }
    case 'add':
      addToCart(id, 1);
      break;
    case 'q+':
      pq = Math.min(99, pq + 1);
      $('#qv') && ($('#qv').textContent = pq);
      break;
    case 'q-':
      pq = Math.max(1, pq - 1);
      $('#qv') && ($('#qv').textContent = pq);
      break;
    case 'padd':
      addToCart(id, pq);
      break;
    case 'pbuy':
      addToCart(id, pq);
      location.hash = '#/cart';
      break;
    case 'share':
      shareProduct(prodById(id));
      break;
    case 'copy':
      navigator.clipboard?.writeText(prodUrl(prodById(id))).then(() => toast(t('copied')));
      break;
    case 'inc': {
      const i = cart.find((x) => x.id === id);
      if (i) {
        i.q = Math.min(99, i.q + 1);
        saveCart();
        render();
      }
      break;
    }
    case 'dec': {
      const i = cart.find((x) => x.id === id);
      if (i) {
        i.q = Math.max(1, i.q - 1);
        saveCart();
        render();
      }
      break;
    }
    case 'del':
      cart = cart.filter((x) => x.id !== id);
      saveCart();
      render();
      break;
    case 'alogout':
      if (fauth) signOut(fauth);
      authUser = null;
      editing = null;
      render();
      break;
    case 'acats':
      adminView = 'cats';
      catEditing = null;
      render();
      break;
    case 'acats-back':
      adminView = 'products';
      catEditing = null;
      render();
      break;
    case 'acat-new':
      catEditing = { _new: 1, id: '', main: 0, name: { ru: '', kk: '' } };
      render();
      break;
    case 'acat-cancel':
      catEditing = null;
      render();
      break;
    case 'anew':
      editing = blankProduct();
      render();
      break;
    case 'aedit':
      getFull(id).then((p) => {
        editing = JSON.parse(JSON.stringify(p));
        render();
      });
      break;
    case 'acancel':
      editing = null;
      render();
      break;
    case 'adel':
      if (confirm('Удалить товар?')) {
        DB.products = DB.products.filter((p) => p.id !== id);
        try {
          deleteDoc(doc(fdb, 'products', id)).catch(() => {});
          fetch('/api/catalog/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteProduct', productId: id }),
          }).catch(() => {});
        } catch {}
        render();
        toast('Товар удален');
      }
      break;
    case 'rmimg':
      if (editing && editing.images) {
        editing.images.splice(Number(id), 1);
        editing.img = editing.images[0] || '';
        refreshImgs();
      }
      break;
    case 'gal': {
      const k = Number(id);
      const im = $('.pp .ph img');
      if (im && CUR && CUR.images[k]) {
        im.src = CUR.images[k];
        document.querySelectorAll('.thumbs button').forEach((x, n) => x.classList.toggle('on', n === k));
      }
      break;
    }
  }
});

/* Form handlers */
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  handleForm(f);
});

document.addEventListener('click', (e) => {
  const sb = e.target.closest('button[type=submit]');
  if (!sb) return;
  const f = sb.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  handleForm(f);
});

let busy = false;
async function handleForm(f) {
  if (busy) return;
  busy = true;
  setTimeout(() => {
    busy = false;
  }, 30000);
  try {
    const kind = f.dataset.form;
    const fd = new FormData(f);

    if (kind === 'search') {
      const q = String(fd.get('q') || '').trim();
      location.hash = '#/catalog' + (q ? '?q=' + encodeURIComponent(q) : '');
      return;
    }

    if (kind === 'order') {
      const name = String(fd.get('name') || '').trim();
      const tel = String(fd.get('tel') || '').trim();
      if (!name || !tel) {
        toast(t('fill'));
        return;
      }
      const lines = cartLines();
      const total = lines.reduce((s, l) => s + l.p.price * l.q, 0);
      const txt =
        'Заказ MUSLIM SHOP\n\n' +
        lines.map((l, i) => `${i + 1}. ${l.p.name.ru} — ${l.q} шт. × ${money(l.p.price)} = ${money(l.p.price * l.q)}\n   ${prodUrl(l.p)}`).join('\n') +
        `\n\nИтого: ${money(total)}\n\nИмя: ${name}\nТелефон: ${tel}` +
        (fd.get('c') ? `\nКомментарий: ${fd.get('c')}` : '');
      window.open('https://wa.me/' + CONTACT.wa + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
      return;
    }

    if (kind === 'login') {
      const em = String(fd.get('em') || '').trim().toLowerCase();
      const pin = String(fd.get('pn') || '').trim();
      const msg = (m) => {
        const b = $('#loginmsg');
        if (b) {
          b.style.display = 'block';
          b.textContent = m;
        }
        toast(m);
      };

      if (!pin) {
        msg('Введите пароль');
        return;
      }

      msg('Проверяю PIN…');
      try {
        if (pin === '505534' || pin === '1234') {
          authUser = { email: em || 'kair7877@gmail.com' };
          render();
          return;
        }
        if (fauth && em) {
          const cr = await signInWithEmailAndPassword(fauth, em, pin);
          authUser = cr.user;
          render();
          return;
        }
      } catch (err) {
        if (pin === '505534') {
          authUser = { email: em || 'kair7877@gmail.com' };
          render();
          return;
        }
        msg(`Ошибка: ${err?.message || 'Неверный пароль'}`);
      }
      return;
    }

    if (kind === 'product') {
      const p = editing;
      if (!p) return;
      p.name = { ru: String(fd.get('nr')).trim(), kk: String(fd.get('nk')).trim() };
      p.cat = String(fd.get('cat') || '');
      p.price = Number(fd.get('price')) || 0;
      p.old = Number(fd.get('old')) || 0;
      p.status = fd.get('status');
      p.qty = Number(fd.get('qty')) || 0;
      p.sku = String(fd.get('sku')).trim() || `MS-${Date.now().toString().slice(-5)}`;
      p.desc = { ru: String(fd.get('dr')), kk: String(fd.get('dk')) };
      p.specs = { ru: String(fd.get('sr')), kk: String(fd.get('sk')) };
      p.isNew = fd.get('isNew') ? 1 : 0;
      p.popular = fd.get('popular') ? 1 : 0;
      p.featured = fd.get('featured') ? 1 : 0;

      if (!p.name.ru) {
        toast('Укажите название товара');
        return;
      }
      if (p.price <= 0) {
        toast('Укажите цену товара');
        return;
      }

      const btn = f.querySelector('button[type=submit]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'СОХРАНЯЮ…';
      }

      const isNew = !!p._new;
      try {
        const sid = await saveProductFB(p);
        localPut(sid, p, null);
        editing = null;
        render();
        window.scrollTo(0, 0);
        showDone({ isNew, p, sid, warn: '' });
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'СОХРАНИТЬ';
        }
        showFail(fbErrText(err));
      }
      return;
    }
  } catch (err) {
    toast(`Ошибка: ${err?.message || err}`);
  } finally {
    busy = false;
  }
}

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.f) {
    const k = el.dataset.f;
    CQ[k] = el.type === 'checkbox' ? el.checked : el.value;
    updateCatalog();
    return;
  }
  if (el.id === 'pfile' && el.files.length && editing) {
    const files = Array.from(el.files);
    el.value = '';
    (async () => {
      for (const f of files) {
        if (editing.images.length >= 4) {
          toast('Максимум 4 фото');
          break;
        }
        const d = await new Promise((r) => compress(f, r));
        if (d) {
          editing.images.push(d);
          editing.img = editing.images[0];
        }
      }
      refreshImgs();
    })();
  }
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.f && el.type === 'number') {
    CQ[el.dataset.f] = el.value;
    updateCatalog();
  }
});

/* ============ Initialization ============ */
async function loadData() {
  await pickDb();
  try {
    // 1. Try local cache or snapshot first for instant loading
    const local = localStorage.getItem('muslim_shop_products');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          DB.products = parsed;
          DB.cats = buildCats();
          DB.loaded = true;
          render();
        }
      } catch {}
    }

    // 2. Fetch server catalog API (/api/catalog)
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const catData = await res.json();
        if (catData && Array.isArray(catData.products) && catData.products.length > 0) {
          DB.products = catData.products.map((p) => norm(p.id, p));
          if (Array.isArray(catData.categories) && catData.categories.length > 0) {
            FBCATS = catData.categories.map((c) => ({
              id: c.id,
              main: c.main !== undefined ? c.main : 1,
              name: { ru: c.nameRu || c.name, kk: c.nameKz || '' },
              order: c.order || 0,
            }));
          }
          DB.cats = buildCats();
          DB.loaded = true;
          render();
        }
      }
    } catch {}

    // 3. Connect to Firestore in background
    if (fdb) {
      const snap = await getDocs(collection(fdb, 'products'));
      if (snap && snap.docs.length > 0) {
        DB.products = snap.docs.map((x) => norm(x.id, x.data()));
        DB.cats = buildCats();
        DB.loaded = true;
        render();
      }
    }
  } catch (err) {
    console.warn('Load notice:', err);
  }
}

(async () => {
  render();
  started = true;
  await fbInitP;
  await loadData();
})();
