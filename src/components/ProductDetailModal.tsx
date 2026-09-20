import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ShoppingBag,
  Heart,
  MessageCircle,
  Zap,
  MapPin,
  Clock,
  Eye,
  Share2,
  Check,
} from 'lucide-react';
import { AccessibilitySettings, Language, Product, StoreConfig } from '../types';
import { formatPrice, getProductDirectUrl, copyTextToClipboard } from '../utils/formatters';

interface ProductDetailModalProps {
  product: Product;
  config: StoreConfig;
  lang: Language;
  accessibility: AccessibilitySettings;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onQuickOrder: (product: Product) => void;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  config,
  lang,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onQuickOrder,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100% to 220%
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'desc' | 'benefits' | 'howTo' | 'specs'>('desc');
  const [isHighContrastReader, setIsHighContrastReader] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isAddedToCartFeedback, setIsAddedToCartFeedback] = useState(false);

  const handleAddToCartClick = () => {
    onAddToCart(product);
    setIsAddedToCartFeedback(true);
    setTimeout(() => {
      setIsAddedToCartFeedback(false);
    }, 4000);
  };

  const title = (lang === 'kz' && product.titleKz?.trim()) ? product.titleKz : product.titleRu;
  const description = (lang === 'kz' && product.descriptionKz?.trim()) ? product.descriptionKz : product.descriptionRu;
  const specs = (lang === 'kz' && product.specsKz?.trim()) ? product.specsKz : product.specsRu;
  const benefits = (lang === 'kz' && product.benefitsKz && product.benefitsKz.length > 0) ? product.benefitsKz : product.benefitsRu;
  const howToUse = (lang === 'kz' && product.howToUseKz?.trim()) ? product.howToUseKz : product.howToUseRu;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 225));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 100));
  const handleResetZoom = () => setZoomLevel(100);

  // Dynamic font size and line height based on zoomLevel
  const dynamicFontSize = `${(zoomLevel / 100) * 1.05}rem`;
  const dynamicLineHeight = `${(zoomLevel / 100) * 1.75}rem`;

  const waDirectMessage = encodeURIComponent(
    lang === 'kz'
      ? `Сәлеметсіз бе, ${config.storeName}! Маған мына өнім бойынша толық ақпарат беріңізші:\n${title} (арт: ${product.sku}, бағасы: ${formatPrice(product.price)})`
      : `Здравствуйте, ${config.storeName}! Меня интересует товар:\n${title} (арт: ${product.sku}, цена: ${formatPrice(product.price)}). Хочу заказать!`
  );

  return (
    <div
      id="product-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="product-modal-container"
        onClick={(e) => e.stopPropagation()}
        className={`bg-white transition-all overflow-hidden flex flex-col ${
          isFullscreen
            ? 'fixed inset-0 w-screen h-screen rounded-none z-50'
            : 'w-full max-w-4xl max-h-[92vh] sm:rounded-3xl shadow-2xl border border-amber-900/20'
        } ${isHighContrastReader ? 'bg-amber-50/40 text-stone-950' : 'bg-white text-stone-900'}`}
      >
        {/* Top Control Bar: Magnifier / Zoom tools & Fullscreen toggler */}
        <div
          id="modal-control-bar"
          className="bg-emerald-950 text-white px-4 py-3 flex items-center justify-between gap-2 border-b border-emerald-900 shrink-0"
        >
          {/* Zoom Tools */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="hidden sm:inline text-xs text-emerald-300 font-medium mr-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              {lang === 'kz' ? 'Масштаб:' : 'Лупа / Масштаб:'}
            </span>

            <button
              id="zoom-out-btn"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 100}
              className="p-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 disabled:opacity-40 text-white transition-colors"
              title="Уменьшить шрифт"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span
              id="zoom-percentage-badge"
              className="px-2.5 py-0.5 rounded-md bg-emerald-900 text-amber-300 font-bold text-xs"
            >
              {zoomLevel}%
            </span>

            <button
              id="zoom-in-btn"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 225}
              className="p-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 disabled:opacity-40 text-white transition-colors"
              title="Увеличить шрифт"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {zoomLevel !== 100 && (
              <button
                id="zoom-reset-btn"
                onClick={handleResetZoom}
                className="p-1.5 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-stone-300 transition-colors"
                title="Сбросить масштаб"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* High contrast reading mode toggle */}
            <button
              id="reader-contrast-btn"
              onClick={() => setIsHighContrastReader(!isHighContrastReader)}
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                isHighContrastReader
                  ? 'bg-amber-400 text-stone-950 font-bold'
                  : 'bg-emerald-900/80 text-emerald-200 hover:text-white'
              }`}
            >
              {isHighContrastReader ? 'Режим чтения: Вкл' : 'Крупный режим чтения'}
            </button>
          </div>

          {/* Right controls: Share/Copy Link, Fullscreen toggle & Close */}
          <div className="flex items-center gap-2">
            <button
              id="copy-product-link-btn"
              onClick={async () => {
                const url = getProductDirectUrl(product.id);
                const ok = await copyTextToClipboard(url);
                if (ok) {
                  setIsLinkCopied(true);
                  setTimeout(() => setIsLinkCopied(false), 2500);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                isLinkCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-900 hover:bg-emerald-800 text-amber-300'
              }`}
              title="Скопировать прямую ссылку на товар для отправки клиенту в WhatsApp"
            >
              {isLinkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{lang === 'kz' ? 'Көшірілді!' : 'Ссылка скопирована!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{lang === 'kz' ? 'Сілтеме' : 'Ссылка'}</span>
                </>
              )}
            </button>

            <button
              id="toggle-fullscreen-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-amber-300 font-medium text-xs transition-colors cursor-pointer"
              title={isFullscreen ? 'Свернуть окно' : 'На весь экран смартфона'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === 'kz' ? 'Шығу' : 'Обычный вид'}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{lang === 'kz' ? 'Толық экран' : 'На весь экран'}</span>
                </>
              )}
            </button>

            <button
              id="close-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-emerald-900/90 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div id="modal-scroll-body" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column: Images & Badges (9:16 vertical ratio) */}
            <div className="md:col-span-5 space-y-4">
              <div className="relative aspect-[9/16] max-h-[520px] mx-auto rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 shadow-xs flex items-center justify-center">
                <img
                  id="modal-main-image"
                  src={product.images[selectedImageIndex] || product.images[0]}
                  alt={title}
                  className="w-full h-full object-cover object-center"
                  style={{ transform: `scale(${zoomLevel > 150 ? 1.15 : 1})`, transition: 'transform 0.2s ease' }}
                />

                {/* Stock badge */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-700 text-white shadow-xs">
                    100% Халяль
                  </span>
                  {product.isHit && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-stone-950 shadow-xs">
                      Хит продаж
                    </span>
                  )}
                </div>

                {/* Favorite toggle */}
                <button
                  id="modal-favorite-btn"
                  onClick={() => onToggleFavorite(product)}
                  className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md backdrop-blur-xs transition-colors ${
                    isFavorite ? 'bg-rose-50 text-rose-600' : 'bg-white/90 text-stone-700 hover:text-rose-600'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-600' : ''}`} />
                </button>

                {product.country && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-stone-950/75 text-white text-xs font-medium">
                    {product.country}
                  </div>
                )}
              </div>

              {/* Multi-image gallery if available */}
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImageIndex === idx ? 'border-emerald-700 scale-95' : 'border-stone-200 opacity-70'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Boutique assurance box */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span>{config.city}, {config.boutiqueNumber}</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {config.address} • Ежедневно с 10:00 до 21:00
                </p>
              </div>
            </div>

            {/* Right Column: Title, Price, Description, Tabs, Actions */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-5">
              <div>
                {/* SKU & Category */}
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                  <span>Артикул: <strong className="text-stone-800">{product.sku}</strong></span>
                  {product.volumeOrWeight && (
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold">
                      {product.volumeOrWeight}
                    </span>
                  )}
                </div>

                {/* Title (Scaled) */}
                <h1
                  id="modal-product-title"
                  className="font-bold text-stone-900 leading-tight"
                  style={{ fontSize: `calc(${dynamicFontSize} * 1.35)` }}
                >
                  {title}
                </h1>

                {/* Price Display */}
                <div className="mt-3 flex items-baseline gap-3">
                  <span
                    id="modal-product-price"
                    className="font-extrabold text-emerald-950 tracking-tight"
                    style={{ fontSize: `calc(${dynamicFontSize} * 1.5)` }}
                  >
                    {formatPrice(product.price)}
                  </span>
                  {product.oldPrice && (
                    <span className="text-base text-stone-400 line-through">
                      {formatPrice(product.oldPrice)}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {lang === 'kz' ? 'Қолда бар' : 'В наличии'}
                  </span>
                </div>

                {/* Tabs Navigation */}
                <div id="modal-tabs-nav" className="mt-6 flex border-b border-stone-200 overflow-x-auto gap-2">
                  <button
                    id="tab-btn-desc"
                    onClick={() => setActiveTab('desc')}
                    className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'desc'
                        ? 'border-emerald-800 text-emerald-950'
                        : 'border-transparent text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {lang === 'kz' ? 'Сипаттама' : 'Описание'}
                  </button>

                  {benefits && benefits.length > 0 && (
                    <button
                      id="tab-btn-benefits"
                      onClick={() => setActiveTab('benefits')}
                      className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === 'benefits'
                          ? 'border-emerald-800 text-emerald-950'
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {lang === 'kz' ? 'Пайдасы' : 'Польза и свойства'}
                    </button>
                  )}

                  {howToUse && (
                    <button
                      id="tab-btn-howto"
                      onClick={() => setActiveTab('howTo')}
                      className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === 'howTo'
                          ? 'border-emerald-800 text-emerald-950'
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {lang === 'kz' ? 'Қолдану тәсілі' : 'Как применять'}
                    </button>
                  )}

                  {specs && (
                    <button
                      id="tab-btn-specs"
                      onClick={() => setActiveTab('specs')}
                      className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === 'specs'
                          ? 'border-emerald-800 text-emerald-950'
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {lang === 'kz' ? 'Сипаттамалары' : 'Характеристики'}
                    </button>
                  )}
                </div>

                {/* Tab Content Box with DYNAMIC ZOOM SCALING for easy reading */}
                <div
                  id="modal-tab-content-area"
                  className="mt-4 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80"
                  style={{
                    fontSize: dynamicFontSize,
                    lineHeight: dynamicLineHeight,
                  }}
                >
                  {activeTab === 'desc' && (
                    <div className="space-y-3">
                      <p className="text-stone-800 font-normal leading-relaxed whitespace-pre-line">
                        {description}
                      </p>
                    </div>
                  )}

                  {activeTab === 'benefits' && benefits && (
                    <ul className="space-y-2.5">
                      {benefits.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                          <span className="text-stone-800">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === 'howTo' && howToUse && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm mb-1">
                        <Clock className="w-4 h-4 text-emerald-700" />
                        <span>{lang === 'kz' ? 'Нұсқаулық:' : 'Рекомендации по приему:'}</span>
                      </div>
                      <p className="text-stone-800 leading-relaxed whitespace-pre-line">
                        {howToUse}
                      </p>
                    </div>
                  )}

                  {activeTab === 'specs' && specs && (
                    <div className="space-y-2">
                      <pre className="font-sans text-stone-800 whitespace-pre-line leading-relaxed">
                        {specs}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: WhatsApp direct order, 1-Click order, Add to cart */}
              <div id="modal-actions-box" className="pt-4 border-t border-stone-200 space-y-3">
                {/* Visual Feedback Banner: Товар отправлен в корзину */}
                {isAddedToCartFeedback && (
                  <div
                    id="modal-cart-success-banner"
                    className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-950 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-md animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-900 text-xs sm:text-sm">
                          {lang === 'kz' ? 'Өнім себетке жіберілді!' : 'Товар отправлен в корзину!'}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-normal">
                          {lang === 'kz' ? 'Тапсырысты себеттен рәсімдеуге болады' : 'Вы можете перейти в корзину или продолжить выбор'}
                        </p>
                      </div>
                    </div>
                    <span className="text-emerald-700 text-xs font-mono">✓</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp Order Button */}
                  <a
                    id="modal-whatsapp-order-btn"
                    href={`https://wa.me/${config.whatsappNumber}?text=${waDirectMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{lang === 'kz' ? 'WhatsApp арқылы тапсырыс' : 'Заказать в WhatsApp'}</span>
                  </a>

                  {/* 1-Click Fast Order */}
                  <button
                    id="modal-quick-order-btn"
                    onClick={() => onQuickOrder(product)}
                    className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Zap className="w-5 h-5 text-stone-950" />
                    <span>{lang === 'kz' ? '1 басу арқылы сатып алу' : 'Купить в 1 клик'}</span>
                  </button>
                </div>

                {/* Add to Cart full width button with dynamic status */}
                <button
                  id="modal-add-cart-btn"
                  onClick={handleAddToCartClick}
                  className={`w-full px-5 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md ${
                    isAddedToCartFeedback
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-500/20 scale-[1.01]'
                      : 'bg-emerald-950 hover:bg-black text-white'
                  }`}
                >
                  {isAddedToCartFeedback ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-amber-300 animate-bounce" />
                      <span>{lang === 'kz' ? '✓ Өнім себетке жіберілді!' : '✓ Товар отправлен в корзину!'}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5 text-amber-400" />
                      <span>{lang === 'kz' ? 'Себетке қосу' : 'Добавить в корзину'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
