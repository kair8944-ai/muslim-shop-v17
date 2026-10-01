import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Zap,
  Activity,
  Flame,
  Smile,
  ShoppingBag,
  MessageCircle,
  Check,
  Eye,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { Language, Product, StoreConfig } from '../types';
import { formatPrice } from '../utils/formatters';
import { doesProductMatchSymptom } from '../utils/recommendations';

interface SmartHealthBundlesProps {
  products: Product[];
  config: StoreConfig;
  lang: Language;
  selectedSymptom: string;
  onOpenProduct: (product: Product) => void;
  onAddBundleToCart: (bundleProducts: Product[], bundleTitle: string) => void;
}

interface BundleSlotRule {
  roleRu: string;
  roleKz: string;
  keywords: string[];
  fallbackCategoryIds: string[];
}

interface BundleBlueprint {
  id: string;
  symptomId: string;
  titleRu: string;
  titleKz: string;
  subtitleRu: string;
  subtitleKz: string;
  synergyRu: string;
  synergyKz: string;
  durationRu: string;
  durationKz: string;
  discountPercent: number;
  slots: BundleSlotRule[];
}

const BUNDLE_BLUEPRINTS: BundleBlueprint[] = [
  {
    id: 'bundle-immunity',
    symptomId: 'immunity',
    titleRu: 'Крепкий иммунитет всей семьи',
    titleKz: 'Бүкіл отбасыға мықты иммунитет',
    subtitleRu: 'Комплексная защита от вирусов, простуды и хронической усталости',
    subtitleKz: 'Вирустардан, суық тиюден және шаршаудан кешенді қорғаныс',
    synergyRu:
      'Масло чёрного тмина укрепляет естественный барьер, Витамин D3/C активирует иммунный ответ, а Омега-3 поддерживает сосуды и клетки.',
    synergyKz:
      'Қара зере майы табиғи қорғанысты күшейтеді, D3/C дәрумені иммунитетті оятады, ал Омега-3 жасушаларды қолдайды.',
    durationRu: 'Курс на 1–2 месяца',
    durationKz: '1–2 айлық курс',
    discountPercent: 10,
    slots: [
      {
        roleRu: 'Основа по Сунне',
        roleKz: 'Сүннет негізі',
        keywords: ['тмин', 'қара зере', 'кыст', 'прополис', 'бузин'],
        fallbackCategoryIds: ['cat-health', 'cat-honey'],
      },
      {
        roleRu: 'Витаминная защита',
        roleKz: 'Дәрумендік қорғаныс',
        keywords: ['d3', 'д3', 'витамин c', 'витамин с', 'vitamin c', 'цинк', 'zinc'],
        fallbackCategoryIds: ['cat-iherb'],
      },
      {
        roleRu: 'Клеточная поддержка',
        roleKz: 'Жасушалық қолдау',
        keywords: ['омега', 'omega', 'рыбий жир', 'fish oil'],
        fallbackCategoryIds: ['cat-iherb', 'cat-health'],
      },
    ],
  },
  {
    id: 'bundle-beauty-women',
    symptomId: 'beauty',
    titleRu: 'Женское здоровье, красота и сияние',
    titleKz: 'Әйелдер денсаулығы мен сұлулығы',
    subtitleRu: 'Густые волосы, упругая кожа, крепкие ногти и гормональный баланс',
    subtitleKz: 'Қалың шаш, серпімді тері, мықты тырнақ және гормоналды тепе-теңдік',
    synergyRu:
      'Коллаген даёт строительный белок для кожи и волос, Биотин ускоряет их рост, а Железо и женские витамины возвращают бодрость и румянец.',
    synergyKz:
      'Коллаген тері мен шашты нәрлендіреді, Биотин өсуін тездетеді, ал Темір мен дәрумендер қуат береді.',
    durationRu: 'Курс на 1–2 месяца',
    durationKz: '1–2 айлық курс',
    discountPercent: 10,
    slots: [
      {
        roleRu: 'Молодость кожи',
        roleKz: 'Тері жастығы',
        keywords: ['коллаген', 'collagen', 'гиалурон', 'hyaluronic'],
        fallbackCategoryIds: ['cat-beauty', 'cat-iherb'],
      },
      {
        roleRu: 'Рост и густота волос',
        roleKz: 'Шаштың өсуі',
        keywords: ['биотин', 'biotin', 'волос', 'шаш', 'hair', 'ногт'],
        fallbackCategoryIds: ['cat-beauty', 'cat-women'],
      },
      {
        roleRu: 'Женский баланс',
        roleKz: 'Әйелдер балансы',
        keywords: ['железо', 'iron', 'женск', 'примул', 'фолиев', 'инозитол', 'хельба'],
        fallbackCategoryIds: ['cat-women', 'cat-iherb'],
      },
    ],
  },
  {
    id: 'bundle-energy-sleep',
    symptomId: 'energy',
    titleRu: 'Антистресс, глубокий сон и энергия',
    titleKz: 'Күйзеліске қарсы, тыныш ұйқы және қуат',
    subtitleRu: 'Спокойная нервная система, лёгкое пробуждение и ясная голова',
    subtitleKz: 'Жүйке жүйесін тыныштандыру, сергек ояну және есте сақтау',
    synergyRu:
      'Хелатный Магний снимает мышечное и нервное напряжение вечером, витамины группы B и адаптогены дают чистую энергию днём без кофеина.',
    synergyKz:
      'Магний кешке жүйке мен бұлшықетті босаңсытады, ал В тобы дәрумендері күндіз табиғи қуат береді.',
    durationRu: 'Курс на 1–2 месяца',
    durationKz: '1–2 айлық курс',
    discountPercent: 10,
    slots: [
      {
        roleRu: 'Крепкие нервы и сон',
        roleKz: 'Жүйке мен ұйқы',
        keywords: ['магний', 'magnesium', 'глицинат', 'цитрат'],
        fallbackCategoryIds: ['cat-iherb'],
      },
      {
        roleRu: 'Защита от стресса',
        roleKz: 'Күйзелістен қорғаныс',
        keywords: ['ашваганд', 'b-complex', 'группы b', 'группы в', '5-htp', 'мелатонин', 'стресс'],
        fallbackCategoryIds: ['cat-iherb', 'cat-health'],
      },
      {
        roleRu: 'Питание мозга',
        roleKz: 'Ми қызметі',
        keywords: ['омега', 'omega', 'лецитин', 'lecithin', 'коэнзим', 'q10', 'гинкго'],
        fallbackCategoryIds: ['cat-iherb', 'cat-health'],
      },
    ],
  },
  {
    id: 'bundle-joints',
    symptomId: 'joints',
    titleRu: 'Здоровые суставы, спина и кости',
    titleKz: 'Сау буындар, арқа және сүйектер',
    subtitleRu: 'Лёгкость движений, восстановление хрящевой ткани и снятие дискомфорта',
    subtitleKz: 'Қозғалыс жеңілдігі, шеміршек тінін қалпына келтіру',
    synergyRu:
      'Глюкозамин и МСМ снимают скованность, Коллаген с Кальцием укрепляют связки и костную ткань, а натуральный бальзам помогает снаружи.',
    synergyKz:
      'Глюкозамин мен МСМ буынды қорғайды, Коллаген мен Кальций сүйекті бекітеді.',
    durationRu: 'Курс на 2 месяца',
    durationKz: '2 айлық курс',
    discountPercent: 10,
    slots: [
      {
        roleRu: 'Восстановление хрящей',
        roleKz: 'Шеміршекті қалпына келтіру',
        keywords: ['глюкозамин', 'хондроитин', 'мсм', 'msm', 'сустав', 'буын'],
        fallbackCategoryIds: ['cat-iherb', 'cat-health'],
      },
      {
        roleRu: 'Прочность костей',
        roleKz: 'Сүйек беріктігі',
        keywords: ['кальций', 'calcium', 'коллаген', 'collagen', 'k2', 'к2'],
        fallbackCategoryIds: ['cat-iherb', 'cat-health'],
      },
      {
        roleRu: 'Наружная помощь',
        roleKz: 'Сыртқы күтім',
        keywords: ['мазь', 'крем', 'бальзам', 'спин', 'колен', 'сустав', 'тмин'],
        fallbackCategoryIds: ['cat-hijama', 'cat-health'],
      },
    ],
  },
  {
    id: 'bundle-men',
    symptomId: 'men',
    titleRu: 'Мужская сила, тонус и выносливость',
    titleKz: 'Ерлер қуаты, сергектік және төзімділік',
    subtitleRu: 'Природный энергетический комплекс для мужского здоровья и спорта',
    subtitleKz: 'Ерлер денсаулығы мен спортқа арналған табиғи қуат кешені',
    synergyRu:
      'Медовая паста или Мака дают мощный прилив жизненных сил, Цинк и мужские минералы поддерживают гормональный фон и иммунитет.',
    synergyKz:
      'Бал пастасы мен Мака табиғи қуат береді, ал Мырыш пен минералдар ерлер денсаулығын қолдайды.',
    durationRu: 'Курс на 1–2 месяца',
    durationKz: '1–2 айлық курс',
    discountPercent: 10,
    slots: [
      {
        roleRu: 'Природная энергия',
        roleKz: 'Табиғи қуат',
        keywords: ['эпимедиум', 'паста', 'мака', 'maca', 'трибулус', 'женьшень', 'мужск'],
        fallbackCategoryIds: ['cat-men', 'cat-honey'],
      },
      {
        roleRu: 'Мужской минерал',
        roleKz: 'Ерлер минералы',
        keywords: ['цинк', 'zinc', 'мужск', 'со пальметто', 'saw palmetto', 'селен'],
        fallbackCategoryIds: ['cat-men', 'cat-iherb'],
      },
      {
        roleRu: 'Общий тонус',
        roleKz: 'Жалпы сергектік',
        keywords: ['тмин', 'омега', 'мёд', 'мед', 'пыльц', 'перга'],
        fallbackCategoryIds: ['cat-honey', 'cat-health'],
      },
    ],
  },
  {
    id: 'bundle-kids',
    symptomId: 'kids',
    titleRu: 'Здоровый и умный ребёнок',
    titleKz: 'Дені сау және зерек бала',
    subtitleRu: 'Крепкий иммунитет в садике и школе, внимание, речь и здоровый аппетит',
    subtitleKz: 'Балабақша мен мектептегі мықты иммунитет, зейін және жақсы тәбет',
    synergyRu:
      'Детская Омега-3 питает мозг и зрение, вкусные мультивитамины восполняют дефициты роста, а Витамин D3 бережёт от частых простуд.',
    synergyKz:
      'Балалар Омега-3 ми мен көруді дамытады, мультивитаминдер өсуді қолдайды, ал D3 суық тиюден қорғайды.',
    durationRu: 'Курс на 1–2 месяца',
    durationKz: '1–2 айлық курс',
    discountPercent: 10,
    slots: [
      {
        roleRu: 'Мозг, речь и внимание',
        roleKz: 'Ми мен зейін',
        keywords: ['детск', 'бала', 'kids', 'child', 'омега', 'omega', 'dha'],
        fallbackCategoryIds: ['cat-kids', 'cat-iherb'],
      },
      {
        roleRu: 'Витамины для роста',
        roleKz: 'Өсу дәрумендері',
        keywords: ['детск', 'бала', 'kids', 'child', 'мульти', 'мармелад', 'витамин'],
        fallbackCategoryIds: ['cat-kids', 'cat-iherb'],
      },
      {
        roleRu: 'Защита от простуд',
        roleKz: 'Суықтан қорғаныс',
        keywords: ['d3', 'д3', 'бузин', 'цинк', 'прополис', 'детск', 'иммун'],
        fallbackCategoryIds: ['cat-kids', 'cat-health'],
      },
    ],
  },
];

