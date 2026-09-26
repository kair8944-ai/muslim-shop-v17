import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
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
  Globe,
  Loader2,
} from 'lucide-react';
import { AccessibilitySettings, Language, Product, StoreConfig } from '../types';
import { formatPrice, getProductDirectUrl, copyTextToClipboard, shareOrCopyProduct } from '../utils/formatters';
import {
  getProductKazakhTranslation,
  hasExplicitKazakhTranslation,
  isGenuinelyKazakh,
  TranslatedProductData,
} from '../services/translationService';

interface ProductDetailModalProps {
  product: Product;
  config: StoreConfig;
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
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
  onLanguageChange,
  accessibility,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onQuickOrder,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(
    accessibility.scale === 'extra' ? 150 : accessibility.scale === 'large' ? 125 : 100
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'desc' | 'benefits' | 'howTo' | 'specs'>('desc');
  const [isHighContrastReader, setIsHighContrastReader] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isAddedToCartFeedback, setIsAddedToCartFeedback] = useState(false);

  // Active language inside modal (synchronized with store language)
  const [currentLang, setCurrentLang] = useState<Language>(lang);
  const [translatedKzData, setTranslatedKzData] = useState<TranslatedProductData | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  useEffect(() => {
    setCurrentLang(lang);
  }, [lang]);

  // Translation runner with support for force refresh
  const runKazakhTranslation = useCallback(
    async (forceRefresh: boolean = false) => {
      // If the product in DB already has genuine Kazakh description, use it directly
      if (!forceRefresh && hasExplicitKazakhTranslation(product)) {
        setTranslatedKzData({
          titleKz: product.titleKz || product.titleRu,
          descriptionKz: product.descriptionKz!,
          specsKz: product.specsKz || product.specsRu || '',
          benefitsKz:
            product.benefitsKz && product.benefitsKz.length > 0 ? product.benefitsKz : product.benefitsRu,
          howToUseKz: product.howToUseKz || product.howToUseRu || '',
        });
        return;
      }

      setIsTranslating(true);
      try {
        const data = await getProductKazakhTranslation(product, forceRefresh);
        if (data && data.descriptionKz) {
          setTranslatedKzData(data);
        }
      } catch (err) {
        console.warn('Translation execution failed:', err);
      } finally {
        setIsTranslating(false);
      }
    },
    [product]
  );

  // Automatic high-quality translation to Kazakh when viewing in Kazakh
  useEffect(() => {
    if (currentLang === 'kz') {
      runKazakhTranslation(false);
    }
  }, [product.id, currentLang, runKazakhTranslation]);

