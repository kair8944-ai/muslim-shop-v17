import React, { useState } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  MessageCircle,
  Clock,
  MapPin,
  PhoneCall,
  Lock,
} from 'lucide-react';
import { AccessibilitySettings, Category, Language, Product, StoreConfig } from '../types';
import { isStoreOpen } from '../utils/formatters';
import { SmartSearchBar } from './SmartSearchBar';

interface HeaderProps {
  config: StoreConfig;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  accessibility: AccessibilitySettings;
  onAccessibilityChange: (settings: AccessibilitySettings) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  products?: Product[];
  categories?: Category[];
  productCounts?: Record<string, number>;
  onSelectCategory?: (categoryId: string) => void;
  onSelectSymptom?: (symptomId: string) => void;
  onOpenProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  cartCount: number;
  favoritesCount: number;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  lang,
  onLanguageChange,
  searchQuery,
  onSearchChange,
  products = [],
  categories = [],
  productCounts = {},
  onSelectCategory = () => {},
  onSelectSymptom,
  onOpenProduct = () => {},
  onAddToCart = () => {},
  cartCount,
  favoritesCount,
  onOpenCart,
  onOpenFavorites,
  onOpenAdmin,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const status = isStoreOpen(config);
  const isKz = lang === 'kz';

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 w-full max-w-full overflow-visible bg-[#061812]/95 backdrop-blur-xl border-b border-amber-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-colors"
    >
      {/* Top Utility Bar */}
      <div
        id="top-utility-bar"
        className="py-1.5 sm:py-2 px-3 sm:px-6 text-[12px] sm:text-sm bg-[#030D0A] text-emerald-100/90 border-b border-amber-500/15 w-full overflow-hidden"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5 sm:gap-3">
          {/* Address & Working Hours */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-[12px] sm:text-sm">
            <a
              id="top-address-link"
              href={config.gis2Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-amber-300 transition-colors whitespace-nowrap"
              title="Открыть в 2GIS"
            >
              <MapPin className="w-[14px] h-[14px] sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-stone-100">
                {config.city}, {config.boutiqueNumber}
              </span>
              <span className="hidden md:inline text-emerald-300/80">({config.address})</span>
            </a>

            <div id="top-hours-badge" className="flex items-center gap-1.5">
              <Clock className="w-[13px] h-[13px] sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0 hidden sm:inline" />
              <span className="hidden lg:inline text-stone-300">
                {isKz ? config.workingHoursKz : config.workingHoursRu}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap ${
                  status.isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                <span
                  className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                    status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                {isKz ? status.textKz : status.textRu}
              </span>
            </div>
          </div>

          {/* Right Tools: Language, Phone, Admin */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            {/* Language Selector */}
            <div
              id="language-switcher"
              className="flex items-center gap-0.5 bg-[#0B241B] p-0.5 rounded-xl border border-amber-500/25 text-[11px] sm:text-xs"
            >
              <button
                id="lang-ru-btn"
                onClick={() => onLanguageChange('ru')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-extrabold transition-colors cursor-pointer ${
                  lang === 'ru'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                RU
              </button>
              <button
                id="lang-kz-btn"
                onClick={() => onLanguageChange('kz')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-extrabold transition-colors cursor-pointer ${
                  lang === 'kz'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                KZ
              </button>
            </div>

            {/* Phone direct call */}
            <a
              id="top-call-phone-link"
              href={`tel:+${config.whatsappNumber}`}
              className="hidden xl:flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-bold text-sm ml-1"
            >
              <PhoneCall className="w-4 h-4" />
              <span>+7 778 175 42 41</span>
            </a>

            {/* Discrete Admin access on top */}
            <button
              id="top-admin-access-btn"
              onClick={onOpenAdmin}
              className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-[#0B241B] border border-amber-500/20 text-amber-300/90 hover:text-amber-200 hover:border-amber-400/50 transition-colors text-[11px] sm:text-xs font-bold cursor-pointer whitespace-nowrap"
              title="Панель управления (Бутик №24)"
            >
              <Lock className="w-[12px] h-[12px] sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <span>Бутик №24</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div
        id="main-nav-container"
        className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-5 w-full overflow-visible"
      >
        {/* Boutique Brand — Guaranteed full visibility regardless of phone system font size */}
        <div id="boutique-brand" className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div
            id="boutique-logo-icon"
            className="w-[40px] h-[40px] sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-stone-950 flex items-center justify-center font-serif text-[20px] sm:text-2xl font-black shadow-lg shadow-amber-500/20 cursor-pointer shrink-0 ring-1 ring-amber-200/50"
            onClick={onOpenAdmin}
            title="MUSLIM SHOP • Атырау"
          >
            <span>М</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                id="brand-name-title"
                className="font-serif tracking-wide sm:tracking-wider font-extrabold text-[clamp(18px,5vw,23px)] sm:text-2xl md:text-3xl text-white leading-tight whitespace-nowrap block"
              >
                MUSLIM SHOP
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-lg text-xs uppercase font-extrabold tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/40 shrink-0">
                {config.boutiqueNumber}
              </span>
            </div>
            <p
              id="brand-location-subtitle"
              className="text-[clamp(11px,3.1vw,13.5px)] sm:text-sm text-emerald-200/85 font-medium mt-0.5 leading-snug"
            >
              {config.city} • {isKz ? 'Халал & Премиум бутик' : 'Халяль & Премиум бутик'}
            </p>
          </div>
        </div>

        {/* Center Search Bar with Autocomplete & Category/Keyword Search (Desktop) */}
        <div
          id="header-search-bar"
          className="hidden md:flex flex-1 max-w-xl mx-4 lg:mx-6 relative"
        >
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
          />
        </div>

        {/* Action Buttons: WhatsApp (Desktop), Favorites, Cart */}
        <div id="header-actions" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick WhatsApp Chat */}
          <a
            id="whatsapp-direct-btn"
            href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
              isKz
                ? 'Сәлеметсіз бе! Маған MUSLIM SHOP бойынша кеңес керек еді.'
                : 'Здравствуйте! Мне нужна консультация по ассортименту MUSLIM SHOP.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0D2B20] text-emerald-200 border border-emerald-500/35 hover:border-amber-400/50 hover:text-white font-bold text-sm transition-all shadow-sm shrink-0"
            title="Написать в WhatsApp менеджеру"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp</span>
          </a>

          {/* Favorites Button */}
          <button
            id="favorites-drawer-btn"
            onClick={onOpenFavorites}
            className="relative w-[40px] h-[40px] sm:w-auto sm:h-auto sm:p-3 rounded-2xl bg-[#0D281E] border border-amber-500/25 text-stone-200 hover:text-amber-300 hover:border-amber-400/50 flex items-center justify-center transition-all cursor-pointer shrink-0"
            title={isKz ? 'Таңдаулылар' : 'Избранное'}
          >
            <Heart
              className={`w-[20px] h-[20px] sm:w-5 sm:h-5 ${
                favoritesCount > 0 ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
            {favoritesCount > 0 && (
              <span
                id="favorites-badge-count"
                className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-amber-400 text-stone-950 text-[11px] font-black flex items-center justify-center shadow-md"
              >
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            id="cart-drawer-btn"
            onClick={onOpenCart}
            className="flex items-center justify-center gap-2 w-[44px] h-[40px] sm:w-auto sm:h-auto sm:px-4.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-sm sm:text-base transition-all shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-[20px] h-[20px] sm:w-5 sm:h-5 text-stone-950 stroke-[2.2]" />
              {cartCount > 0 && (
                <span
                  id="cart-badge-count"
                  className="absolute -top-2 -right-2 min-w-[19px] h-[19px] px-1 rounded-full bg-emerald-950 text-amber-300 border border-amber-400 text-[11px] font-black flex items-center justify-center shadow-md"
                >
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline font-extrabold">
              {isKz ? 'Себет' : 'Корзина'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar with Autocomplete (Always easily accessible on mobile) */}
      <div
        id="mobile-search-container"
        className="md:hidden px-3.5 pb-3 pt-1.5 border-t border-amber-500/15 bg-[#061812]"
      >
        <SmartSearchBar
          inputId="mobile-search-input"
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
          autoFocus={isSearchOpen}
          onAfterSelect={() => setIsSearchOpen(false)}
        />
      </div>
    </header>
  );
};
