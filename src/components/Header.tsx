import React, { useState } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  MessageCircle,
  MapPin,
  Phone,
  Shield,
  Layers,
  X,
  ExternalLink,
} from 'lucide-react';
import { AccessibilitySettings, Category, Language, Product, StoreConfig } from '../types';
import { isStoreOpen, formatPrice } from '../utils/formatters';
import { SmartSearchBar } from './SmartSearchBar';
import { SyncStatusWidget } from './SyncStatusWidget';

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
  onOpenCatalog?: () => void;
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
  onOpenCatalog,
}) => {
  const isKz = lang === 'kz';

  return (
    <header id="main-header" className="sticky top-0 z-40 w-full bg-white shadow-sm border-b border-slate-200">
      {/* 1. Top Utility Info Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs px-3 sm:px-6 py-2 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Location & Hours */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
              <span>г. Атырау, Рынок Дина, ТД «Дина Байзар», Бутик №24</span>
            </div>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:inline text-slate-400">
              {isKz ? 'Күн сайын: 10:00 – 19:00' : 'Ежедневно: 10:00 – 19:00'}
            </span>
          </div>

          {/* Right: Phone & Language & Admin button */}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <a
              href="tel:+77781754241"
              className="flex items-center gap-1.5 font-bold hover:text-[#C5A059] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
              <span>+7 778 175 42 41</span>
            </a>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-300">
              <button
                type="button"
                id="lang-ru-btn"
                onClick={() => onLanguageChange('ru')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  lang === 'ru'
                    ? 'bg-[#C5A059] text-slate-950 font-black'
                    : 'hover:text-white'
                }`}
              >
                RU
              </button>
              <button
                type="button"
                id="lang-kz-btn"
                onClick={() => onLanguageChange('kz')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  lang === 'kz'
                    ? 'bg-[#C5A059] text-slate-950 font-black'
                    : 'hover:text-white'
                }`}
              >
                KZ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Store Header: Brand + Large Search + Actions */}
      <div className="px-3 sm:px-6 py-3 sm:py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-5">
          {/* Brand Mark */}
          <div className="flex items-center gap-3 shrink-0">
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
                <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold tracking-widest text-slate-500 uppercase mt-0.5">
                АТЫРАУ • БУТИК 24
              </span>
            </div>

            {/* Quick Catalog Button */}
            {onOpenCatalog && (
              <button
                type="button"
                onClick={onOpenCatalog}
                className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-[#C5A059]" />
                <span>{isKz ? 'Каталог' : 'Каталог'}</span>
              </button>
            )}
          </div>

          {/* Large Search Bar */}
          <div className="flex-1 min-w-[140px] max-w-2xl mx-1 sm:mx-3 relative">
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

          {/* Right Actions: Sync Status + Admin + Cart */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sync status widget (header variant) */}
            <SyncStatusWidget lang={lang} variant="header" products={products} />

            {/* PROMINENT ADMIN BUTTON (visible on ALL devices!) */}
            <button
              type="button"
              id="header-admin-btn"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300/80 font-bold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
              title="Панель администратора магазина"
            >
              <Shield className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span className="font-extrabold">{isKz ? 'Админ' : 'Админ'}</span>
            </button>

            {/* Cart Button with Count Badge */}
            <button
              type="button"
              id="header-cart-btn"
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
              <span className="hidden sm:inline font-bold">
                {isKz ? 'Себет' : 'Корзина'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
