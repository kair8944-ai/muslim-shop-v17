import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ShoppingBag,
  MessageCircle,
  Check,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Language, Product, StoreConfig } from '../types';
import { formatPrice } from '../utils/formatters';

interface FeaturedHealthBundleWidgetProps {
  products: Product[];
  config: StoreConfig;
  lang: Language;
  onOpenProduct: (product: Product) => void;
  onAddBundleToCart: (products: Product[], bundleTitle: string) => void;
}

interface BundleItemDef {
  num: number;
  roleRu: string;
  roleKz: string;
  benefitRu: string;
  benefitKz: string;
  product: Product;
}

export const FeaturedHealthBundleWidget: React.FC<FeaturedHealthBundleWidgetProps> = ({
  products,
  config,
  lang,
  onOpenProduct,
  onAddBundleToCart,
}) => {
  const isKz = lang === 'kz';

  // Find the exact 3 products specified in the user brief
  const p1 = useMemo(() => {
    return (
      products.find(
        (p) =>
          p.titleRu.toLowerCase().includes('youtheory') ||
          p.titleRu.toLowerCase().includes('collagen') ||
          p.sku.toLowerCase().includes('col-6000') ||
          p.id === 'prod-col-6000'
      ) || products.find((p) => p.categoryId === 'cat-collagen')
    );
  }, [products]);

  const p2 = useMemo(() => {
    return (
      products.find(
        (p) =>
          p.titleRu.toLowerCase().includes('altun deva') ||
          p.titleRu.toLowerCase().includes('marine collagen') ||
          p.sku.toLowerCase().includes('altun-col') ||
          p.id === 'prod-altun-col'
      ) ||
      products.find(
        (p) =>
          p.id !== p1?.id &&
          (p.categoryId === 'cat-collagen' || p.categoryId === 'cat-women')
      )
    );
  }, [products, p1]);

  const p3 = useMemo(() => {
    return (
      products.find(
        (p) =>
          p.titleRu.toLowerCase().includes('железо') ||
          p.titleRu.toLowerCase().includes('женщин') ||
          p.titleRu.toLowerCase().includes('eve') ||
          p.titleRu.toLowerCase().includes('women') ||
          p.sku.toLowerCase().includes('eve-120') ||
          p.id === 'prod-eve-120'
      ) ||
      products.find(
        (p) =>
          p.id !== p1?.id &&
          p.id !== p2?.id &&
          (p.categoryId === 'cat-women' || p.categoryId === 'cat-supplements')
      )
    );
  }, [products, p1, p2]);

  const items = useMemo<BundleItemDef[]>(() => {
    const list: BundleItemDef[] = [];
    if (p1) {
      list.push({
        num: 1,
        roleRu: 'Молодость кожи',
        roleKz: 'Тері жастығы',
        benefitRu: 'Коллаген даёт строительный белок для упругости кожи',
        benefitKz: 'Коллаген терінің серпімділігіне құрылыс ақуызын береді',
        product: p1,
      });
    }
    if (p2) {
      list.push({
        num: 2,
        roleRu: 'Рост и густота волос',
        roleKz: 'Шаштың қалыңдауы',
        benefitRu: 'Биотин и морской биоактивный коллаген ускоряют рост волос',
        benefitKz: 'Биотин мен теңіз коллагені шаш өсуін белсендіреді',
        product: p2,
      });
    }
    if (p3) {
      list.push({
        num: 3,
        roleRu: 'Женский баланс и бодрость',
        roleKz: 'Әйелдер балансы мен сергектік',
        benefitRu: 'Железо и женские витамины возвращают энергию и румянец',
        benefitKz: 'Темір мен дәрумендер сергектік пен қызыл шырай береді',
        product: p3,
      });
    }
    return list;
  }, [p1, p2, p3]);

  // Selection state (all 3 checked by default)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isJustAdded, setIsJustAdded] = useState(false);

  // Initialize selected IDs
  useEffect(() => {
    if (items.length > 0) {
      const map: Record<string, boolean> = {};
      items.forEach((item) => {
        map[item.product.id] = true;
      });
      setSelectedIds(map);
    }
  }, [items]);

  if (items.length < 2) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedItems = items.filter((it) => selectedIds[it.product.id]);
  const selectedCount = selectedItems.length;

  const regularSum = selectedItems.reduce((acc, it) => acc + it.product.price, 0);
  // 10% discount if all 3 items selected, 5% if 2 items
  const discountPercent = selectedCount === 3 ? 10 : selectedCount === 2 ? 5 : 0;
  const discountAmount = Math.round((regularSum * discountPercent) / 100);
  const finalPrice = regularSum - discountAmount;

  const handleAddToCart = () => {
    if (selectedCount === 0) return;
    const prods = selectedItems.map((it) => it.product);
    onAddBundleToCart(prods, isKz ? 'Кешенді пайда' : 'Польза в комплексе');
    setIsJustAdded(true);
    setTimeout(() => setIsJustAdded(false), 2500);
  };

  const handleWhatsAppOrder = () => {
    if (selectedCount === 0) return;
    const listText = selectedItems
      .map(
        (it) =>
          `• ${it.num}. ${it.product.titleRu} (${formatPrice(it.product.price)})`
      )
      .join('\n');

    const msg = isKz
      ? `Сәлеметсіз бе! «Кешенді пайда» топтамасына тапсырыс бергім келеді:\n\n${listText}\n\nБастапқы құны: ${formatPrice(
          regularSum
        )}\nЖеңілдік (-${discountPercent}%): -${formatPrice(
          discountAmount
        )}\nТөлем сомасы: ${formatPrice(finalPrice)}\n\nЖеткізу Атырау Бутик №24.`
      : `Здравствуйте! Хочу оформить готовый курс «Польза в комплексе»:\n\n${listText}\n\nОбычная цена: ${formatPrice(
          regularSum
        )}\nСкидка (-${discountPercent}%): -${formatPrice(
          discountAmount
        )}\nИТОГО к оплате: ${formatPrice(finalPrice)}\n\nДоставка из Бутика №24 в Атырау.`;

    const phone = config.whatsappNumber || '77781754241';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <section
      id="featured-health-bundle-widget"
      aria-label="Польза в комплексе"
      className="w-full max-w-7xl mx-auto px-3 sm:px-6 my-6 sm:my-10"
    >
      <div className="relative rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-md overflow-hidden">
        {/* Top Info Ribbon */}
        <div className="bg-slate-900 text-white py-2.5 px-4 sm:px-6 flex items-center justify-between gap-4 text-xs sm:text-sm font-bold flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
            <span className="text-[#C5A059] uppercase tracking-wider font-black">
              {isKz ? 'ХИТ • БУТИК №24' : 'ХИТ БУТИКА №24:'}
            </span>
            <span className="text-white font-extrabold">
              {isKz ? 'Кешенді пайда (-10%)' : 'Польза в комплексе (-10%)'}
            </span>
          </div>
          <div className="text-slate-300 font-semibold hidden sm:flex items-center gap-2">
            <span>{isKz ? 'Атырау бойынша бүгін жеткізу' : 'Быстрая доставка по Атырау в день заказа'}</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-7 lg:p-8">
          {/* Header & Benefit description */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm font-black mb-2.5">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>{isKz ? 'ДАЙЫН КЕШЕН' : 'ГОТОВЫЙ КУРС ЗДОРОВЬЯ'}</span>
                <span className="bg-slate-900 text-[#C5A059] px-2 py-0.5 rounded text-xs font-black">
                  -10%
                </span>
              </div>

              <h2 className="font-sans font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 leading-tight tracking-tight">
                {isKz ? 'Кешенді пайда' : 'Польза в комплексе'}
              </h2>

              <p className="text-sm sm:text-base text-slate-700 mt-2.5 max-w-3xl leading-relaxed font-medium">
                {isKz
                  ? 'Коллаген тері мен шашқа құрылыс ақуызын береді, Биотин олардың өсуін жылдамдатады, ал Темір мен әйелдер дәрумендері сергектік пен қызыл шырайды қайтарады.'
                  : 'Коллаген даёт строительный белок для кожи и волос, Биотин ускоряет их рост, а Железо и женские витамины возвращают бодрость и румянец.'}
              </p>
            </div>

            {/* In-Stock Pill */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shrink-0 text-xs sm:text-sm font-extrabold text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{isKz ? '3 өнім де Бутик №24-те қолда бар' : 'Все 3 товара в наличии в Бутике №24'}</span>
            </div>
          </div>

          {/* 3 Large Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 my-6 sm:my-8">
            {items.map((item) => {
              const isChecked = Boolean(selectedIds[item.product.id]);

              return (
                <div
                  key={item.product.id}
                  onClick={() => toggleSelect(item.product.id)}
                  className={`group relative rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between border-2 ${
                    isChecked
                      ? 'bg-amber-50/20 border-[#C5A059] shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 opacity-60'
                  }`}
                >
                  {/* Step Badge & Big Checkbox */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span
                      className={`text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl ${
                        isChecked
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.num}. {isKz ? item.roleKz : item.roleRu}
                    </span>

                    {/* Large Checkbox */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border-2 transition-all ${
                        isChecked
                          ? 'bg-[#ffbd00] border-[#d89e00] text-slate-950 shadow-xs'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                  </div>

                  {/* Large Product Photo */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProduct(item.product);
                    }}
                    className="w-full h-44 sm:h-52 rounded-xl bg-white border border-slate-100 p-3 flex items-center justify-center overflow-hidden mb-3 hover:scale-102 transition-transform"
                    title={isKz ? 'Толығырақ көру' : 'Посмотреть фото и описание'}
                  >
                    {item.product.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.titleRu}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Sparkles className="w-8 h-8 text-amber-500" />
                    )}
                  </div>

                  {/* Title & Benefit */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm sm:text-base font-black text-slate-900 line-clamp-2 leading-snug group-hover:text-[#B38F48] transition-colors">
                      {item.product.titleRu}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed line-clamp-2 font-medium">
                      {isKz ? item.benefitKz : item.benefitRu}
                    </p>
                  </div>

                  {/* Large Price Row */}
                  <div className="pt-3 mt-3 border-t border-slate-200 flex items-baseline justify-between">
                    <span className="text-xs sm:text-sm text-slate-500 font-semibold">
                      {isKz ? 'Бағасы:' : 'Цена позиции:'}
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-slate-900 font-sans">
                      {formatPrice(item.product.price)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Calculation Summary Box & Action Buttons */}
          <div className="rounded-2xl sm:rounded-3xl bg-slate-50 border-2 border-slate-200 p-5 sm:p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left Math Details */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm sm:text-base text-slate-700 font-bold">
                <span className="inline-flex items-center gap-2 text-slate-900 font-extrabold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  {isKz ? `Таңдалды: ${selectedCount} өнім` : `Выбрано: ${selectedCount} шт.`}
                </span>

                {discountPercent > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg font-black text-xs sm:text-sm">
                    <TrendingDown className="w-4 h-4" />
                    {isKz
                      ? `Үнемдеу: ${formatPrice(discountAmount)} (-${discountPercent}%)`
                      : `Экономия: ${formatPrice(discountAmount)} (-${discountPercent}%)`}
                  </span>
                )}
              </div>

              {/* Price Row: Old price struck through -> New final price */}
              <div className="flex items-baseline gap-3.5 pt-1 flex-wrap">
                {discountPercent > 0 && (
                  <span className="text-base sm:text-xl text-slate-400 line-through font-bold font-sans">
                    {formatPrice(regularSum)}
                  </span>
                )}
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-sans tracking-tight">
                  {formatPrice(finalPrice)}
                </span>
                <span className="text-xs sm:text-sm text-slate-500 font-bold">
                  {isKz ? '(жиынтық үшін)' : '(за весь комплекс)'}
                </span>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Flip.kz Signature Yellow "В корзину" button */}
              <button
                type="button"
                id="bundle-add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={selectedCount === 0}
                className="h-13 sm:h-14 px-6 sm:px-8 rounded-xl bg-[#ffbd00] hover:bg-[#febd01] active:bg-[#e5aa00] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50 select-none"
              >
                {isJustAdded ? (
                  <>
                    <Check className="w-5 h-5 stroke-[3] text-slate-950" />
                    <span>{isKz ? 'Себетке қосылды!' : 'Добавлено в корзину!'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5 text-slate-950" />
                    <span>{isKz ? 'Себетке салу' : 'В корзину'}</span>
                  </>
                )}
              </button>

              {/* WhatsApp Green Button */}
              <button
                type="button"
                id="bundle-whatsapp-order-btn"
                onClick={handleWhatsAppOrder}
                disabled={selectedCount === 0}
                className="h-13 sm:h-14 px-6 sm:px-8 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1caa52] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-colors cursor-pointer uppercase tracking-wider disabled:opacity-50 select-none"
              >
                <MessageCircle className="w-5 h-5 text-white shrink-0" />
                <span>{isKz ? 'WhatsApp тапсырыс' : 'Заказ в WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
