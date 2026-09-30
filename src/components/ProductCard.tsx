import React from 'react';
import {
  Heart,
  ShoppingBag,
  Zap,
  Sparkles,
  Flame,
  Eye,
  Clock,
  Share2,
  Check,
  ArrowLeftRight,
} from 'lucide-react';
import { AccessibilitySettings, Language, Product } from '../types';
import { formatPrice, shareOrCopyProduct } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  lang: Language;
  accessibility: AccessibilitySettings;
  isFavorite: boolean;
  isInCart?: boolean;
  isInCompare?: boolean;
  onToggleFavorite: (product: Product) => void;
  onToggleCompare?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenDetail: (product: Product) => void;
  onQuickOrder: (product: Product) => void;
  onShareFeedback?: (message: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  lang,
  isFavorite,
  isInCart = false,
  isInCompare = false,
  onToggleFavorite,
  onToggleCompare,
  onAddToCart,
  onOpenDetail,
  onQuickOrder,
  onShareFeedback,
}) => {
  const [isShared, setIsShared] = React.useState(false);
  const [isJustAdded, setIsJustAdded] = React.useState(false);
  const title = lang === 'kz' && product.titleKz?.trim() ? product.titleKz : product.titleRu;
  const description =
    lang === 'kz' && product.descriptionKz?.trim()
      ? product.descriptionKz
      : product.descriptionRu;

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  return (
    <article
      id={`product-card-${product.id}`}
      className="group relative rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 bg-gradient-to-b from-[#0B231B] to-[#071712] border border-amber-500/25 hover:border-amber-400/60 shadow-[0_12px_32px_rgba(0,0,0,0.45)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.65)] hover:-translate-y-1"
    >
      {/* Top Image Container — 9:16 Aspect Ratio */}
      <div>
        <div
          onClick={() => onOpenDetail(product)}
          className="relative aspect-[9/16] w-full bg-[#04100C] overflow-hidden cursor-pointer border-b border-amber-500/15"
        >
          <img
            src={product.images[0]}
            alt={`${title} — купить халяль витамины и БАДы iHerb в Атырау, MUSLIM SHOP Бутик №24`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Subtle dark vignette at bottom of image for contrast */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

          {/* Badges (Hit, New, Sale, Out of stock) */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {!product.inStock && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-md">
                <Clock className="w-3 h-3 text-white animate-pulse" />
                {lang === 'kz' ? 'Жақында болады' : 'Скоро будет'}
              </span>
            )}
            {product.isHit && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md">
                <Flame className="w-3 h-3 fill-stone-950" />
                {lang === 'kz' ? 'Хит' : 'Хит'}
              </span>
            )}
            {product.isNew && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-md border border-emerald-400/40">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {lang === 'kz' ? 'Жаңа' : 'Новинка'}
              </span>
            )}
            {discountPercent && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-extrabold bg-rose-600 text-white shadow-md">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Right Action Buttons: Favorite Heart & Share Direct Link */}
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-2">
            <button
              id={`fav-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(product);
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                isFavorite
                  ? 'bg-rose-500 text-white scale-110 ring-2 ring-white/60'
                  : 'bg-[#061812]/85 backdrop-blur-md text-stone-200 hover:text-amber-300 border border-amber-500/30'
              }`}
              title={lang === 'kz' ? 'Таңдаулыға қосу' : 'В избранное'}
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? 'fill-white' : ''}`} />
            </button>

            <button
              id={`share-btn-${product.id}`}
              onClick={async (e) => {
                e.stopPropagation();
                const res = await shareOrCopyProduct(product, lang);
                if (res.success) {
                  setIsShared(true);
                  setTimeout(() => setIsShared(false), 2200);
                  if (res.method === 'copy' && onShareFeedback) {
                    onShareFeedback(
                      lang === 'kz'
                        ? 'Өнім сілтемесі көшірілді!'
                        : 'Прямая ссылка на товар скопирована!'
                    );
                  }
                }
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                isShared
                  ? 'bg-emerald-500 text-stone-950 scale-110'
                  : 'bg-[#061812]/85 backdrop-blur-md text-stone-200 hover:text-amber-300 border border-amber-500/30'
              }`}
              title={
                lang === 'kz'
                  ? 'Сілтемені көшіру немесе бөлісу'
                  : 'Скопировать прямую ссылку на товар (для сторис / WhatsApp)'
              }
            >
              {isShared ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {/* Country / Volume overlay */}
          {(product.volumeOrWeight || product.country) && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] sm:text-xs text-amber-100 bg-[#04120E]/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/25">
              <span className="truncate font-semibold">{product.volumeOrWeight}</span>
              {product.country && <span className="text-amber-300 font-bold">{product.country}</span>}
            </div>
          )}

          {/* Hover Quick Read Overlay on Desktop */}
          <div className="hidden sm:flex absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
            <span className="px-4 py-2 rounded-full bg-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
              <Eye className="w-4 h-4 text-stone-950" />
              {lang === 'kz' ? 'Толық оқу (Лупа)' : 'Открыть крупно'}
            </span>
          </div>
        </div>

        {/* Text Info */}
        <div className="p-3 sm:p-4 pb-2">
          {/* SKU & Availability */}
          <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs text-emerald-200/70 mb-1.5">
            <span className="truncate font-mono">Арт: {product.sku}</span>
            {product.inStock ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {lang === 'kz' ? 'Қолда бар' : 'В наличии'}
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                {lang === 'kz' ? 'Қолда жоқ' : 'Нет в наличии'}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onOpenDetail(product)}
            className="font-serif font-extrabold text-stone-50 group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-2 leading-snug text-sm sm:text-lg"
          >
            {title}
          </h3>

          {/* Short Description Preview */}
          <p className="mt-1.5 text-emerald-100/75 line-clamp-2 leading-relaxed text-xs sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      {/* Price & Action Buttons */}
      <div className="p-3 sm:p-4 pt-2.5 border-t border-amber-500/15 mt-2">
        {/* Price Row */}
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <span className="font-black text-amber-300 tracking-tight font-serif text-lg sm:text-2xl">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice && product.oldPrice > product.price && (
            <span className="text-xs sm:text-sm text-stone-400 line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>

        {/* Action Buttons Stack */}
        <div className="flex flex-col gap-2">
          {/* Primary Add to Cart or Pre-Order Button */}
          {product.inStock ? (
            <button
              id={`add-to-cart-${product.id}`}
              onClick={() => {
                onAddToCart(product);
                setIsJustAdded(true);
                setTimeout(() => setIsJustAdded(false), 1800);
              }}
              className={`w-full py-2.5 sm:py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-md ${
                isJustAdded
                  ? 'bg-emerald-500 text-stone-950 ring-2 ring-amber-300'
                  : isInCart
                  ? 'bg-[#12382B] hover:bg-[#174636] text-amber-300 border border-amber-400/50'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 shadow-amber-500/15'
              }`}
            >
              {isJustAdded ? (
                <>
                  <Check className="w-4 h-4 text-stone-950 stroke-[2.5] shrink-0" />
                  <span className="truncate">
                    {lang === 'kz' ? 'Себетке қосылды!' : 'Добавлено!'}
                  </span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {isInCart
                      ? lang === 'kz'
                        ? 'Себетте (+1 қосу)'
                        : 'В корзине (+1)'
                      : lang === 'kz'
                      ? 'Себетке қосу'
                      : 'В корзину'}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              id={`preorder-btn-${product.id}`}
              onClick={() => onQuickOrder(product)}
              className="w-full py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40"
            >
              <Clock className="w-4 h-4 text-rose-300 shrink-0" />
              <span className="truncate">
                {lang === 'kz' ? 'Келгенде хабарлау' : 'Узнать о поступлении'}
              </span>
            </button>
          )}

          {/* Secondary Row: 1-Click Buy & Read Details */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <button
              id={`quick-buy-${product.id}`}
              onClick={() => onQuickOrder(product)}
              className="py-2 sm:py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer bg-[#0E2D22] hover:bg-[#153F30] text-amber-300 border border-amber-500/30"
              title="Быстрый заказ через WhatsApp"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="truncate">
                {product.inStock
                  ? lang === 'kz'
                    ? '1 кликпен'
                    : 'В 1 клик'
                  : lang === 'kz'
                  ? 'Алдын ала'
                  : 'Предзаказ'}
              </span>
            </button>

            <button
              id={`detail-btn-${product.id}`}
              onClick={() => onOpenDetail(product)}
              className="py-2 sm:py-2.5 px-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer bg-[#0A1F18] hover:bg-[#113126] text-stone-200 border border-emerald-800/70"
            >
              <Eye className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="truncate">{lang === 'kz' ? 'Толығырақ' : 'Подробнее'}</span>
            </button>
          </div>

          {/* Compare Button Row — Intuitive 'Добавить в сравнение' button with comparison icon */}
          {onToggleCompare && (
            <button
              type="button"
              id={`compare-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(product);
              }}
              className={`w-full py-2 sm:py-2.5 px-2.5 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                isInCompare
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-xs'
                  : 'bg-[#091C15] hover:bg-[#102E23] text-emerald-200/90 hover:text-amber-300 border-amber-500/20 hover:border-amber-400/50'
              }`}
              title={
                isInCompare
                  ? lang === 'kz'
                    ? 'Салыстыру терезесін ашу'
                    : 'Открыть окно сравнения товаров'
                  : lang === 'kz'
                  ? 'Салыстыруға қосу (3 тауарға дейін)'
                  : 'Добавить в сравнение (до 3 товаров)'
              }
            >
              <ArrowLeftRight
                className={`w-3.5 h-3.5 shrink-0 ${
                  isInCompare ? 'text-amber-300' : 'text-amber-400/80'
                }`}
              />
              <span className="truncate">
                {isInCompare
                  ? lang === 'kz'
                    ? '✓ Салыстыруда (Ашу)'
                    : '✓ В сравнении (Открыть)'
                  : lang === 'kz'
                  ? 'Салыстыруға қосу'
                  : 'Добавить в сравнение'}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
