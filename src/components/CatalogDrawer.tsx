import React from 'react';
import {
  X,
  Search,
  Layers,
  Flame,
  Sparkles,
  MessageCircle,
  PhoneCall,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Category, Language, Product, StoreConfig } from '../types';
import { isStoreOpen } from '../utils/formatters';
import { SmartSearchBar } from './SmartSearchBar';

interface CatalogDrawerProps {
  isOpen: boolean;
  mode: 'catalog' | 'contact';
  onClose: () => void;
  products?: Product[];
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  onSelectSymptom?: (id: string) => void;
  onOpenProduct?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  productCounts: Record<string, number>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  config: StoreConfig;
  lang: Language;
}

export const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  isOpen,
  mode,
  onClose,
  products = [],
  categories,
  selectedCategoryId,
  onSelectCategory,
  onSelectSymptom,
  onOpenProduct = () => {},
  onAddToCart = () => {},
  productCounts,
  searchQuery,
  onSearchChange,
  config,
  lang,
}) => {
  if (!isOpen) return null;

  const isKz = lang === 'kz';
  const status = isStoreOpen(config);

  const handlePickCategory = (catId: string) => {
    onSelectCategory(catId);
    onClose();
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 80);
  };

  return (
    <div
      id="bottom-sheet-drawer-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="bottom-sheet-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#FAF8F5] rounded-t-3xl border-t-2 border-amber-400/50 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden mb-16 sm:mb-[68px]"
      >
        {/* Drag Handle & Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white px-5 pt-3 pb-4 border-b border-amber-400/25 shrink-0">
          <div className="w-12 h-1.5 bg-emerald-700/80 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                {mode === 'catalog' ? (
                  <Layers className="w-5 h-5" />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-serif font-extrabold text-base sm:text-lg text-white leading-tight">
                  {mode === 'catalog'
                    ? isKz
                      ? 'Тауарлар каталогы'
                      : 'Каталог товаров MUSLIM SHOP'
                    : isKz
                    ? 'Байланыс және мекенжай'
                    : 'Связь с Бутиком №24'}
                </h3>
                <p className="text-[11px] text-emerald-200/80">
                  {mode === 'catalog'
                    ? isKz
                      ? 'Қажетті бөлімді таңдаңыз немесе іздеңіз'
                      : 'Выберите нужную категорию для быстрого перехода'
                    : `${config.city}, ${config.address} • ${config.boutiqueNumber}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white transition-colors cursor-pointer"
              title={isKz ? 'Жабу' : 'Закрыть'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {mode === 'catalog' ? (
            <>
              {/* Quick Search inside Catalog Sheet with Autocomplete */}
              <SmartSearchBar
                inputId="catalog-drawer-search-input"
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                products={products}
                categories={categories}
                productCounts={productCounts}
                lang={lang}
                onSelectCategory={(catId) => {
                  handlePickCategory(catId);
                }}
                onSelectSymptom={(symId) => {
                  if (onSelectSymptom) onSelectSymptom(symId);
                  onClose();
                }}
                onOpenProduct={(prod) => {
                  onClose();
                  onOpenProduct(prod);
                }}
                onAddToCart={onAddToCart}
                onAfterSelect={() => onClose()}
              />

              {/* Special Quick Filters: Hits & New */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePickCategory('cat-hits')}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedCategoryId === 'cat-hits'
                      ? 'bg-amber-400 text-stone-950 border-amber-500 font-extrabold shadow-sm'
                      : 'bg-gradient-to-br from-amber-50 to-orange-50/70 hover:from-amber-100/80 text-stone-900 border-amber-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">
                        {isKz ? 'Хит тауарлар' : 'Хиты продаж'}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {productCounts['cat-hits'] || 0} {isKz ? 'өнім' : 'товаров'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePickCategory('cat-new')}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedCategoryId === 'cat-new'
                      ? 'bg-emerald-900 text-white border-emerald-950 font-extrabold shadow-sm'
                      : 'bg-gradient-to-br from-emerald-50 to-teal-50/70 hover:from-emerald-100/80 text-stone-900 border-emerald-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600/15 text-emerald-700 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs sm:text-sm font-bold truncate ${
                          selectedCategoryId === 'cat-new' ? 'text-white' : 'text-stone-900'
                        }`}
                      >
                        {isKz ? 'Жаңа өнімдер' : 'Новинки'}
                      </div>
                      <div
                        className={`text-[10px] ${
                          selectedCategoryId === 'cat-new' ? 'text-emerald-200' : 'text-stone-500'
                        }`}
                      >
                        {productCounts['cat-new'] || 0} {isKz ? 'өнім' : 'товаров'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                </button>
              </div>

              {/* All Store Categories Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-500 px-1 flex items-center justify-between">
                  <span>{isKz ? 'Барлық санаттар' : 'Все разделы магазина'}</span>
                  <span className="tabular-nums">{categories.length}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const count = productCounts[cat.id] ?? 0;
                    const catName = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handlePickCategory(cat.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950 text-white border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                            : 'bg-white hover:bg-emerald-50/60 text-stone-900 border-stone-200/90 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-10 h-10 rounded-xl bg-stone-100/90 flex items-center justify-center text-xl shrink-0">
                            {cat.icon || '✨'}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isSelected ? 'text-amber-300' : 'text-stone-900'
                              }`}
                            >
                              {catName}
                            </p>
                            <p
                              className={`text-[11px] tabular-nums ${
                                isSelected ? 'text-emerald-200' : 'text-stone-500'
                              }`}
                            >
                              {count} {isKz ? 'өнім қолда бар' : 'позиций'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-amber-400" />
                          )}
                          <ChevronRight
                            className={`w-4 h-4 ${
                              isSelected ? 'text-amber-300' : 'text-stone-400'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Contact & Boutique Info Sheet */
            <div className="space-y-4">
              {/* Working Hours & Live Status Banner */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200/90 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-stone-900">
                      {isKz ? config.workingHoursKz : config.workingHoursRu}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {config.city}, {config.address} ({config.boutiqueNumber})
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                    status.isOpen
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                    }`}
                  />
                  {isKz ? status.textKz : status.textRu}
                </span>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 gap-3">
                <a
                  href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
                    isKz
                      ? 'Сәлеметсіз бе! Маған MUSLIM SHOP өнімдері бойынша кеңес керек еді.'
                      : 'Здравствуйте! Мне нужна консультация по товарам MUSLIM SHOP (Бутик №24).'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base">
                        {isKz ? 'WhatsApp арқылы жазу' : 'Написать в WhatsApp'}
                      </div>
                      <div className="text-xs text-emerald-100">
                        {isKz
                          ? 'Менеджерден жылдам кеңес және тапсырыс'
                          : 'Быстрая консультация и заказ с доставкой'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-200" />
                </a>

                <a
                  href={`tel:+${config.whatsappNumber}`}
                  className="flex items-center justify-between p-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-stone-950/10 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-6 h-6 text-stone-950" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base">
                        {isKz ? 'Бутикке қоңырау шалу' : 'Позвонить в Бутик №24'}
                      </div>
                      <div className="text-xs text-stone-800 font-semibold tabular-nums">
                        +7 778 175 42 41
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-800" />
                </a>

                <a
                  href={config.gis2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 border border-stone-200 shadow-2xs transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base">
                        {isKz ? '2GIS картадан ашу' : 'Открыть маршрут в 2ГИС'}
                      </div>
                      <div className="text-xs text-stone-500">
                        {config.city}, {config.address} • {config.boutiqueNumber}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
