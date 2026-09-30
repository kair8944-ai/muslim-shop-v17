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
  ArrowLeft,
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="bottom-sheet-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#051611] text-stone-100 rounded-t-3xl border-t-2 border-amber-400/60 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden mb-16 sm:mb-[68px]"
      >
        {/* Drag Handle & Header */}
        <div className="bg-[#030D0A] text-white px-4 sm:px-5 pt-3 pb-4 border-b border-amber-500/25 shrink-0">
          <div className="w-12 h-1.5 bg-amber-400/40 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 font-extrabold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
                title={isKz ? 'Артқа' : 'Назад'}
              >
                <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{isKz ? 'Артқа' : 'Назад'}</span>
              </button>

              <div className="min-w-0">
                <h3 className="font-serif font-extrabold text-base sm:text-xl text-white leading-tight truncate">
                  {mode === 'catalog'
                    ? isKz
                      ? 'Тауарлар каталогы'
                      : 'Каталог товаров'
                    : isKz
                    ? 'Байланыс және мекенжай'
                    : 'Связь с Бутиком №24'}
                </h3>
                <p className="text-xs text-emerald-200/80 mt-0.5 truncate">
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
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0B241B] hover:bg-rose-700 text-stone-100 hover:text-white border border-amber-500/25 font-extrabold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
              title={isKz ? 'Жабу' : 'Закрыть'}
            >
              <X className="w-4 h-4 text-amber-300" />
              <span>{isKz ? 'Жабу' : 'Закрыть'}</span>
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
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedCategoryId === 'cat-hits'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-300 font-extrabold shadow-md'
                      : 'bg-[#092018] hover:bg-[#0F2F23] text-stone-100 border-amber-500/25'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">
                        {isKz ? 'Хит тауарлар' : 'Хиты продаж'}
                      </div>
                      <div
                        className={`text-xs ${
                          selectedCategoryId === 'cat-hits' ? 'text-stone-900' : 'text-emerald-200/75'
                        }`}
                      >
                        {productCounts['cat-hits'] || 0} {isKz ? 'өнім' : 'товаров'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePickCategory('cat-new')}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedCategoryId === 'cat-new'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-300 font-extrabold shadow-md'
                      : 'bg-[#092018] hover:bg-[#0F2F23] text-stone-100 border-amber-500/25'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate">
                        {isKz ? 'Жаңа өнімдер' : 'Новинки'}
                      </div>
                      <div
                        className={`text-xs ${
                          selectedCategoryId === 'cat-new' ? 'text-stone-900' : 'text-emerald-200/75'
                        }`}
                      >
                        {productCounts['cat-new'] || 0} {isKz ? 'өнім' : 'товаров'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
                </button>
              </div>

              {/* All Store Categories Grid */}
              <div className="space-y-2.5">
                <div className="text-xs sm:text-sm font-bold text-amber-300 px-1 flex items-center justify-between">
                  <span>{isKz ? 'Барлық санаттар' : 'Все разделы магазина'}</span>
                  <span className="tabular-nums">{categories.length}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const count = productCounts[cat.id] ?? 0;
                    const catName = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handlePickCategory(cat.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-300 shadow-md'
                            : 'bg-[#092018] hover:bg-[#0F2F23] text-stone-100 border-amber-500/20 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                              isSelected ? 'bg-stone-950/15' : 'bg-[#061510] border border-amber-500/20'
                            }`}
                          >
                            {cat.icon || '✨'}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`text-sm sm:text-base font-bold truncate ${
                                isSelected ? 'text-stone-950 font-extrabold' : 'text-white'
                              }`}
                            >
                              {catName}
                            </p>
                            <p
                              className={`text-xs tabular-nums ${
                                isSelected ? 'text-stone-900 font-semibold' : 'text-emerald-200/75'
                              }`}
                            >
                              {count} {isKz ? 'өнім қолда бар' : 'позиций'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-stone-950" />
                          )}
                          <ChevronRight
                            className={`w-4 h-4 ${
                              isSelected ? 'text-stone-950' : 'text-amber-400'
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
              <div className="p-4 rounded-2xl bg-[#092018] border border-amber-500/25 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold text-white">
                      {isKz ? config.workingHoursKz : config.workingHoursRu}
                    </div>
                    <div className="text-xs text-emerald-200/80">
                      {config.city}, {config.address} ({config.boutiqueNumber})
                    </div>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                    status.isOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
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
                  className="flex items-center justify-between p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-md transition-all"
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
                  className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 shadow-md transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-stone-950/10 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-6 h-6 text-stone-950" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base">
                        {isKz ? 'Бутикке қоңырау шалу' : 'Позвонить в Бутик №24'}
                      </div>
                      <div className="text-xs text-stone-900 font-bold tabular-nums">
                        +7 778 175 42 41
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-900" />
                </a>

                <a
                  href={config.gis2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-2xl bg-[#092018] hover:bg-[#0F2F23] text-white border border-amber-500/25 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base">
                        {isKz ? '2GIS картадан ашу' : 'Открыть маршрут в 2ГИС'}
                      </div>
                      <div className="text-xs text-emerald-200/80">
                        {config.city}, {config.address} • {config.boutiqueNumber}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Back & Close Bar */}
        <div className="p-3.5 sm:px-5 bg-[#030D0A] border-t border-amber-500/25 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B241B] hover:bg-[#113628] text-amber-300 border border-amber-500/30 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isKz ? 'Артқа оралу' : 'Назад'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B241B] hover:bg-rose-800/80 text-stone-100 hover:text-white border border-amber-500/30 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{isKz ? 'Терезені жабу' : 'Закрыть окно'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
