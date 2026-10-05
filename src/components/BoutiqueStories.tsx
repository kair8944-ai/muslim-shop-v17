import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Flame,
  MapPin,
  ShieldCheck,
  Truck,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { Language, Product, StoreConfig } from '../types';
import { formatPrice } from '../utils/formatters';

interface BoutiqueStoriesProps {
  products: Product[];
  config: StoreConfig;
  lang: Language;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onSelectCategory: (categoryId: string) => void;
}

interface StorySlide {
  id: string;
  type: 'product' | 'info';
  product?: Product;
  badgeRu: string;
  badgeKz: string;
  titleRu: string;
  titleKz: string;
  subtitleRu: string;
  subtitleKz: string;
  bulletsRu?: string[];
  bulletsKz?: string[];
  ctaLabelRu?: string;
  ctaLabelKz?: string;
  ctaUrl?: string;
  ctaCategory?: string;
  bgGradient: string;
}

interface StoryGroup {
  id: string;
  titleRu: string;
  titleKz: string;
  tagRu: string;
  tagKz: string;
  ringGradient: string;
  coverImage?: string;
  iconType: 'new' | 'hits' | 'location' | 'authentic' | 'delivery';
  slides: StorySlide[];
}

const SEEN_STORIES_STORAGE_KEY = 'muslim_shop_seen_stories_v1';

