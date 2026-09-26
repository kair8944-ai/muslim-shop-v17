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
  Lock,
} from 'lucide-react';
import { AccessibilitySettings, Language, StoreConfig } from '../types';
import { isStoreOpen } from '../utils/formatters';
import { AccessibilityModal } from './AccessibilityModal';

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
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const status = isStoreOpen(config);

  const isKz = lang === 'kz';
  const isCustomAccessibility = accessibility.highContrast || accessibility.scale !== 'normal';

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
    <>
      <header
        id="main-header"
        className={`sticky top-0 z-40 w-full max-w-full overflow-x-hidden transition-colors ${
          accessibility.highContrast
            ? 'bg-white border-b-2 border-stone-900 shadow-md text-black'
            : 'bg-white/95 backdrop-blur-md border-b border-amber-900/10 shadow-xs'
        }`}
      >
        {/* Top Utility Bar */}
        <div
          id="top-utility-bar"
          className={`py-1.5 sm:py-2 px-3 sm:px-4 text-xs transition-colors w-full overflow-hidden ${
            accessibility.highContrast
              ? 'bg-black text-white border-b-2 border-amber-400'
              : 'bg-emerald-950 text-emerald-100 border-b border-emerald-900/50'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
            {/* Address & Working Hours */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-[11px] sm:text-xs">
              <a
                id="top-address-link"
                href={config.gis2Url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-amber-300 transition-colors"
                title="Открыть в 2GIS"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold">{config.city}, {config.boutiqueNumber}</span>
                <span className="hidden md:inline text-emerald-400">({config.address})</span>
              </a>

              <div id="top-hours-badge" className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="hidden lg:inline">
                  {isKz ? config.workingHoursKz : config.workingHoursRu}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold ${
                    status.isOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {isKz ? status.textKz : status.textRu}
                </span>
              </div>
            </div>

            {/* Right Tools: Accessibility Switchers, Language, Phone, Admin */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
              {/* Accessibility Controls Group */}
              <div
                id="accessibility-controls"
                className="flex items-center gap-1 bg-emerald-900/70 p-0.5 sm:p-1 rounded-xl border border-emerald-700/60"
              >
                {/* 1. Modal trigger button (Very intuitive for elderly) */}
                <button
                  id="open-accessibility-modal-btn"
                  onClick={() => setIsAccessModalOpen(true)}
                  className={`flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    isCustomAccessibility
                      ? 'bg-amber-400 text-stone-950 shadow-xs ring-1 ring-amber-300'
                      : 'bg-emerald-800 text-amber-200 hover:bg-emerald-700 hover:text-white'
                  }`}
                  title={isKz ? 'Нашар көретіндерге арналған толық баптаулар' : 'Настройки для слабовидящих и пожилых'}
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>{isKz ? 'Нашар көретіндерге' : 'Для слабовидящих'}</span>
                  {isCustomAccessibility && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse" />
                  )}
                </button>

                {/* 2. Direct Font Size Segmented Switch (A / A+ / A++) */}
                <div
                  id="font-size-switcher-segmented"
                  className="hidden sm:flex items-center bg-emerald-950/90 rounded-lg p-0.5 border border-emerald-800"
                  role="group"
                  aria-label="Размер шрифта"
                >
                  <button
                    id="scale-normal-btn"
                    onClick={() => onAccessibilityChange({ ...accessibility, scale: 'normal' })}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                      accessibility.scale === 'normal'
                        ? 'bg-amber-400 text-stone-950 shadow-2xs'
                        : 'text-emerald-300 hover:text-white'
                    }`}
                    title="Обычный размер шрифта (100%)"
                  >
                    A
                  </button>
                  <button
                    id="scale-large-btn"
                    onClick={() => onAccessibilityChange({ ...accessibility, scale: 'large' })}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                      accessibility.scale === 'large'
                        ? 'bg-amber-400 text-stone-950 shadow-2xs'
                        : 'text-emerald-300 hover:text-white'
                    }`}
                    title="Крупный шрифт (125%) — Рекомендуется для пожилых"
                  >
                    A+
                  </button>
                  <button
                    id="scale-extra-btn"
                    onClick={() => onAccessibilityChange({ ...accessibility, scale: 'extra' })}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                      accessibility.scale === 'extra'
                        ? 'bg-amber-400 text-stone-950 shadow-2xs'
                        : 'text-emerald-300 hover:text-white'
                    }`}
                    title="Очень крупный шрифт (150%)"
                  >
                    A++
                  </button>
                </div>

                {/* 3. Direct High Contrast Toggle Switch */}
                <button
                  id="toggle-contrast-btn"
                  onClick={toggleHighContrast}
                  className={`hidden md:flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    accessibility.highContrast
                      ? 'bg-amber-400 text-stone-950 font-extrabold shadow-2xs'
                      : 'text-emerald-300 hover:text-white hover:bg-emerald-800/60'
                  }`}
                  title={
                    accessibility.highContrast
                      ? 'Высокая контрастность включена (нажмите для выключения)'
                      : 'Включить режим высокой контрастности (четкий текст)'
                  }
                >
                  <span>{accessibility.highContrast ? 'Контраст: ВКЛ' : 'Контраст'}</span>
                </button>
              </div>

              {/* Language Selector */}
              <div id="language-switcher" className="flex items-center gap-1 text-xs">
                <button
                  id="lang-ru-btn"
                  onClick={() => onLanguageChange('ru')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
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
                className="hidden xl:flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-medium ml-1"
              >
                <PhoneCall className="w-3 h-3" />
                <span>+7 778 175 42 41</span>
              </a>

              {/* Discrete Admin access on top */}
              <button
                id="top-admin-access-btn"
                onClick={onOpenAdmin}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-emerald-400/90 hover:text-amber-300 hover:bg-emerald-900/80 transition-colors text-[11px] font-medium cursor-pointer"
                title="Панель управления (Бутик №24)"
              >
                <Lock className="w-3 h-3 text-emerald-400" />
                <span className="font-semibold text-emerald-300">Бутик №24</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div id="main-nav-container" className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3.5 flex items-center justify-between gap-1.5 sm:gap-4 w-full overflow-hidden">
          {/* Boutique Brand */}
          <div id="boutique-brand" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div
              id="boutique-logo-icon"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-950 border border-amber-500/30 text-amber-400 flex items-center justify-center font-serif text-base sm:text-lg font-bold shadow-xs cursor-pointer shrink-0"
              onClick={onOpenAdmin}
              title="MUSLIM SHOP • Атырау"
            >
              <span>М</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  id="brand-name-title"
                  className="font-serif tracking-wider sm:tracking-widest font-extrabold text-base sm:text-xl md:text-2xl text-emerald-950 leading-none truncate block"
                >
                  MUSLIM SHOP
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                  {config.boutiqueNumber}
                </span>
              </div>
              <p id="brand-location-subtitle" className="text-[10px] sm:text-xs text-stone-500 font-medium mt-0.5 truncate">
                {config.city} • {isKz ? 'Халал сапа' : 'Халяль & Премиум'}
              </p>
            </div>
          </div>

          {/* Center Search Bar (Desktop) */}
          <div id="header-search-bar" className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-6 relative">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={
                  isKz
                    ? 'Өнімді немесе санатты іздеу (май, дәрумендер, миск)...'
                    : 'Поиск товаров (тмин, iHerb, миск, коллаген, хиджама)...'
                }
                className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-stone-200 bg-stone-50/80 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons: Accessibility Quick Switch, Search Toggle, WhatsApp, Favorites, Cart */}
          <div id="header-actions" className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick Accessibility Button in Main Row (Especially helpful for elderly on mobile & desktop) */}
            <button
              id="main-nav-accessibility-btn"
              onClick={() => setIsAccessModalOpen(true)}
              className={`flex items-center gap-1 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                isCustomAccessibility
                  ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-xs ring-1 ring-amber-300'
                  : 'bg-stone-100/90 text-stone-700 hover:bg-stone-200/80 border-stone-200'
              }`}
              title={isKz ? 'Шрифт өлшемі және контраст' : 'Управление размером шрифта и контрастностью'}
            >
              <Eye className="w-4 h-4 text-emerald-800 shrink-0" />
              <span className="hidden sm:inline">
                {isKz ? 'Шрифт' : 'Шрифт'}
              </span>
              <span className="text-[10px] sm:text-[11px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded bg-white text-emerald-900 border border-emerald-300/80">
                {accessibility.scale === 'normal'
                  ? '100%'
                  : accessibility.scale === 'large'
                  ? '125%'
                  : '150%'}
              </span>
            </button>

            {/* Mobile search toggle */}
            <button
              id="mobile-search-toggle-btn"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              title="Поиск"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

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
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-medium text-xs transition-colors shadow-2xs shrink-0"
              title="Написать в WhatsApp менеджеру"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">WhatsApp</span>
            </a>

            {/* Favorites Button */}
            <button
              id="favorites-drawer-btn"
              onClick={onOpenFavorites}
              className="relative p-1.5 sm:p-2.5 rounded-xl text-stone-700 hover:text-amber-700 hover:bg-amber-50/60 transition-colors cursor-pointer shrink-0"
              title={isKz ? 'Таңдаулылар' : 'Избранное'}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {favoritesCount > 0 && (
                <span
                  id="favorites-badge-count"
                  className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shadow-xs"
                >
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              id="cart-drawer-btn"
              onClick={onOpenCart}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                {cartCount > 0 && (
                  <span
                    id="cart-badge-count"
                    className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-stone-950 text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center shadow-xs"
                  >
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-semibold">
                {isKz ? 'Себет' : 'Корзина'}
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
                placeholder={isKz ? 'Өнімдерді іздеу...' : 'Поиск товаров...'}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-stone-300 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Accessible Settings Dialog for Elderly / Visually Impaired */}
      <AccessibilityModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        accessibility={accessibility}
        onAccessibilityChange={onAccessibilityChange}
        lang={lang}
      />
    </>
  );
};

