import React from 'react';
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  Search,
  Shield,
} from 'lucide-react';
import { AccessibilitySettings, Language } from '../types';

export type BottomNavTab = 'home' | 'catalog' | 'search' | 'cart' | 'admin';

interface BottomNavProps {
  activeTab?: string;
  lang: Language;
  accessibility?: AccessibilitySettings;
  cartCount: number;
  onSelectHome: () => void;
  onOpenCatalog: () => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  lang,
  cartCount,
  onSelectHome,
  onOpenCatalog,
  onOpenSearch,
  onOpenCart,
  onOpenAdmin,
}) => {
  const isKz = lang === 'kz';

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label={isKz ? 'Төменгі навигация' : 'Нижняя навигация'}
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 text-slate-600 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden"
    >
      <div className="max-w-md mx-auto px-2">
        <div className="grid grid-cols-5 items-center h-16">
          {/* 1. Главная */}
          <button
            id="bottom-nav-home"
            type="button"
            onClick={onSelectHome}
            className="flex flex-col items-center justify-center h-full min-h-[48px] px-1 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Home className="w-5 h-5 text-slate-800" />
            <span className="text-[11px] font-bold mt-1 tracking-tight truncate max-w-full">
              {isKz ? 'Басты' : 'Главная'}
            </span>
          </button>

          {/* 2. Каталог */}
          <button
            id="bottom-nav-catalog"
            type="button"
            onClick={onOpenCatalog}
            className="flex flex-col items-center justify-center h-full min-h-[48px] px-1 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-5 h-5 text-slate-800" />
            <span className="text-[11px] font-bold mt-1 tracking-tight truncate max-w-full">
              {isKz ? 'Каталог' : 'Каталог'}
            </span>
          </button>

          {/* 3. Поиск */}
          <button
            id="bottom-nav-search"
            type="button"
            onClick={onOpenSearch}
            className="flex flex-col items-center justify-center h-full min-h-[48px] px-1 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Search className="w-5 h-5 text-slate-800" />
            <span className="text-[11px] font-bold mt-1 tracking-tight truncate max-w-full">
              {isKz ? 'Іздеу' : 'Поиск'}
            </span>
          </button>

          {/* 4. Корзина */}
          <button
            id="bottom-nav-cart"
            type="button"
            onClick={onOpenCart}
            className="relative flex flex-col items-center justify-center h-full min-h-[48px] px-1 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 w-4.5 h-4.5 rounded-full bg-rose-600 text-white font-mono font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold mt-1 tracking-tight truncate max-w-full">
              {isKz ? 'Себет' : 'Корзина'}
            </span>
          </button>

          {/* 5. Админ */}
          <button
            id="bottom-nav-admin"
            type="button"
            onClick={onOpenAdmin}
            className="flex flex-col items-center justify-center h-full min-h-[48px] px-1 text-amber-950 font-bold transition-colors cursor-pointer bg-amber-50/80 rounded-xl my-1"
          >
            <Shield className="w-5 h-5 text-[#C5A059]" />
            <span className="text-[11px] font-black text-amber-950 mt-1 tracking-tight truncate max-w-full">
              {isKz ? 'Админ' : 'Админ'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
