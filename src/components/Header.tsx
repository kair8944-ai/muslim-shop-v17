import React from 'react';
import {
  ShoppingBag,
  Shield,
  Layers,
  Phone,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  AccessibilitySettings,
  Category,
  Language,
  Product,
  StoreConfig,
} from '../types';
import { SmartSearchBar } from './SmartSearchBar';
import { SyncStatusWidget } from './SyncStatusWidget';

interface HeaderProps {
  config: StoreConfig;
  cartCount: number;
  favoritesCount?: number;
  products: Product[];
  categories: Category[];
  productCounts: Record<string, number>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  accessibility?: AccessibilitySettings;
  onAccessibilityChange?: (settings: AccessibilitySettings) => void;
  onOpenCart: () => void;
  onOpenFavorites?: () => void;
  onOpenAdmin: () => void;
  onOpenCatalog?: () => void;
  onSelectCategory?: (id: string) => void;
  onSelectSymptom?: (symptomId: string) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  cartCount,
  products,
  categories,
  productCounts,
  searchQuery,
  onSearchChange,
  lang,
  onLanguageChange,
  onOpenCart,
  onOpenAdmin,
  onOpenCatalog,
  onSelectCategory,
  onSelectSymptom,
  onOpenProduct,
  onAddToCart,
}) => {
  const isKz = lang === 'kz';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      {/* 1. Top Ribbon: Location, Hours, Phone, Language */}
      <div className="bg-slate-900 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 truncate">
            <span className="flex items-center gap-1.5 text-slate-300 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="font-semibold">{config.city}, ТД «Дина Байзар», Бутик №24</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3 h-3 text-[#C5A059]" />
              <span>{isKz ? config.workingHoursKz : config.workingHoursRu}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <a
              href={`tel:+${config.whatsappNumber || '77781754241'}`}
              className="flex items-center gap-1 text-slate-200 hover:text-white font-bold transition-colors"
            >
              <Phone className="w-3 h-3 text-[#C5A059]" />
              <span className="font-mono">+{config.whatsappNumber || '7 778 175 42 41'}</span>
            </a>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => onLanguageChange('ru')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  !isKz
                    ? 'bg-[#C5A059] text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('kz')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  isKz
                    ? 'bg-[#C5A059] text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                KZ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Store Header: Modern Responsive 2-Row / 1-Row layout */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-5">
          {/* Row 1 on Mobile / Left Column on Desktop: Brand + Catalog + Mobile Actions */}
          <div className="flex items-center justify-between gap-3 w-full md:w-auto shrink-0">
            {/* Brand Mark */}
            <div
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col cursor-pointer select-none group"
              title="MUSLIM SHOP Атырау"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 group-hover:text-black transition-colors font-sans">
                  MUSLIM SHOP
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
              </div>
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-500 uppercase mt-0.5">
                АТЫРАУ • БУТИК 24
              </span>
            </div>

            {/* Quick Catalog Button (Desktop & Tablet) */}
            {onOpenCatalog && (
              <button
                type="button"
                onClick={onOpenCatalog}
                className="hidden md:flex items-center gap-2 px-3.5 sm:px-4 h-12 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Layers className="w-4 h-4 text-[#C5A059]" />
                <span>{isKz ? 'Каталог' : 'Каталог'}</span>
              </button>
            )}

            {/* Right Buttons on Mobile: Catalog + Admin + Cart */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:hidden">
              {onOpenCatalog && (
                <button
                  type="button"
                  onClick={onOpenCatalog}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                  title="Каталог товаров"
                >
                  <Layers className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>{isKz ? 'Каталог' : 'Каталог'}</span>
                </button>
              )}

              <SyncStatusWidget lang={lang} variant="header" products={products} />

              <button
                type="button"
                id="header-admin-btn-mobile"
                onClick={onOpenAdmin}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs shadow-2xs"
                title="Панель администратора"
              >
                <Shield className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="font-extrabold">{isKz ? 'Админ' : 'Админ'}</span>
              </button>

              <button
                type="button"
                id="header-cart-btn-mobile"
                onClick={onOpenCart}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-xs"
                title="Корзина"
              >
                <ShoppingBag className="w-5 h-5 text-[#C5A059]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white font-mono font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Full-Width Search Bar on Mobile / Centered Search on Desktop */}
          <div className="w-full md:flex-1 md:max-w-2xl md:mx-4 relative">
            <SmartSearchBar
              inputId="header-search-input"
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              products={products}
              categories={categories}
              productCounts={productCounts}
              lang={lang}
              onSelectCategory={onSelectCategory}
              onSelectSymptom={onSelectSymptom}
              onOpenProduct={onOpenProduct}
              onAddToCart={onAddToCart}
              placeholder={isKz ? 'Өнімдерді, дәрумендерді іздеу...' : 'Поиск товаров по названию или категории...'}
            />
          </div>

          {/* Desktop Right Actions: Sync Status + Admin + Cart */}
          <div className="hidden md:flex items-center gap-2.5 sm:gap-3 shrink-0">
            <SyncStatusWidget lang={lang} variant="header" products={products} />

            <button
              type="button"
              id="header-admin-btn-desktop"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300/80 font-bold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
              title="Панель администратора магазина"
            >
              <Shield className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span className="font-extrabold">{isKz ? 'Админ' : 'Админ'}</span>
            </button>

            <button
              type="button"
              id="header-cart-btn-desktop"
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              title={isKz ? 'Себетті ашу' : 'Открыть корзину'}
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-[#C5A059]" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white font-mono font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="font-bold">
                {isKz ? 'Себет' : 'Корзина'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