  const handleLangSwitch = (newLang: Language) => {
    setCurrentLang(newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
    if (newLang === 'kz') {
      runKazakhTranslation(false);
    }
  };

  const backdropRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // Lock background scroll & handle Escape key
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Ensure modal scroll starts from the top
    if (backdropRef.current) backdropRef.current.scrollTop = 0;
    if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAddToCartClick = () => {
    onAddToCart(product);
    setIsAddedToCartFeedback(true);
    setTimeout(() => {
      setIsAddedToCartFeedback(false);
    }, 4000);
  };

  const isKz = currentLang === 'kz';

  // Title: prioritize genuine Kazakh translation
  const title = isKz
    ? (translatedKzData?.titleKz || (hasExplicitKazakhTranslation(product) ? product.titleKz : null) || product.titleRu)
    : product.titleRu;

  // Description: prioritize genuine Kazakh translation
  const description = isKz
    ? (translatedKzData?.descriptionKz || (hasExplicitKazakhTranslation(product) ? product.descriptionKz : null) || product.descriptionRu)
    : product.descriptionRu;

  const specs = isKz
    ? (translatedKzData?.specsKz || product.specsKz || product.specsRu || '')
    : (product.specsRu || '');

  const benefits = isKz
    ? (translatedKzData?.benefitsKz || (product.benefitsKz && product.benefitsKz.length > 0 ? product.benefitsKz : product.benefitsRu))
    : product.benefitsRu;

  const howToUse = isKz
    ? (translatedKzData?.howToUseKz || product.howToUseKz || product.howToUseRu)
    : product.howToUseRu;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 225));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 100));
  const handleResetZoom = () =>
    setZoomLevel(accessibility.scale === 'extra' ? 150 : accessibility.scale === 'large' ? 125 : 100);

  // Dynamic font size and line height based on zoomLevel
  const dynamicFontSize = `${(zoomLevel / 100) * 1.05}rem`;
  const dynamicLineHeight = `${(zoomLevel / 100) * 1.75}rem`;

  const isHighContrast = isHighContrastReader || accessibility.highContrast;

  const waDirectMessage = encodeURIComponent(
    !product.inStock
      ? (isKz
          ? `Сәлеметсіз бе, ${config.storeName}! Мына өнім қашан сатылымға шығады? Келуін күтіп жатырмын:\n${title} (арт: ${product.sku}, бағасы: ${formatPrice(product.price)}). Келгенде хабарласыңызшы!`
          : `Здравствуйте, ${config.storeName}! Подскажите, когда появится в наличии товар:\n${title} (арт: ${product.sku}, цена: ${formatPrice(product.price)}). Хочу забронировать / оформить предзаказ!`)
      : (isKz
          ? `Сәлеметсіз бе, ${config.storeName}! Маған мына өнім бойынша толық ақпарат беріңізші:\n${title} (арт: ${product.sku}, бағасы: ${formatPrice(product.price)})`
          : `Здравствуйте, ${config.storeName}! Меня интересует товар:\n${title} (арт: ${product.sku}, цена: ${formatPrice(product.price)}). Хочу заказать!`)
  );

  const modalElement = (
    <div
      ref={backdropRef}
      id="product-modal-backdrop"
      className="fixed inset-0 z-[100] bg-stone-950/85 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        id="product-modal-container"
        onClick={(e) => e.stopPropagation()}
        className={`bg-white transition-all overflow-hidden flex flex-col ${
          isFullscreen
            ? 'fixed inset-0 w-full h-full rounded-none z-[110]'
            : 'w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-3xl shadow-2xl my-0 sm:my-auto'
        } ${isHighContrast ? 'bg-white text-black border-2 border-stone-950 font-medium' : 'bg-white text-stone-900 border border-amber-900/20'}`}
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

          {/* Right controls: Language Switcher, Share/Copy Link, Fullscreen toggle & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Language Toggle [ ҚАЗ | РУС ] */}
            <div className="flex items-center rounded-lg bg-emerald-900/90 p-0.5 border border-emerald-700/60 shadow-xs">
              <button
                type="button"
                id="modal-lang-kz"
                onClick={() => handleLangSwitch('kz')}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isKz
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
                title="Қазақ тіліне аудару және оқу"
              >
                ҚАЗ
              </button>
              <button
                type="button"
                id="modal-lang-ru"
                onClick={() => handleLangSwitch('ru')}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  !isKz
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
                title="Читать описание на русском языке"
              >
                РУС
              </button>
            </div>

            <button
              id="copy-product-link-btn"
              onClick={async () => {
                const res = await shareOrCopyProduct(product, currentLang);
                if (res.success) {
                  setIsLinkCopied(true);
                  setTimeout(() => setIsLinkCopied(false), 2500);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                isLinkCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-900 hover:bg-emerald-800 text-amber-300'
              }`}
              title="Скопировать прямую ссылку на товар для отправки клиенту в WhatsApp или сторис"
            >
              {isLinkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isKz ? 'Көшірілді!' : 'Ссылка скопирована!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isKz ? 'Сілтеме' : 'Ссылка'}</span>
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
                  <span className="hidden sm:inline">{isKz ? 'Шығу' : 'Обычный вид'}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{isKz ? 'Толық экран' : 'На весь экран'}</span>
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
        <div
          ref={scrollBodyRef}
          id="modal-scroll-body"
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8 space-y-6"
        >
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
                  {!product.inStock ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {lang === 'kz' ? 'Қолда жоқ • Жақында' : 'Нет в наличии • Скоро будет'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-700 text-white shadow-xs">
                      100% Халяль
                    </span>
                  )}
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
                  {config.address} • {lang === 'kz' ? config.workingHoursKz : config.workingHoursRu}
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
                  {product.inStock ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {isKz ? 'Бутик №24 • Қолда бар' : 'Бутик №24 • В наличии'}
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                      {isKz ? 'Қолда жоқ • Жақында болады' : 'Нет в наличии • Скоро будет'}
                    </span>
                  )}
                </div>

                {/* In-Card Language Switcher Bar directly for reading description */}
                <div className="mt-5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-950 font-bold">
                    <Globe className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{isKz ? 'Сипаттама тілі:' : 'Язык описания товара:'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="card-lang-kz"
                      onClick={() => handleLangSwitch('kz')}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isKz
                          ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-600/30'
                          : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/90'
                      }`}
                      title="Қазақ тілінде оқу"
                    >
                      <span>🇰🇿 Қазақша</span>
                    </button>
                    <button
                      type="button"
                      id="card-lang-ru"
                      onClick={() => handleLangSwitch('ru')}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        !isKz
                          ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-600/30'
                          : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/90'
                      }`}
                      title="Читать на русском"
                    >
                      <span>🇷🇺 Русский</span>
                    </button>

                    {isKz && (
                      <button
                        type="button"
                        id="card-retranslate-btn"
                        onClick={() => runKazakhTranslation(true)}
                        disabled={isTranslating}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-950 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Қазақ тіліне қайта аудару"
                      >
                        <RotateCw className={`w-3.5 h-3.5 text-amber-800 ${isTranslating ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{isTranslating ? 'Аударылуда...' : 'Қайта аудару'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Translation in-progress status pill */}
                {isKz && isTranslating && (
                  <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xs animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-700 shrink-0" />
                    <span>Қазақ тіліне аударылуда... (Сипаттамасы аударылып жатыр)</span>
                  </div>
                )}

                {/* Translation ready badge */}
                {isKz && !isTranslating && (
                  <div className="mt-2 px-3 py-1 text-xs text-emerald-800 bg-emerald-50/90 rounded-lg border border-emerald-200 font-medium flex items-center gap-1.5 w-fit">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Қазақша нұсқасы белсенді</span>
                  </div>
                )}

                {/* Tabs Navigation */}
                <div id="modal-tabs-nav" className="mt-5 flex border-b border-stone-200 overflow-x-auto gap-2">
                  <button
                    id="tab-btn-desc"
                    onClick={() => setActiveTab('desc')}
                    className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'desc'
                        ? 'border-emerald-800 text-emerald-950'
                        : 'border-transparent text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {isKz ? 'Сипаттама' : 'Описание'}
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
                      {isKz ? 'Пайдасы' : 'Польза и свойства'}
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
                      {isKz ? 'Қолдану тәсілі' : 'Как применять'}
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
                      {isKz ? 'Сипаттамалары' : 'Характеристики'}
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
                      {isKz && isTranslating && (
                        <div className="p-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-800 shrink-0" />
                          <span>Қазақ тіліне аударылуда... Бірнеше секунд күте тұрыңыз</span>
                        </div>
                      )}
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
                        <span>{isKz ? 'Нұсқаулық:' : 'Рекомендации по приему:'}</span>
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
                          {isKz ? 'Өнім себетке жіберілді!' : 'Товар отправлен в корзину!'}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-normal">
                          {isKz ? 'Тапсырысты себеттен рәсімдеуге болады' : 'Вы можете перейти в корзину или продолжить выбор'}
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
                    className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all text-white ${
                      product.inStock
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>
                      {product.inStock
                        ? (isKz ? 'WhatsApp арқылы тапсырыс' : 'Заказать в WhatsApp')
                        : (isKz ? 'Келуін WhatsApp-тан сұрау' : 'Узнать о поступлении')}
                    </span>
                  </a>

                  {/* 1-Click Fast Order / Pre-order */}
                  <button
                    id="modal-quick-order-btn"
                    onClick={() => onQuickOrder(product)}
                    className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Zap className="w-5 h-5 text-stone-950" />
                    <span>
                      {product.inStock
                        ? (isKz ? '1 басу арқылы сатып алу' : 'Купить в 1 клик')
                        : (isKz ? 'Алдын ала тапсырыс беру' : 'Оформить предзаказ')}
                    </span>
                  </button>
                </div>

                {/* Add to Cart button OR Out of Stock reservation info */}
                {product.inStock ? (
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
                        <span>{isKz ? '✓ Өнім себетке жіберілді!' : '✓ Товар отправлен в корзину!'}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5 text-amber-400" />
                        <span>{isKz ? 'Себетке қосу' : 'Добавить в корзину'}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                    <p className="text-xs sm:text-sm font-bold text-rose-800 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600" />
                      <span>{isKz ? 'Өнім уақытша бітті • Жақында түседі' : 'Товар временно закончился • Скоро будет'}</span>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      {isKz ? 'Бутик №24-тен алдын ала брондау үшін түймелерді басыңыз' : 'Нажмите кнопку «Оформить предзаказ», чтобы забронировать к новому завозу'}
                    </p>
                  </div>
                )}

                {/* Direct Share Link block for Stories & WhatsApp */}
                <div className="pt-2">
                  <button
                    id="modal-share-product-btn"
                    onClick={async () => {
                      const res = await shareOrCopyProduct(product, currentLang);
                      if (res.success) {
                        setIsLinkCopied(true);
                        setTimeout(() => setIsLinkCopied(false), 3000);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isLinkCopied
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 border-stone-200/90 text-stone-700 hover:text-stone-900'
                    }`}
                    title="Скопировать ссылку для вставки в Instagram Сторис или отправки клиенту"
                  >
                    {isLinkCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-emerald-700">
                          {isKz ? '✓ Сілтеме көшірілді! Сторис немесе WhatsApp-қа салыңыз' : '✓ Ссылка скопирована! Готова для сторис и WhatsApp'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-amber-600" />
                        <span>
                          {isKz ? 'Өнім сілтемесін көшіру (Сторис / WhatsApp)' : 'Скопировать ссылку на товар (для сторис и WhatsApp)'}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-stone-400 mt-1">
                    {isKz ? 'Клиент сілтемені ашқанда тура осы тауарға бірден өтеді' : 'Клиент перейдет ровно на эту карточку товара без лишнего поиска'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
};