export const SmartHealthBundles: React.FC<SmartHealthBundlesProps> = ({
  products,
  config,
  lang,
  selectedSymptom,
  onOpenProduct,
  onAddBundleToCart,
}) => {
  const isKz = lang === 'kz';
  const [variationSeed, setVariationSeed] = useState<number>(0);
  // Track unchecked items per bundle id (`${bundleId}:${productId}` -> true if unchecked)
  const [uncheckedMap, setUncheckedMap] = useState<Record<string, boolean>>({});
  const [addedBundleId, setAddedBundleId] = useState<string | null>(null);

  // Build resolved bundles with 3 distinct in-stock products per bundle
  const resolvedBundles = useMemo(() => {
    const inStock = products.filter((p) => p.inStock && p.price > 0);
    if (inStock.length < 3) return [];

    return BUNDLE_BLUEPRINTS.map((bp, bpIdx) => {
      const chosenIds = new Set<string>();
      const slotItems: { roleRu: string; roleKz: string; product: Product }[] = [];

      bp.slots.forEach((slot, slotIdx) => {
        const scored = inStock
          .filter((p) => !chosenIds.has(p.id))
          .map((p) => {
            const hay = `${p.titleRu} ${p.titleKz || ''} ${p.descriptionRu || ''} ${p.specsRu || ''}`.toLowerCase();
            let score = 0;
            for (const kw of slot.keywords) {
              if (hay.includes(kw.toLowerCase())) {
                score += p.titleRu.toLowerCase().includes(kw.toLowerCase()) ? 8 : 3;
              }
            }
            if (slot.fallbackCategoryIds.includes(p.categoryId)) {
              score += 4;
            }
            if (doesProductMatchSymptom(p, bp.symptomId)) {
              score += 5;
            }
            if (p.isHit) score += 2;
            return { product: p, score };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);

        const pool = scored.length > 0 ? scored.slice(0, Math.min(4, scored.length)) : inStock.filter((p) => !chosenIds.has(p.id)).map((p) => ({ product: p, score: 1 }));
        if (pool.length > 0) {
          const pickIndex = (variationSeed + bpIdx + slotIdx) % pool.length;
          const picked = pool[pickIndex].product;
          chosenIds.add(picked.id);
          slotItems.push({
            roleRu: slot.roleRu,
            roleKz: slot.roleKz,
            product: picked,
          });
        }
      });

      return {
        ...bp,
        items: slotItems,
      };
    }).filter((b) => b.items.length >= 2);
  }, [products, variationSeed]);

  // Sort so that if a user selected a symptom, the matching bundle appears first
  const orderedBundles = useMemo(() => {
    if (selectedSymptom === 'all') return resolvedBundles;
    return [...resolvedBundles].sort((a, b) => {
      const aMatch = a.symptomId === selectedSymptom ? 1 : 0;
      const bMatch = b.symptomId === selectedSymptom ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [resolvedBundles, selectedSymptom]);

  const [activeBundleId, setActiveBundleId] = useState<string>('all');

  const visibleBundles = useMemo(() => {
    if (activeBundleId === 'all') {
      return selectedSymptom !== 'all'
        ? orderedBundles.slice(0, 3)
        : orderedBundles;
    }
    return orderedBundles.filter((b) => b.id === activeBundleId);
  }, [orderedBundles, activeBundleId, selectedSymptom]);

  if (resolvedBundles.length === 0) return null;

  const getBundleIcon = (symptomId: string) => {
    const cls = 'w-5 h-5 text-amber-300 shrink-0';
    switch (symptomId) {
      case 'immunity':
        return <ShieldCheck className={cls} />;
      case 'beauty':
        return <Sparkles className={cls} />;
      case 'energy':
        return <Zap className={cls} />;
      case 'joints':
        return <Activity className={cls} />;
      case 'men':
        return <Flame className={cls} />;
      case 'kids':
        return <Smile className={cls} />;
      default:
        return <PackageCheck className={cls} />;
    }
  };

  const toggleItemChecked = (bundleId: string, productId: string) => {
    const key = `${bundleId}:${productId}`;
    setUncheckedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <section
      id="smart-health-bundles-section"
      aria-label={isKz ? 'Дайын денсаулық кешендері' : 'Готовые комплексы и курсы здоровья со скидкой'}
      className="w-full bg-[#061812] border-b border-amber-500/20 py-7 sm:py-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 mb-1.5">
              <span>{isKz ? 'Тиімді жиынтықтар' : 'Комплексный подход Бутика №24'}</span>
              <span aria-hidden="true">·</span>
              <span>{isKz ? 'Жиынтыққа -10% жеңілдік' : 'Выгода 10% при покупке набора'}</span>
            </div>
            <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-white leading-tight">
              {isKz
                ? 'Дайын денсаулық курстары мен кешендері'
                : 'Готовые курсы здоровья и комплексы со скидкой'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1.5 max-w-2xl leading-relaxed">
              {isKz
                ? 'Бірін-бірі толықтыратын 3 өнімнен тұратын дайын жиынтықтар. Қажеттілерін таңдап, 1 басу арқылы себетке қосыңыз немесе WhatsApp арқылы жеңілдікпен тапсырыс беріңіз.'
                : 'Подобранные сочетания из 3 товаров, которые усиливают действие друг друга. Берите весь набор целиком в 1 клик или отмечайте галочкой нужные позиции.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setVariationSeed((prev) => prev + 1)}
              className="px-3.5 py-2 rounded-xl bg-[#0B261C] hover:bg-[#12382A] text-amber-300 border border-amber-500/35 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
              title={isKz ? 'Жиынтықтағы тауарларды жаңарту' : 'Подобрать другие варианты товаров в наборы'}
            >
              <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{isKz ? 'Басқа нұсқалар' : 'Другие варианты наборов'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Course Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-5">
          <button
            type="button"
            onClick={() => setActiveBundleId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shrink-0 border ${
              activeBundleId === 'all'
                ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md'
                : 'bg-[#0B241B] text-stone-200 hover:text-amber-300 border-amber-500/25'
            }`}
          >
            {isKz ? 'Барлық курстар (6)' : 'Все курсы (6)'}
          </button>
          {orderedBundles.map((b) => {
            const isSelected = activeBundleId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveBundleId(isSelected ? 'all' : b.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md'
                    : 'bg-[#0B241B] text-stone-200 hover:text-amber-300 border-amber-500/25'
                }`}
              >
                <span>{isKz ? b.titleKz : b.titleRu}</span>
              </button>
            );
          })}
        </div>

        {/* Bundles Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleBundles.map((bundle) => {
            const selectedItems = bundle.items.filter(
              (item) => !uncheckedMap[`${bundle.id}:${item.product.id}`]
            );
            const activeProducts =
              selectedItems.length > 0
                ? selectedItems.map((i) => i.product)
                : bundle.items.map((i) => i.product);

            const regularTotal = activeProducts.reduce((sum, p) => sum + p.price, 0);
            // Apply 10% bundle discount when 2 or more products are selected in the bundle
            const hasBundleDiscount = activeProducts.length >= 2;
            const discountAmount = hasBundleDiscount
              ? Math.round((regularTotal * bundle.discountPercent) / 100)
              : 0;
            const finalBundlePrice = regularTotal - discountAmount;
            const isJustAdded = addedBundleId === bundle.id;

            const handleWhatsAppBundleOrder = () => {
              const lines = [
                isKz
                  ? `Сәлеметсіз бе! Мен «${bundle.titleKz}» дайын денсаулық жиынтығына тапсырыс бергім келеді:`
                  : `Здравствуйте! Хочу заказать готовый курс «${bundle.titleRu}» со скидкой:`,
                '',
                ...activeProducts.map(
                  (p, i) => `${i + 1}. ${isKz ? p.titleKz || p.titleRu : p.titleRu} — ${formatPrice(p.price)}`
                ),
                '',
                hasBundleDiscount
                  ? isKz
                    ? `Жиынтық бағасы (-${bundle.discountPercent}% жеңілдікпен): ${formatPrice(finalBundlePrice)} (үнемдеу: ${formatPrice(discountAmount)})`
                    : `Сумма со скидкой набора (-${bundle.discountPercent}%): ${formatPrice(finalBundlePrice)} (экономия: ${formatPrice(discountAmount)})`
                  : `Итого: ${formatPrice(finalBundlePrice)}`,
              ];
              const cleanPhone = (config.whatsappNumber || '77089720952').replace(/\D/g, '');
              const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
              window.location.href = url;
            };

            return (
              <div
                key={bundle.id}
                className="rounded-3xl bg-[#0A221A] border border-amber-500/30 p-5 flex flex-col justify-between gap-4 shadow-xl"
              >
                {/* Top Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#061510] border border-amber-400/35 flex items-center justify-center shrink-0">
                        {getBundleIcon(bundle.symptomId)}
                      </div>
                      <div className="text-xs text-amber-300 font-semibold">
                        <span>{isKz ? bundle.durationKz : bundle.durationRu}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-emerald-300 font-bold">
                          -{bundle.discountPercent}% {isKz ? 'жиынтыққа' : 'на набор'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-serif font-extrabold text-xl text-white leading-snug">
                    {isKz ? bundle.titleKz : bundle.titleRu}
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 leading-relaxed">
                    {isKz ? bundle.subtitleKz : bundle.subtitleRu}
                  </p>

                  {/* Synergy Explanation */}
                  <div className="mt-3 pt-3 border-t border-amber-500/15 text-xs text-stone-300 leading-relaxed">
                    <span className="font-bold text-amber-300">
                      {isKz ? 'Неліктен бірге тиімді: ' : 'Польза в комплексе: '}
                    </span>
                    {isKz ? bundle.synergyKz : bundle.synergyRu}
                  </div>
                </div>

                {/* 3 Products List inside the Bundle */}
                <div className="space-y-2.5 my-1">
                  {bundle.items.map((slot, idx) => {
                    const prod = slot.product;
                    const isChecked = !uncheckedMap[`${bundle.id}:${prod.id}`];
                    return (
                      <div
                        key={prod.id}
                        className={`p-2.5 rounded-2xl border transition-colors flex items-center gap-2.5 ${
                          isChecked
                            ? 'bg-[#061611] border-amber-500/25'
                            : 'bg-[#05120E]/50 border-white/10 opacity-60'
                        }`}
                      >
                        {/* Checkbox to include/exclude item */}
                        <button
                          type="button"
                          onClick={() => toggleItemChecked(bundle.id, prod.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                            isChecked
                              ? 'bg-amber-400 border-amber-300 text-stone-950'
                              : 'bg-transparent border-stone-500 text-transparent'
                          }`}
                          aria-label={isKz ? 'Тауарды таңдау' : 'Выбрать товар в наборе'}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        {/* Product Thumbnail */}
                        <button
                          type="button"
                          onClick={() => onOpenProduct(prod)}
                          className="w-12 h-12 rounded-xl overflow-hidden bg-stone-900 border border-amber-500/25 shrink-0 cursor-pointer"
                        >
                          <img
                            src={prod.images?.[0]}
                            alt={isKz ? prod.titleKz || prod.titleRu : prod.titleRu}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>

                        {/* Product Title & Role */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-amber-300/90 font-semibold truncate">
                            {idx + 1}. {isKz ? slot.roleKz : slot.roleRu}
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenProduct(prod)}
                            className="text-left text-xs sm:text-sm font-bold text-white hover:text-amber-300 line-clamp-1 transition-colors cursor-pointer"
                          >
                            {isKz ? prod.titleKz || prod.titleRu : prod.titleRu}
                          </button>
                          <div className="text-xs font-mono tabular-nums font-extrabold text-emerald-300 mt-0.5">
                            {formatPrice(prod.price)}
                          </div>
                        </div>

                        {/* Quick View Icon */}
                        <button
                          type="button"
                          onClick={() => onOpenProduct(prod)}
                          className="p-2 rounded-xl bg-[#0B241B] hover:bg-[#133B2D] text-amber-300 border border-amber-500/20 cursor-pointer shrink-0"
                          title={isKz ? 'Тауарды көру' : 'Подробнее о товаре'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Bundle Pricing Summary & Action Buttons */}
                <div className="pt-3 border-t border-amber-500/20 space-y-3">
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-xs text-stone-300">
                        {isKz
                          ? `Таңдалды: ${activeProducts.length} өнім`
                          : `Выбрано в наборе: ${activeProducts.length} шт.`}
                      </div>
                      {hasBundleDiscount && (
                        <div className="text-xs text-emerald-300 font-bold mt-0.5">
                          {isKz
                            ? `Сіздің пайдаңыз: ${formatPrice(discountAmount)}`
                            : `Ваша выгода: ${formatPrice(discountAmount)} (-${bundle.discountPercent}%)`}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {hasBundleDiscount && (
                        <div className="text-xs font-mono tabular-nums text-stone-400 line-through">
                          {formatPrice(regularTotal)}
                        </div>
                      )}
                      <div className="text-lg sm:text-xl font-mono tabular-nums font-extrabold text-amber-300">
                        {formatPrice(finalBundlePrice)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onAddBundleToCart(
                          activeProducts,
                          isKz ? bundle.titleKz : bundle.titleRu
                        );
                        setAddedBundleId(bundle.id);
                        setTimeout(() => setAddedBundleId(null), 2500);
                      }}
                      className="py-2.5 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                          <span>{isKz ? 'Себетке қосылды!' : 'Набор в корзине!'}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4 shrink-0" />
                          <span>{isKz ? 'Жиынтықты себетке' : 'Взять набор в корзину'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsAppBundleOrder}
                      className="py-2.5 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400/30 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>{isKz ? 'WhatsApp (-10%)' : 'В WhatsApp (-10%)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
