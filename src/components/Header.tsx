import React, { useState } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  MessageCircle,
  Clock,
  MapPin,
  Eye,
  X,
  PhoneCall,
  SlidersHorizontal,
} from 'lucide-react';
import { AccessibilitySettings, Language, StoreConfig } from '../types';
import { isStoreOpen } from '../utils/formatters';

interface HeaderProps {
  config: StoreConfig;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  accessibility: AccessibilitySettings;
  onAccessibilityChange: (settings: AccessibilitySettings) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
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
  accessibility,
  onAccessibilityChange,
  searchQuery,
  onSearchChange,
  cartCount,
  favoritesCount,
  onOpenCart,
  onOpenFavorites,
  onOpenAdmin,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const status = isStoreOpen();

  const toggleScale = () => {
    if (accessibility.scale === 'normal') {
      onAccessibilityChange({ ...accessibility, scale: 'large' });
    } else if (accessibility.scale === 'large') {
      onAccessibilityChange({ ...accessibility, scale: 'extra' });
    } else {
      onAccessibilityChange({ ...accessibility, scale: 'normal' });
    }
  };

  const toggleHighContrast = () => {
    onAccessibilityChange({
      ...accessibility,
      highContrast: !accessibility.highContrast,
    });
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-900/10 shadow-xs transition-colors"
    >
      {/* Top Utility Bar */}
      <div
        id="top-utility-bar"
        className="bg-emerald-950 text-emerald-100 text-xs py-2 px-4 border-b border-emerald-900/50"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Address & Working Hours */}
          <div className="flex items-center gap-4 flex-wrap">
            <a
              id="top-address-link"
              href={config.gis2Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
              title="Открыть в 2GIS"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-medium">{config.city}, {config.boutiqueNumber}</span>
              <span className="hidden sm:inline text-emerald-400">({config.address})</span>
            </a>

            <div id="top-hours-badge" className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">
                {lang === 'kz' ? config.workingHoursKz : config.workingHoursRu}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  status.isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {lang === 'kz' ? status.textKz : status.textRu}
              </span>
            </div>
          </div>

          {/* Right Tools: Accessibility, Language, Direct Phone */}
          <div className="flex items-center gap-3">
            {/* Accessibility: Font Size Switcher for poor vision */}
            <div
              id="accessibility-controls"
              className="flex items-center bg-emerald-900/80 rounded-lg p-0.5 border border-emerald-700/60"
            >
              <button
                id="toggle-font-scale-btn"
                onClick={toggleScale}
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded hover:bg-emerald-800 text-amber-200 transition-colors"
                title="Увеличенный шрифт для слабовидящих / Үлкен шрифт"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="font-bold">
                  {accessibility.scale === 'normal' ? 'A (100%)' : accessibility.scale === 'large' ? 'A+ (125%)' : 'A++ (150%)'}
                </span>
              </button>
              <button
                id="toggle-contrast-btn"
                onClick={toggleHighContrast}
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded transition-colors ${
                  accessibility.highContrast
                    ? 'bg-amber-400 text-stone-950 font-bold'
                    : 'text-emerald-300 hover:text-white'
                }`}
                title="Высокая контрастность / Жоғары контраст"
              >
                {accessibility.highContrast ? 'Контраст: ВКЛ' : 'Контраст'}
              </button>
            </div>

            {/* Language Selector */}
            <div id="language-switcher" className="flex items-center gap-1 text-xs">
              <button
                id="lang-ru-btn"
                onClick={() => onLanguageChange('ru')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  lang === 'ru'
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                RU
              </button>
              <span className="text-emerald-700">|</span>
              <button
                id="lang-kz-btn"
                onClick={() => onLanguageChange('kz')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  lang === 'kz'
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
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
              className="hidden md:flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-medium ml-2"
            >
              <PhoneCall className="w-3 h-3" />
              <span>+7 778 175 42 41</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div id="main-nav-container" className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        {/* Boutique Brand */}
        <div id="boutique-brand" className="flex items-center gap-3">
          <div
            id="boutique-logo-icon"
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-950 border border-amber-500/30 text-amber-400 flex items-center justify-center font-serif text-lg font-bold shadow-xs cursor-pointer"
            onClick={onOpenAdmin}
            title="MUSLIM SHOP • Атырау"
          >
            <span>М</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                id="brand-name-title"
                className="font-serif tracking-widest font-extrabold text-xl sm:text-2xl text-emerald-950 leading-none"
              >
                MUSLIM SHOP
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                {config.boutiqueNumber}
              </span>
            </div>
            <p id="brand-location-subtitle" className="text-xs text-stone-500 font-medium mt-0.5">
              {config.city} • {lang === 'kz' ? 'Халал & Премиум сапа' : 'Халяль & Премиум качество'}
            </p>
          </div>
        </div>

        {/* Center Search Bar (Desktop) */}
        <div id="header-search-bar" className="hidden md:flex flex-1 max-w-md mx-6 relative">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="header-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                lang === 'kz'
                  ? 'Өнімді немесе санатты іздеу (май, дәрумендер, миск)...'
                  : 'Поиск товаров (тмин, iHerb, миск, коллаген, хиджама)...'
              }
              className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-stone-200 bg-stone-50/80 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                id="clear-search-btn"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons: Search Toggle (mobile), WhatsApp, Favorites, Cart */}
        <div id="header-actions" className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search toggle */}
          <button
            id="mobile-search-toggle-btn"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors"
            title="Поиск"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Quick WhatsApp Chat */}
          <a
            id="whatsapp-direct-btn"
            href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
              lang === 'kz'
                ? 'Сәлеметсіз бе! Маған MUSLIM SHOP бойынша кеңес керек еді.'
                : 'Здравствуйте! Мне нужна консультация по ассортименту MUSLIM SHOP.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-medium text-xs transition-colors shadow-2xs"
            title="Написать в WhatsApp менеджеру"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">WhatsApp</span>
          </a>

          {/* Favorites Button */}
          <button
            id="favorites-drawer-btn"
            onClick={onOpenFavorites}
            className="relative p-2.5 rounded-xl text-stone-700 hover:text-amber-700 hover:bg-amber-50/60 border border-transparent hover:border-amber-200 transition-colors"
            title={lang === 'kz' ? 'Таңдаулылар' : 'Избранное'}
          >
            <Heart className="w-5 h-5" />
            {favoritesCount > 0 && (
              <span
                id="favorites-badge-count"
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs"
              >
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            id="cart-drawer-btn"
            onClick={onOpenCart}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              {cartCount > 0 && (
                <span
                  id="cart-badge-count"
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-extrabold flex items-center justify-center shadow-xs"
                >
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline font-semibold">
              {lang === 'kz' ? 'Себет' : 'Корзина'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Search Input Drawer */}
      {isSearchOpen && (
        <div id="mobile-search-container" className="md:hidden px-4 pb-3 pt-1 border-t border-stone-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="mobile-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={lang === 'kz' ? 'Өнімдерді іздеу...' : 'Поиск товаров...'}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
