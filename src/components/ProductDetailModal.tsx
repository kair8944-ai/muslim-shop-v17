import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
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
  Plus,
  ArrowRight,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { AccessibilitySettings, Language, Product, StoreConfig } from '../types';
import { formatPrice, getProductDirectUrl, copyTextToClipboard, shareOrCopyProduct } from '../utils/formatters';
import { applyProductSeoMeta } from '../utils/seoMeta';
import { getFrequentlyBoughtTogether } from '../utils/recommendations';
import {
  getProductKazakhTranslation,
  hasExplicitKazakhTranslation,
  isGenuinelyKazakh,
  TranslatedProductData,
} from '../services/translationService';

interface ProductDetailModalProps {
  product: Product;
  allProducts?: Product[];
  config: StoreConfig;
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
  accessibility: AccessibilitySettings;
  isFavorite: boolean;
  cartQuantity?: number;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart?: (productId: string) => void;
  onQuickOrder: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onOpenCart?: () => void;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts = [],
  config,
  lang,
  onLanguageChange,
  accessibility,
  isFavorite,
  cartQuantity = 0,
  onToggleFavorite,
  onAddToCart,
  onRemoveFromCart,
  onQuickOrder,
  onSelectProduct,
  onOpenCart,
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
  const [isClosing, setIsClosing] = useState(false);
  const [previousProducts, setPreviousProducts] = useState<Product[]>([]);

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  const handleAnimatedClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 170);
  }, [onClose]);

  const handleBackAction = useCallback(() => {
    if (previousProducts.length > 0 && onSelectProduct) {
      const prevProd = previousProducts[previousProducts.length - 1];
      setPreviousProducts((stack) => stack.slice(0, -1));
      setSelectedImageIndex(0);
      setActiveTab('desc');
      onSelectProduct(prevProd);
      if (scrollBodyRef.current) {
        scrollBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      handleAnimatedClose();
    }
  }, [previousProducts, onSelectProduct, handleAnimatedClose]);

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
        handleAnimatedClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAnimatedClose]);

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

  // Dynamically generate SEO meta tags, OpenGraph, Twitter Card & Schema.org Product JSON-LD for this product
  useEffect(() => {
    applyProductSeoMeta(product, config, currentLang, title, description);
  }, [product, config, currentLang, title, description]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 225));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 100));
  const handleResetZoom = () =>
    setZoomLevel(accessibility.scale === 'extra' ? 150 : accessibility.scale === 'large' ? 125 : 100);

  // Dynamic font size and line height based on zoomLevel (larger base for mobile readability)
  const dynamicFontSize = `${(zoomLevel / 100) * 1.12}rem`;
  const dynamicLineHeight = `${(zoomLevel / 100) * 1.88}rem`;

  const recommendedProducts = React.useMemo(
    () => getFrequentlyBoughtTogether(product, allProducts, [], 4),
    [product, allProducts]
  );

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
    <motion.div
      ref={backdropRef}
      id="product-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto overscroll-contain"
      onClick={handleAnimatedClose}
    >
      <motion.div
        id="product-modal-container"
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{
          opacity: isClosing ? 0 : 1,
          scale: isClosing ? 0.96 : 1,
          y: isClosing ? 10 : 0,
        }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white text-slate-900 border border-slate-200 overflow-hidden flex flex-col will-change-transform ${
          isFullscreen
            ? 'fixed inset-0 w-full h-full rounded-none z-[110]'
            : 'w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl shadow-2xl my-0 sm:my-auto'
        }`}
      >
        {/* Top Control Bar: Prominent Back Button, Zoom tools, Language & Close Button */}
        <div
          id="modal-control-bar"
          className="bg-[#9dd0ff] text-slate-900 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 border-b border-[#83bfea] shrink-0"
        >
          {/* Left: Back Button & Zoom Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              id="modal-back-btn"
              onClick={handleBackAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
              title={
                previousProducts.length > 0
                  ? isKz
                    ? 'Алдыңғы тауарға оралу'
                    : 'Назад к предыдущему товару'
                  : isKz
                  ? 'Каталогқа оралу'
                  : 'Назад в каталог'
              }
            >
              <ArrowLeft className="w-4 h-4 text-[#0567BA] shrink-0" />
              <span>{isKz ? 'Артқа' : 'Назад'}</span>
            </button>

            <span className="hidden md:inline text-xs text-slate-700 font-semibold ml-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-[#0567BA]" />
              {lang === 'kz' ? 'Масштаб:' : 'Масштаб:'}
            </span>

            <button
              id="zoom-out-btn"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 100}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-xs"
              title="Уменьшить шрифт"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span
              id="zoom-percentage-badge"
              className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-800 font-bold text-xs"
            >
              {zoomLevel}%
            </span>

            <button
              id="zoom-in-btn"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 225}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-xs"
              title="Увеличить шрифт"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {zoomLevel !== 100 && (
              <button
                id="zoom-reset-btn"
                onClick={handleResetZoom}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 transition-colors cursor-pointer shadow-xs"
                title="Сбросить масштаб"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right controls: Language Switcher, Share/Copy Link, Fullscreen toggle & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Language Toggle [ ҚАЗ | РУС ] */}
            <div className="flex items-center rounded-lg bg-white p-0.5 border border-slate-300 shadow-xs">
              <button
                type="button"
                id="modal-lang-kz"
                onClick={() => handleLangSwitch('kz')}
                className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  isKz
                    ? 'bg-[#0567BA] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0567BA]'
                }`}
                title="Қазақ тіліне аудару және оқу"
              >
                ҚАЗ
              </button>
              <button
                type="button"
                id="modal-lang-ru"
                onClick={() => handleLangSwitch('ru')}
                className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  !isKz
                    ? 'bg-[#0567BA] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0567BA]'
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
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer border shadow-xs ${
                isLinkCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Скопировать прямую ссылку на товар"
            >
              {isLinkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isKz ? 'Көшірілді!' : 'Скопировано!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isKz ? 'Сілтеме' : 'Ссылка'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="close-modal-btn"
              onClick={handleAnimatedClose}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-600 border border-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
              title={isKz ? 'Жабу' : 'Закрыть карточку'}
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600" />
              <span>{isKz ? 'Жабу' : 'Закрыть'}</span>
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
              <div className="relative aspect-[9/16] max-h-[520px] mx-auto rounded-2xl bg-[#030F0B] overflow-hidden border border-amber-500/25 shadow-lg flex items-center justify-center">
                <img
                  id="modal-main-image"
                  src={product.images[selectedImageIndex] || product.images[0]}
                  alt={`${title} — купить витамины iHerb и БАДы в Атырау, Бутик №24`}
                  className="w-full h-full object-cover object-center"
                  style={{ transform: `scale(${zoomLevel > 150 ? 1.15 : 1})`, transition: 'transform 0.2s ease' }}
                />

                {/* Stock badge */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  {!product.inStock && (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {lang === 'kz' ? 'Қолда жоқ • Жақында' : 'Нет в наличии • Скоро будет'}
                    </span>
                  )}
                  {product.isHit && (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-md">
                      Хит продаж
                    </span>
                  )}
                </div>

                {/* Favorite toggle */}
                <button
                  id="modal-favorite-btn"
                  onClick={() => onToggleFavorite(product)}
                  className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md backdrop-blur-md transition-colors cursor-pointer ${
                    isFavorite
                      ? 'bg-rose-500 text-white ring-2 ring-white/50'
                      : 'bg-white/90 text-slate-600 hover:text-rose-500 border border-slate-200'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-white' : ''}`} />
                </button>

                {product.country && (
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 text-xs font-bold shadow-xs">
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
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-[#0567BA] scale-95 shadow-md'
                          : 'border-slate-200 opacity-70 hover:opacity-100 bg-white'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${title} — Фото ${idx + 1}`}
                        className="w-full h-full object-contain p-0.5"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Boutique assurance box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs sm:text-sm text-slate-700 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#0567BA]">
                  <MapPin className="w-4 h-4 text-[#0567BA] shrink-0" />
                  <span>{config.city}, {config.boutiqueNumber}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {config.address} • {lang === 'kz' ? config.workingHoursKz : config.workingHoursRu}
                </p>
              </div>
            </div>

            {/* Right Column: Title, Price, Description, Tabs, Actions */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-5">
              <div>
                {/* SKU & Category */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 mb-2.5">
                  <span>Артикул: <strong className="text-slate-900 font-mono">{product.sku}</strong></span>
                  {product.volumeOrWeight && (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                      {product.volumeOrWeight}
                    </span>
                  )}
                </div>

                {/* Title (Scaled) */}
                <h1
                  id="modal-product-title"
                  className="font-sans font-black text-slate-900 leading-snug"
                  style={{ fontSize: `calc(${dynamicFontSize} * 1.4)` }}
                >
                  {title}
                </h1>

                {/* Price Display */}
                <div className="mt-3.5 flex items-baseline gap-3.5 flex-wrap">
                  <span
                    id="modal-product-price"
                    className="font-sans font-black text-slate-900 tracking-tight text-3xl sm:text-4xl lg:text-5xl"
                  >
                    {formatPrice(product.price)}
                  </span>
                  {product.oldPrice && (
                    <span className="text-lg sm:text-xl text-slate-400 line-through font-bold">
                      {formatPrice(product.oldPrice)}
                    </span>
                  )}
                  {discountPercent && (
                    <span className="px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black bg-rose-600 text-white">
                      -{discountPercent}%
                    </span>
                  )}
                  {product.inStock ? (
                    <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {isKz ? 'Бутик №24 • Қолда бар' : 'Бутик №24 • В наличии'}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      {isKz ? 'Қолда жоқ • Жақында болады' : 'Нет в наличии • Скоро будет'}
                    </span>
                  )}
                </div>

                {/* In-Card Language Switcher Bar directly for reading description */}
                <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-bold">
                    <Globe className="w-4 h-4 text-[#0567BA] shrink-0" />
                    <span>{isKz ? 'Сипаттама тілі:' : 'Язык описания товара:'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="card-lang-kz"
                      onClick={() => handleLangSwitch('kz')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isKz
                          ? 'bg-[#0567BA] text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:text-[#0567BA] border border-slate-200'
                      }`}
                      title="Қазақ тілінде оқу"
                    >
                      <span>🇰🇿 Қазақша</span>
                    </button>
                    <button
                      type="button"
                      id="card-lang-ru"
                      onClick={() => handleLangSwitch('ru')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                        !isKz
                          ? 'bg-[#0567BA] text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:text-[#0567BA] border border-slate-200'
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
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-[#0567BA] border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Қазақ тіліне қайта аудару"
                      >
                        <RotateCw className={`w-3.5 h-3.5 text-[#0567BA] ${isTranslating ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{isTranslating ? 'Аударылуда...' : 'Қайта аудару'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Translation in-progress status pill */}
                {isKz && isTranslating && (
                  <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0567BA] text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xs animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0567BA] shrink-0" />
                    <span>Қазақ тіліне аударылуда... (Сипаттамасы аударылып жатыр)</span>
                  </div>
                )}

                {/* Translation ready badge */}
                {isKz && !isTranslating && (
                  <div className="mt-2 px-3 py-1 text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 font-medium flex items-center gap-1.5 w-fit">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Қазақша нұсқасы белсенді</span>
                  </div>
                )}

                {/* Tabs Navigation */}
                <div id="modal-tabs-nav" className="mt-5 flex border-b border-slate-200 overflow-x-auto gap-2">
                  <button
                    id="tab-btn-desc"
                    onClick={() => setActiveTab('desc')}
                    className={`pb-3 px-3.5 text-sm sm:text-base font-extrabold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'desc'
                        ? 'border-[#0567BA] text-[#0567BA]'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {isKz ? 'Сипаттама' : 'Описание'}
                  </button>

                  {benefits && benefits.length > 0 && (
                    <button
                      id="tab-btn-benefits"
                      onClick={() => setActiveTab('benefits')}
                      className={`pb-3 px-3.5 text-sm sm:text-base font-extrabold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === 'benefits'
                          ? 'border-[#0567BA] text-[#0567BA]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {isKz ? 'Пайдасы' : 'Польза и свойства'}
                    </button>
                  )}

                  {howToUse && (
                    <button
                      id="tab-btn-howto"
                      onClick={() => setActiveTab('howTo')}
                      className={`pb-3 px-3.5 text-sm sm:text-base font-extrabold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === 'howTo'
                          ? 'border-[#0567BA] text-[#0567BA]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {isKz ? 'Қолдану тәсілі' : 'Как применять'}
                    </button>
                  )}

                  {specs && (
                    <button
                      id="tab-btn-specs"
                      onClick={() => setActiveTab('specs')}
                      className={`pb-3 px-3.5 text-sm sm:text-base font-extrabold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                        activeTab === 'specs'
                          ? 'border-[#0567BA] text-[#0567BA]'
                          : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {isKz ? 'Сипаттамалары' : 'Характеристики'}
                    </button>
                  )}
                </div>

                {/* Tab Content Box */}
                <div
                  id="modal-tab-content-area"
                  className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner"
                  style={{
                    fontSize: dynamicFontSize,
                    lineHeight: dynamicLineHeight,
                  }}
                >
                  {activeTab === 'desc' && (
                    <div className="space-y-3">
                      {isKz && isTranslating && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#0567BA] text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-[#0567BA] shrink-0" />
                          <span>Қазақ тіліне аударылуда... Бірнеше секунд күте тұрыңыз</span>
                        </div>
                      )}
                      <p className="text-slate-800 font-normal leading-relaxed whitespace-pre-line">
                        {description}
                      </p>
                    </div>
                  )}

                  {activeTab === 'benefits' && benefits && (
                    <ul className="space-y-3">
                      {benefits.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-1" />
                          <span className="text-slate-800">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === 'howTo' && howToUse && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-[#0567BA] text-base mb-1">
                        <Clock className="w-4 h-4 text-[#0567BA]" />
                        <span>{isKz ? 'Нұсқаулық:' : 'Рекомендации по приему:'}</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                        {howToUse}
                      </p>
                    </div>
                  )}

                  {activeTab === 'specs' && specs && (
                    <div className="space-y-2">
                      <pre className="font-sans text-slate-800 whitespace-pre-line leading-relaxed">
                        {specs}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: WhatsApp direct order, 1-Click order, Add to cart */}
              <div id="modal-actions-box" className="pt-4 border-t border-amber-500/20 space-y-3">
                {/* Visual Feedback Banner: Товар отправлен в корзину */}
                {isAddedToCartFeedback && (
                  <div
                    id="modal-cart-success-banner"
                    className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <p className="font-black text-emerald-900 text-xs sm:text-sm">
                          {isKz ? 'Өнім себетке қосылды!' : 'Товар добавлен в корзину!'}
                        </p>
                        <p className="text-xs text-emerald-700 font-normal">
                          {isKz ? 'Тапсырысты себеттен рәсімдеуге болады' : 'Отличный выбор! Перейдите к оформлению или продолжите покупки'}
                        </p>
                      </div>
                    </div>
                    {onOpenCart && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCart();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 text-xs sm:text-sm font-black flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>{isKz ? 'Себетке' : 'В корзину'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp Order Button */}
                  <a
                    id="modal-whatsapp-order-btn"
                    href={`https://wa.me/${config.whatsappNumber}?text=${waDirectMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 sm:h-14 px-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all text-white bg-[#25D366] hover:bg-[#20ba5a] uppercase tracking-wider"
                  >
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                    <span>
                      {product.inStock
                        ? (isKz ? 'WhatsApp тапсырыс' : 'Заказать в WhatsApp')
                        : (isKz ? 'Келуін WhatsApp-тан сұрау' : 'Узнать о поступлении')}
                    </span>
                  </a>

                  {/* 1-Click Fast Order / Pre-order */}
                  <button
                    id="modal-quick-order-btn"
                    onClick={() => onQuickOrder(product)}
                    className="h-12 sm:h-14 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                    <span>
                      {product.inStock
                        ? (isKz ? '1 басу арқылы сатып алу' : 'Купить в 1 клик')
                        : (isKz ? 'Алдын ала тапсырыс беру' : 'Оформить предзаказ')}
                    </span>
                  </button>
                </div>

                {/* Add to Cart button OR Out of Stock reservation info */}
                {product.inStock ? (
                  <div className="space-y-2.5">
                    <button
                      id="modal-add-cart-btn"
                      onClick={handleAddToCartClick}
                      className="w-full h-14 sm:h-16 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md bg-[#ffbd00] hover:bg-[#febd01] active:bg-[#e5aa00] text-slate-950 uppercase tracking-wider"
                    >
                      {isAddedToCartFeedback ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-slate-950" />
                          <span>{isKz ? '✓ Өнім себетке жіберілді!' : '✓ Товар отправлен в корзину!'}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-6 h-6 text-slate-950" />
                          <span>
                            {cartQuantity > 0
                              ? isKz
                                ? `Себетте: ${cartQuantity} дана (+1 қосу)`
                                : `В корзине: ${cartQuantity} шт. (+1 добавить)`
                              : isKz
                              ? 'Себетке салу'
                              : 'Добавить в корзину'}
                          </span>
                        </>
                      )}
                    </button>

                    {cartQuantity > 0 && onRemoveFromCart && (
                      <button
                        type="button"
                        id="modal-remove-cart-btn"
                        onClick={() => onRemoveFromCart(product.id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>
                          {isKz
                            ? 'Тауарды себеттен өшіру'
                            : 'Удалить товар из корзины'}
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                    <p className="text-xs sm:text-sm font-bold text-rose-700 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-rose-500" />
                      <span>{isKz ? 'Өнім уақытша бітті • Жақында түседі' : 'Товар временно закончился • Скоро будет'}</span>
                    </p>
                    <p className="text-xs text-rose-600 mt-1">
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
                    className={`w-full py-2.5 px-4 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isLinkCopied
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
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
                        <Share2 className="w-4 h-4 text-[#0567BA]" />
                        <span>
                          {isKz ? 'Өнім сілтемесін көшіру (Сторис / WhatsApp)' : 'Скопировать ссылку на товар (для сторис и WhatsApp)'}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-center text-slate-400 mt-1">
                    {isKz ? 'Клиент сілтемені ашқанда тура осы тауарға бірден өтеді' : 'Клиент перейдет ровно на эту карточку товара без лишнего поиска'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Frequently Bought Together Section inside Product Detail Modal */}
          {recommendedProducts.length > 0 && (
            <div
              id="modal-frequently-bought-section"
              className="pt-6 border-t border-slate-200"
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-sans font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#ffbd00] shrink-0" />
                    <span>
                      {isKz ? 'Осы тауармен бірге жиі алады' : 'С этим товаром часто берут'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isKz
                      ? 'Кешенді нәтиже үшін сатып алушылар қосымша таңдайтын өнімдер'
                      : 'Рекомендуемые товары для комплексного приёма и лучшего результата'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recommendedProducts.map((rec) => {
                  const recTitle = isKz && rec.titleKz?.trim() ? rec.titleKz : rec.titleRu;
                  return (
                    <div
                      key={rec.id}
                      className="group rounded-2xl border border-slate-200 bg-white hover:border-[#0567BA]/60 p-3 flex flex-col justify-between transition-all shadow-xs"
                    >
                      <div
                        onClick={() => {
                          if (onSelectProduct) {
                            setPreviousProducts((stack) => [...stack, product]);
                            setSelectedImageIndex(0);
                            setActiveTab('desc');
                            onSelectProduct(rec);
                            if (scrollBodyRef.current) {
                              scrollBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-white border border-slate-100 mb-2.5 p-1 flex items-center justify-center">
                          <img
                            src={rec.images[0]}
                            alt={recTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#0567BA]">
                          {recTitle}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-[#0567BA] font-sans">
                          {formatPrice(rec.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddToCart(rec)}
                          className="px-2.5 py-1 rounded-lg bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                          title={isKz ? 'Себетке қосу' : 'Добавить в корзину'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isKz ? 'Қосу' : 'В корзину'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Back & Close Navigation Row inside Product Detail Modal */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackAction}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                {previousProducts.length > 0
                  ? isKz
                    ? 'Алдыңғы тауарға оралу'
                    : 'Назад к предыдущему товару'
                  : isKz
                  ? 'Артқа • Каталогқа оралу'
                  : 'Назад в каталог'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAnimatedClose}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{isKz ? 'Карточканы жабу' : 'Закрыть карточку'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modalElement, document.body);
};
