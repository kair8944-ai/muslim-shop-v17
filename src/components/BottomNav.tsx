import React from 'react';
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { AccessibilitySettings, Language } from '../types';

export type BottomNavTab = 'home' | 'catalog' | 'cart' | 'favorites' | 'contact';

interface BottomNavProps {
  activeTab: BottomNavTab;
  lang: Language;
  accessibility: AccessibilitySettings;
  cartCount: number;
  favoritesCount: number;
  onSelectHome: () => void;
  onOpenCatalog: () => void;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenContact: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  lang,
  accessibility,
  cartCount,
  favoritesCount,
  onSelectHome,
  onOpenCatalog,
  onOpenCart,
  onOpenFavorites,
  onOpenContact,
}) => {
  const isKz = lang === 'kz';
  const isHighContrast = accessibility.highContrast;

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label={isKz ? 'Төменгі навигация мәзірі' : 'Нижняя панель навигации'}
      className={`fixed bottom-0 inset-x-0 z-40 transition-colors select-none ${
        isHighContrast
          ? 'bg-black text-white border-t-2 border-amber-400 shadow-2xl'
          : 'bg-[#041E16]/95 backdrop-blur-xl border-t border-amber-400/25 text-stone-200 shadow-[0_-8px_30px_rgba(0,0,0,0.35)]'
      }`}
    >
      {/* Subtle top gold shimmer line */}
      {!isHighContrast && (
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
      )}

      <div className="max-w-3xl mx-auto px-2 sm:px-6">
        <div className="grid grid-cols-5 items-center h-16 sm:h-[68px]">
          {/* 1. Главная */}
          <button
            id="bottom-nav-home"
            type="button"
            onClick={onSelectHome}
            className={`group relative flex flex-col items-center justify-center h-full min-h-[48px] px-1 transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'text-amber-300 font-bold'
                : 'text-emerald-100/75 hover:text-white'
            }`}
          >
            {activeTab === 'home' && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            )}
            <div
              className={`p-1 rounded-xl transition-transform duration-150 group-active:scale-90 ${
                activeTab === 'home' ? 'bg-amber-400/15 text-amber-300' : ''
              }`}
            >
              <Home className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full">
              {isKz ? 'Басты бет' : 'Главная'}
            </span>
          </button>

          {/* 2. Каталог */}
          <button
            id="bottom-nav-catalog"
            type="button"
            onClick={onOpenCatalog}
            className={`group relative flex flex-col items-center justify-center h-full min-h-[48px] px-1 transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'text-amber-300 font-bold'
                : 'text-emerald-100/75 hover:text-white'
            }`}
          >
            {activeTab === 'catalog' && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            )}
            <div
              className={`p-1 rounded-xl transition-transform duration-150 group-active:scale-90 ${
                activeTab === 'catalog' ? 'bg-amber-400/15 text-amber-300' : ''
              }`}
            >
              <LayoutGrid className="w-5 h-5 sm:w-[22px] sm:h-[22px]" />
            </div>
            <span className="text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full">
              {isKz ? 'Каталог' : 'Каталог'}
            </span>
          </button>

          {/* 3. Корзина (Center Prominent Pill / Button) */}
          <button
            id="bottom-nav-cart"
            type="button"
            onClick={onOpenCart}
            className="group relative flex flex-col items-center justify-center h-full min-h-[48px] px-1 cursor-pointer"
          >
            <div
              className={`relative -mt-3.5 w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center transition-all duration-150 group-active:scale-95 shadow-lg ${
                isHighContrast
                  ? 'bg-amber-400 text-black border-2 border-white'
                  : cartCount > 0 || activeTab === 'cart'
                  ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-stone-950 shadow-amber-500/30 ring-2 ring-amber-200/70'
                  : 'bg-gradient-to-br from-emerald-700 to-emerald-900 text-amber-300 border border-amber-400/40 hover:border-amber-300'
              }`}
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              {cartCount > 0 && (
                <span
                  id="bottom-nav-cart-badge"
                  className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] sm:text-[11px] font-black flex items-center justify-center shadow-md border-2 border-[#041E16] tabular-nums"
                >
                  {cartCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full ${
                cartCount > 0 || activeTab === 'cart'
                  ? 'text-amber-300 font-bold'
                  : 'text-emerald-100/80 group-hover:text-white'
              }`}
            >
              {isKz ? 'Себет' : 'Корзина'}
            </span>
          </button>

          {/* 4. Избранное */}
          <button
            id="bottom-nav-favorites"
            type="button"
            onClick={onOpenFavorites}
            className={`group relative flex flex-col items-center justify-center h-full min-h-[48px] px-1 transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'text-amber-300 font-bold'
                : 'text-emerald-100/75 hover:text-white'
            }`}
          >
            {activeTab === 'favorites' && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            )}
            <div
              className={`relative p-1 rounded-xl transition-transform duration-150 group-active:scale-90 ${
                activeTab === 'favorites' ? 'bg-amber-400/15 text-amber-300' : ''
              }`}
            >
              <Heart
                className={`w-5 h-5 sm:w-[22px] sm:h-[22px] ${
                  favoritesCount > 0 ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
              {favoritesCount > 0 && (
                <span
                  id="bottom-nav-favorites-badge"
                  className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black flex items-center justify-center shadow-xs border border-[#041E16] tabular-nums"
                >
                  {favoritesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full">
              {isKz ? 'Таңдаулы' : 'Избранное'}
            </span>
          </button>

          {/* 5. WhatsApp / Бутик №24 */}
          <button
            id="bottom-nav-contact"
            type="button"
            onClick={onOpenContact}
            className={`group relative flex flex-col items-center justify-center h-full min-h-[48px] px-1 transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'text-amber-300 font-bold'
                : 'text-emerald-100/75 hover:text-white'
            }`}
          >
            {activeTab === 'contact' && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            )}
            <div
              className={`relative p-1 rounded-xl transition-transform duration-150 group-active:scale-90 ${
                activeTab === 'contact' ? 'bg-amber-400/15 text-amber-300' : ''
              }`}
            >
              <MessageCircle className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-emerald-400 group-hover:text-amber-300 transition-colors" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#041E16]" />
            </div>
            <span className="text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap truncate max-w-full">
              {isKz ? 'Байланыс' : 'Связь'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