export const BoutiqueStories: React.FC<BoutiqueStoriesProps> = ({
  products,
  config,
  lang,
  onOpenProduct,
  onAddToCart,
  onSelectCategory,
}) => {
  const isKz = lang === 'kz';
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [shuffleSeed] = useState<number>(() => Math.floor(Math.random() * 10000));
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SEEN_STORIES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Build dynamic Story Groups from live catalog products & store config
  const storyGroups: StoryGroup[] = useMemo(() => {
    const inStockProducts = products.filter((p) => p.inStock && p.images && p.images[0]);

    // Deterministic rotation based on shuffleSeed so every refresh or click on "Обновить" shows fresh products
    const rotateList = (list: Product[], count: number, offset: number): Product[] => {
      if (list.length <= count) return list;
      const rotated = [...list].sort((a, b) => {
        const hashA = ((a.id.charCodeAt(a.id.length - 1) || 1) * 31 + shuffleSeed + offset) % 97;
        const hashB = ((b.id.charCodeAt(b.id.length - 1) || 1) * 31 + shuffleSeed + offset) % 97;
        return hashA - hashB;
      });
      return rotated.slice(0, count);
    };

    const newPool = inStockProducts.filter((p) => p.isNew);
    const hitPool = inStockProducts.filter((p) => p.isHit);

    const effectiveNew =
      newPool.length >= 2
        ? rotateList(newPool, 5, 11)
        : rotateList(inStockProducts, 5, 11);

    const effectiveHits =
      hitPool.length >= 2
        ? rotateList(hitPool, 5, 29)
        : rotateList(inStockProducts, 5, 29);

    // 1. Новое поступление
    const newSlides: StorySlide[] =
      effectiveNew.length > 0
        ? effectiveNew.map((prod) => ({
            id: `new-${prod.id}`,
            type: 'product',
            product: prod,
            badgeRu: 'Свежее поступление • В наличии',
            badgeKz: 'Жаңа түсілім • Қолда бар',
            titleRu: prod.titleRu,
            titleKz: prod.titleKz || prod.titleRu,
            subtitleRu:
              prod.descriptionRu?.slice(0, 120) + (prod.descriptionRu && prod.descriptionRu.length > 120 ? '...' : ''),
            subtitleKz:
              (prod.descriptionKz || prod.descriptionRu || '').slice(0, 120) + '...',
            bgGradient: 'from-[#041E16] via-[#062c21] to-stone-950',
          }))
        : [
            {
              id: 'new-fallback',
              type: 'info',
              badgeRu: 'Новое поступление',
              badgeKz: 'Жаңа түсілім',
              titleRu: 'Свежая поставка витаминов iHerb и Халяль продукции в Бутике №24',
              titleKz: '№24 Бутикте iHerb дәрумендері мен Халал өнімдердің жаңа түсілімі',
              subtitleRu: 'Все самые востребованные позиции уже на полках нашего бутика в Атырау.',
              subtitleKz: 'Ең сұранысқа ие өнімдер Атыраудағы бутигіміздің сөрелерінде тұр.',
              ctaLabelRu: 'Смотреть новинки',
              ctaLabelKz: 'Жаңа өнімдерді көру',
              ctaCategory: 'cat-new',
              bgGradient: 'from-[#041E16] via-emerald-950 to-stone-950',
            },
          ];

    // 2. Хиты продаж
    const hitSlides: StorySlide[] =
      effectiveHits.length > 0
        ? effectiveHits.map((prod) => ({
            id: `hit-${prod.id}`,
            type: 'product',
            product: prod,
            badgeRu: 'Хит продаж Бутика №24',
            badgeKz: '№24 Бутиктің нағыз хиті',
            titleRu: prod.titleRu,
            titleKz: prod.titleKz || prod.titleRu,
            subtitleRu:
              prod.descriptionRu?.slice(0, 120) + (prod.descriptionRu && prod.descriptionRu.length > 120 ? '...' : ''),
            subtitleKz:
              (prod.descriptionKz || prod.descriptionRu || '').slice(0, 120) + '...',
            bgGradient: 'from-stone-950 via-[#1f1605] to-[#041E16]',
          }))
        : [
            {
              id: 'hits-fallback',
              type: 'info',
              badgeRu: 'Выбор покупателей',
              badgeKz: 'Сатып алушылар таңдауы',
              titleRu: 'Топ-товары, которые чаще всего заказывают в Атырау',
              titleKz: 'Атырауда ең жиі тапсырыс берілетін ТОП өнімдер',
              subtitleRu: 'Проверенные комплексы для всей семьи с реальными отзывами.',
              subtitleKz: 'Бүкіл отбасыға арналған тексерілген кешендер.',
              ctaLabelRu: 'Перейти к хитам',
              ctaLabelKz: 'Хит өнімдерді көру',
              ctaCategory: 'cat-hits',
              bgGradient: 'from-stone-950 via-amber-950 to-emerald-950',
            },
          ];

    // 3. Как нас найти в Дине
    const locationSlides: StorySlide[] = [
      {
        id: 'loc-1',
        type: 'info',
        badgeRu: 'Бутик №24 • Атырау',
        badgeKz: '№24 Бутик • Атырау',
        titleRu: 'Ждём вас в ТД «Дина Байзар», Бутик №24',
        titleKz: 'Сіздерді «Дина Байзар» СҮ, №24 бутикте күтеміз',
        subtitleRu:
          'Приходите лично выбрать витамины, натуральный мёд, масла и восточные миски с профессиональной консультацией.',
        subtitleKz:
          'Дәрумендерді, табиғи балды, майларды және шығыс хош иістерін кеңесші көмегімен таңдауға келіңіз.',
        bulletsRu: [
          `📍 Адрес: ${config.address}`,
          `🕙 График: ${config.workingHoursRu}`,
          '🅿️ Удобный вход и быстрая выдача онлайн-заказов без очереди',
          '💳 Оплата Kaspi QR / Kaspi Gold / Наличными',
        ],
        bulletsKz: [
          `📍 Мекенжай: ${config.address}`,
          `🕙 Жұмыс уақыты: ${config.workingHoursKz}`,
          '🅿️ Ыңғайлы кіру және онлайн тапсырыстарды кезексіз алу',
          '💳 Kaspi QR / Kaspi Gold / Қолма-қол төлем',
        ],
        ctaLabelRu: 'Открыть маршрут в 2ГИС',
        ctaLabelKz: '2ГИС арқылы маршрут ашу',
        ctaUrl: config.gis2Url,
        bgGradient: 'from-[#041E16] via-emerald-900 to-stone-950',
      },
    ];

    // 4. 100% Оригинал & Халяль
    const authenticSlides: StorySlide[] = [
      {
        id: 'auth-1',
        type: 'info',
        badgeRu: 'Гарантия качества',
        badgeKz: 'Сапа кепілдігі',
        titleRu: '100% Оригинал iHerb и строгий стандарт Халяль',
        titleKz: '100% Түпнұсқа iHerb және қатаң Халал стандарты',
        subtitleRu:
          'Мы дорожим доверием каждой семьи в Атырау и отбираем только проверенные добавки и натуральные средства.',
        subtitleKz:
          'Біз Атыраудағы әрбір отбасының сенімін бағалаймыз және тек тексерілген табиғи өнімдерді ұсынамыз.',
        bulletsRu: [
          '✅ Прямые поставки оригинальных брендов США (Now Foods, Solgar, California Gold, ChildLife)',
          '✅ Чистый состав без запрещённого желатина и сомнительных добавок',
          '✅ Строгий контроль сроков годности и правильное хранение в бутике',
          '✅ Поможем подобрать дозировку для взрослых и детей',
        ],
        bulletsKz: [
          '✅ АҚШ-тың түпнұсқа брендтерінен тікелей жеткізу (Now Foods, Solgar, California Gold)',
          '✅ Құрамында тыйым салынған желатин мен күмәнді қоспалар жоқ',
          '✅ Жарамдылық мерзімін қатаң бақылау және дұрыс сақтау',
          '✅ Ересектер мен балаларға мөлшерін таңдауға көмектесеміз',
        ],
        ctaLabelRu: 'Смотреть витамины iHerb',
        ctaLabelKz: 'iHerb дәрумендерін көру',
        ctaCategory: 'cat-iherb',
        bgGradient: 'from-stone-950 via-emerald-950 to-[#041E16]',
      },
    ];

    // 5. Быстрая доставка
    const deliverySlides: StorySlide[] = [
      {
        id: 'deliv-1',
        type: 'info',
        badgeRu: 'Доставка в день заказа',
        badgeKz: 'Тапсырыс күні жеткізу',
        titleRu: 'Быстрая доставка по Атырау и отправка по всему Казахстану',
        titleKz: 'Атырау қаласы бойынша жылдам жеткізу және Қазақстанға жөнелту',
        subtitleRu:
          'Не нужно ждать посылку из-за рубежа 3 недели — всё уже в наличии в Бутике №24!',
        subtitleKz:
          'Шетелден 3 апта күтудің қажеті жоқ — барлық тауар №24 Бутикте дайын тұр!',
        bulletsRu: [
          '🚀 Курьер по г. Атырау — отправим сразу после подтверждения заказа',
          '🛍️ Самовывоз из Бутика №24 — соберём ваш пакет заранее к вашему приезду',
          '📦 Отправка по РК — Казпочта, СДЭК, Индрайвер в любой город и район',
          '💬 Заказ в 1 клик через сайт или напрямую в WhatsApp',
        ],
        bulletsKz: [
          '🚀 Атырау бойынша курьер — тапсырыс расталған соң бірден жібереміз',
          '🛍️ №24 Бутиктен алып кету — келуіңізге тапсырысты алдын ала дайындап қоямыз',
          '📦 ҚР бойынша жеткізу — Қазпошта, СДЭК, Индрайвер барлық өңірге',
          '💬 Сайттан 1 басу арқылы немесе WhatsApp-та оңай рәсімдеу',
        ],
        ctaLabelRu: 'Написать менеджеру в WhatsApp',
        ctaLabelKz: 'WhatsApp-қа жазу',
        ctaUrl: `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
          isKz
            ? 'Сәлеметсіз бе! Жеткізу бойынша тапсырыс бергім келеді.'
            : 'Здравствуйте! Хочу оформить заказ с доставкой из Бутика №24.'
        )}`,
        bgGradient: 'from-[#041E16] via-[#0c3b2c] to-stone-950',
      },
    ];

    return [
      {
        id: 'story-new',
        titleRu: 'Новинки',
        titleKz: 'Жаңалықтар',
        tagRu: 'НОВОЕ',
        tagKz: 'ЖАҢА',
        ringGradient: 'from-amber-400 via-emerald-500 to-amber-500',
        coverImage: effectiveNew[0]?.images?.[0],
        iconType: 'new',
        slides: newSlides,
      },
      {
        id: 'story-hits',
        titleRu: 'Хиты №24',
        titleKz: 'Хиттер №24',
        tagRu: 'ТОП',
        tagKz: 'ТОП',
        ringGradient: 'from-amber-500 via-orange-500 to-amber-300',
        coverImage: effectiveHits[0]?.images?.[0],
        iconType: 'hits',
        slides: hitSlides,
      },
      {
        id: 'story-location',
        titleRu: 'Как найти нас',
        titleKz: 'Мекенжай',
        tagRu: 'ДИНА №24',
        tagKz: 'ДИНА №24',
        ringGradient: 'from-emerald-400 via-teal-500 to-amber-400',
        iconType: 'location',
        slides: locationSlides,
      },
      {
        id: 'story-authentic',
        titleRu: '100% Оригинал',
        titleKz: '100% Түпнұсқа',
        tagRu: 'ХАЛЯЛЬ',
        tagKz: 'ХАЛАЛ',
        ringGradient: 'from-amber-300 via-emerald-500 to-teal-600',
        iconType: 'authentic',
        slides: authenticSlides,
      },
      {
        id: 'story-delivery',
        titleRu: 'Доставка',
        titleKz: 'Жеткізу',
        tagRu: 'БЫСТРО',
        tagKz: 'ЖЫЛДАМ',
        ringGradient: 'from-emerald-500 via-amber-400 to-emerald-600',
        iconType: 'delivery',
        slides: deliverySlides,
      },
    ];
  }, [products, config, isKz, shuffleSeed]);

  const markGroupSeen = (groupId: string) => {
    setSeenIds((prev) => {
      if (prev.includes(groupId)) return prev;
      const next = [...prev, groupId];
      try {
        localStorage.setItem(SEEN_STORIES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const openStoryGroup = (idx: number) => {
    setActiveGroupIndex(idx);
    setActiveSlideIndex(0);
    setProgress(0);
    markGroupSeen(storyGroups[idx].id);
    try {
      window.history.pushState({ storyViewerOpen: true }, '');
    } catch {}
  };

  const closeStories = () => {
    setActiveGroupIndex(null);
    setActiveSlideIndex(0);
    setProgress(0);
  };

  const handleStoryBackBtn = () => {
    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1);
      setProgress(0);
    } else if (activeGroupIndex !== null && activeGroupIndex > 0) {
      const prevGroupIdx = activeGroupIndex - 1;
      const prevGroup = storyGroups[prevGroupIdx];
      setActiveGroupIndex(prevGroupIdx);
      setActiveSlideIndex(prevGroup.slides.length - 1);
      setProgress(0);
    } else {
      closeStories();
    }
  };

  const activeGroup = activeGroupIndex !== null ? storyGroups[activeGroupIndex] : null;
  const activeSlide = activeGroup ? activeGroup.slides[activeSlideIndex] || activeGroup.slides[0] : null;

  const goNextSlide = () => {
    if (activeGroupIndex === null || !activeGroup) return;
    if (activeSlideIndex < activeGroup.slides.length - 1) {
      setActiveSlideIndex((prev) => prev + 1);
      setProgress(0);
    } else if (activeGroupIndex < storyGroups.length - 1) {
      const nextGroupIdx = activeGroupIndex + 1;
      setActiveGroupIndex(nextGroupIdx);
      setActiveSlideIndex(0);
      setProgress(0);
      markGroupSeen(storyGroups[nextGroupIdx].id);
    } else {
      closeStories();
    }
  };

  const goPrevSlide = () => {
    if (activeGroupIndex === null || !activeGroup) return;
    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1);
      setProgress(0);
    } else if (activeGroupIndex > 0) {
      const prevGroupIdx = activeGroupIndex - 1;
      const prevGroup = storyGroups[prevGroupIdx];
      setActiveGroupIndex(prevGroupIdx);
      setActiveSlideIndex(prevGroup.slides.length - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  // Auto-advance timer for active story slide (6 seconds per slide)
  useEffect(() => {
    if (activeGroupIndex === null || isPaused) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 2;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [activeGroupIndex, activeSlideIndex, isPaused]);

  useEffect(() => {
    if (progress >= 100 && activeGroupIndex !== null) {
      goNextSlide();
    }
  }, [progress, activeGroupIndex]);

  // Escape key, mobile Back button (popstate), & scroll lock when story modal is open
  useEffect(() => {
    if (activeGroupIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStories();
      if (e.key === 'ArrowRight') goNextSlide();
      if (e.key === 'ArrowLeft') goPrevSlide();
    };
    const handlePopState = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      closeStories();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('popstate', handlePopState, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('popstate', handlePopState, true);
    };
  }, [activeGroupIndex, activeSlideIndex]);

  const renderGroupIcon = (type: StoryGroup['iconType']) => {
    switch (type) {
      case 'new':
        return <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />;
      case 'hits':
        return <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />;
      case 'location':
        return <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-300" />;
      case 'authentic':
        return <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />;
      case 'delivery':
        return <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-300" />;
    }
  };

  return (
    <>
      {/* Horizontal Boutique Stories Bar */}
      <section
        id="boutique-stories-bar"
        aria-label={isKz ? 'Бутик стористері' : 'Сторис бутика'}
        className="w-full bg-white border-b border-slate-200 py-3 sm:py-4"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                {isKz ? 'Бутик №24 сторисі • Жылдам шолу' : 'Сторис Бутика №24 • Быстрый обзор'}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">
              {isKz ? 'Түртіп ашыңыз' : 'Нажмите для просмотра'}
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-7 overflow-x-auto no-scrollbar py-1">
            {storyGroups.map((group, idx) => {
              const isSeen = seenIds.includes(group.id);
              return (
                <button
                  key={group.id}
                  id={`story-trigger-${group.id}`}
                  type="button"
                  onClick={() => openStoryGroup(idx)}
                  className="group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none"
                >
                  <div className="relative">
                    {/* Story ring */}
                    <div
                      className={`w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-full p-[3px] transition-transform duration-200 group-hover:scale-105 ${
                        isSeen
                          ? 'bg-slate-300'
                          : `bg-gradient-to-tr ${group.ringGradient} shadow-xs`
                      }`}
                    >
                      <div className="w-full h-full rounded-full bg-white border-2 border-white overflow-hidden flex items-center justify-center relative shadow-inner">
                        {group.coverImage ? (
                          <>
                            <img
                              src={group.coverImage}
                              alt={isKz ? group.titleKz : group.titleRu}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-amber-50 flex items-center justify-center">
                            {renderGroupIcon(group.iconType)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom micro tag */}
                    <span
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider whitespace-nowrap shadow-xs border ${
                        isSeen
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : 'bg-[#ffbd00] text-slate-900 border-[#e5aa00]'
                      }`}
                    >
                      {isKz ? group.tagKz : group.tagRu}
                    </span>
                  </div>

                  <span className="text-xs sm:text-[13px] font-bold text-slate-800 group-hover:text-[#0567BA] transition-colors max-w-[88px] sm:max-w-[104px] truncate mt-1">
                    {isKz ? group.titleKz : group.titleRu}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fullscreen Vertical Story Viewer Modal */}
      {activeGroup &&
        activeSlide &&
        createPortal(
          <div
            id="story-viewer-backdrop"
            className="fixed inset-0 z-[130] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none"
            onClick={closeStories}
          >
            <div
              id="story-viewer-card"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              className={`relative w-full h-full sm:h-[88vh] sm:max-h-[760px] sm:max-w-[420px] sm:rounded-3xl overflow-hidden shadow-2xl border border-amber-400/30 flex flex-col justify-between bg-gradient-to-b ${activeSlide.bgGradient} text-white`}
            >
              {/* Background product photo with dark scrim if product slide */}
              {activeSlide.type === 'product' && activeSlide.product?.images?.[0] && (
                <div className="absolute inset-0 z-0">
                  <img
                    src={activeSlide.product.images[0]}
                    alt={isKz ? activeSlide.titleKz : activeSlide.titleRu}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center opacity-45 scale-105 blur-[2px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/75 to-stone-950/60" />
                </div>
              )}

              {/* Top Section: Progress Bars & Header */}
              <div className="relative z-20 p-4 pt-5 space-y-3 bg-gradient-to-b from-black/70 to-transparent">
                {/* Multi-slide progress segments */}
                <div className="flex items-center gap-1.5">
                  {activeGroup.slides.map((s, idx) => {
                    const fillWidth =
                      idx < activeSlideIndex
                        ? 100
                        : idx === activeSlideIndex
                        ? progress
                        : 0;
                    return (
                      <div
                        key={s.id}
                        className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden"
                      >
                        <div
                          className="h-full bg-amber-400 transition-all duration-100 ease-linear"
                          style={{ width: `${fillWidth}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Story Header with Back & Close Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={handleStoryBackBtn}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/80 text-amber-300 border border-amber-400/40 font-extrabold text-xs transition-colors cursor-pointer shrink-0"
                      aria-label="Назад"
                    >
                      <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{isKz ? 'Артқа' : 'Назад'}</span>
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {isKz ? activeGroup.titleKz : activeGroup.titleRu}
                        </span>
                        <span className="text-[10px] text-amber-300 font-semibold shrink-0">
                          • {config.boutiqueNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-300 truncate">
                        {isKz ? activeSlide.badgeKz : activeSlide.badgeRu}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeStories}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-rose-700 text-white border border-amber-400/30 font-extrabold text-xs transition-colors cursor-pointer shrink-0"
                    aria-label="Закрыть сторис"
                  >
                    <X className="w-4 h-4 text-amber-300" />
                    <span>{isKz ? 'Жабу' : 'Закрыть'}</span>
                  </button>
                </div>
              </div>

              {/* Invisible Left/Right Tap Navigation Zones */}
              <div className="absolute inset-y-20 inset-x-0 z-10 flex">
                <div
                  onClick={goPrevSlide}
                  className="w-1/3 h-full cursor-pointer"
                  title={isKz ? 'Алдыңғы' : 'Назад'}
                />
                <div
                  onClick={goNextSlide}
                  className="w-2/3 h-full cursor-pointer"
                  title={isKz ? 'Келесі' : 'Далее'}
                />
              </div>

              {/* Desktop Left/Right Arrow Controls */}
              <button
                type="button"
                onClick={goPrevSlide}
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/45 hover:bg-black/75 text-white items-center justify-center transition-colors cursor-pointer"
                aria-label="Предыдущий слайд"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={goNextSlide}
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/45 hover:bg-black/75 text-white items-center justify-center transition-colors cursor-pointer"
                aria-label="Следующий слайд"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Center & Bottom Content */}
              <div className="relative z-20 p-5 pb-6 flex-1 flex flex-col justify-end space-y-4">
                {activeSlide.type === 'product' && activeSlide.product ? (
                  <div className="space-y-4">
                    {/* Crisp Product Showcase Frame */}
                    <div
                      onClick={() => {
                        const prod = activeSlide.product!;
                        closeStories();
                        onOpenProduct(prod);
                      }}
                      className="mx-auto w-48 h-60 sm:w-52 sm:h-64 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-2xl bg-stone-900 relative cursor-pointer group"
                    >
                      <img
                        src={activeSlide.product.images[0]}
                        alt={isKz ? activeSlide.titleKz : activeSlide.titleRu}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-stone-950/85 backdrop-blur-xs text-amber-300 font-extrabold text-sm border border-amber-400/30">
                        {formatPrice(activeSlide.product.price)}
                      </div>
                    </div>

                    {/* Product Info & Direct Actions */}
                    <div className="bg-stone-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-amber-300 font-semibold">
                        <span>{isKz ? activeSlide.badgeKz : activeSlide.badgeRu}</span>
                        <span>Арт: {activeSlide.product.sku}</span>
                      </div>

                      <h3 className="font-serif font-bold text-lg sm:text-xl text-white leading-snug line-clamp-2">
                        {isKz ? activeSlide.titleKz : activeSlide.titleRu}
                      </h3>

                      <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                        {isKz ? activeSlide.subtitleKz : activeSlide.subtitleRu}
                      </p>

                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const prod = activeSlide.product!;
                            closeStories();
                            onOpenProduct(prod);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-amber-300" />
                          <span>{isKz ? 'Толығырақ' : 'Подробнее'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart(activeSlide.product!);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 text-stone-950" />
                          <span>{isKz ? 'Себетке қосу' : 'В корзину'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Informational Slide (Address, Originality, Delivery) */
                  <div className="bg-stone-950/80 backdrop-blur-md border border-amber-400/30 rounded-3xl p-5 space-y-4 shadow-xl">
                    <span className="inline-block text-xs font-bold text-amber-300 tracking-wide">
                      {isKz ? activeSlide.badgeKz : activeSlide.badgeRu}
                    </span>

                    <h3 className="font-serif font-extrabold text-xl sm:text-2xl text-white leading-tight">
                      {isKz ? activeSlide.titleKz : activeSlide.titleRu}
                    </h3>

                    <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                      {isKz ? activeSlide.subtitleKz : activeSlide.subtitleRu}
                    </p>

                    {(isKz ? activeSlide.bulletsKz : activeSlide.bulletsRu) && (
                      <ul className="space-y-2 pt-1">
                        {(isKz ? activeSlide.bulletsKz : activeSlide.bulletsRu)!.map((item, i) => (
                          <li
                            key={i}
                            className="text-xs sm:text-sm text-emerald-100 bg-white/5 rounded-xl px-3 py-2 border border-white/10"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {activeSlide.ctaUrl && (
                      <a
                        href={activeSlide.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-colors"
                      >
                        <span>{isKz ? activeSlide.ctaLabelKz : activeSlide.ctaLabelRu}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {activeSlide.ctaCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(activeSlide.ctaCategory!);
                          closeStories();
                          const el = document.getElementById('catalog-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                      >
                        <span>{isKz ? activeSlide.ctaLabelKz : activeSlide.ctaLabelRu}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
