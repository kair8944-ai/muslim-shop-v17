import React, { useState } from 'react';
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
  const [catFilter, setCatFilter] = useState('');
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

  const filteredCategories = categories.filter((cat) => {
    if (!catFilter.trim()) return true;
    const name = `${cat.nameRu} ${cat.nameKz || ''}`.toLowerCase();
    return name.includes(catFilter.toLowerCase());
  });

  return (
    <div
      id="bottom-sheet-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="bottom-sheet-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white text-slate-800 rounded-t-3xl border-t border-slate-200 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden mb-16 sm:mb-[68px]"
      >
        {/* Flip.kz Signature Deep Blue Header */}
        <div className="bg-[#0567BA] text-white px-4 sm:px-5 pt-3 pb-3.5 border-b border-[#045294] shrink-0">
          <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto mb-2.5" />
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
                title={isKz ? 'Артқа' : 'Назад'}
              >
                <ArrowLeft className="w-4 h-4 text-white shrink-0" />
                <span>{isKz ? 'Артқа' : 'Назад'}</span>
              </button>

              <div className="min-w-0">
                <h3 className="font-sans font-black text-base sm:text-lg text-white leading-tight truncate">
                  {mode === 'catalog'
                    ? isKz
                      ? 'Тауарлар каталогы'
                      : 'Каталог товаров Flip.kz'
                    : isKz
                    ? 'Байланыс және мекенжай'
                    : 'Связь с Бутиком №24'}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5 truncate">
                  {mode === 'catalog'
                    ? isKz
                      ? 'Қажетті бөлімді таңдаңыз немесе іздеңіз'
                      : 'Выберите нужный раздел или введите название'
                    : `${config.city}, ${config.address} • ${config.boutiqueNumber}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
              title={isKz ? 'Жабу' : 'Закрыть'}
            >
              <X className="w-4 h-4 text-white" />
              <span>{isKz ? 'Жабу' : 'Закрыть'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body (Clean Flip.kz Light Marketplace Styling) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#f8fafc]">
          {mode === 'catalog' ? (
            <>
              {/* Quick Search inside Catalog with clear padding */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  placeholder={
                    isKz
                      ? 'Бөлімдер бойынша іздеу (витаминдер, коллаген...)'
                      : 'Быстрый поиск раздела (витамины, коллаген, тмин...)'
                  }
                  className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0567BA]/30 focus:border-[#0567BA] transition-all shadow-xs"
                />
                {catFilter && (
                  <button
                    type="button"
                    onClick={() => setCatFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Special Quick Filters: Hits & New */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePickCategory('cat-hits')}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCategoryId === 'cat-hits'
                      ? 'bg-[#ffbd00] text-slate-950 border-[#e5aa00] font-black shadow-xs'
                      : 'bg-white hover:bg-amber-50/50 text-slate-900 border-amber-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 fill-amber-500 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold truncate">
                        {isKz ? 'Хит тауарлар' : 'Хиты продаж'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {productCounts['cat-hits'] || 0} {isKz ? 'өнім' : 'товаров'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handlePickCategory('cat-new')}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedCategoryId === 'cat-new'
                      ? 'bg-[#0567BA] text-white border-[#0567BA] font-black shadow-xs'
                      : 'bg-white hover:bg-blue-50/50 text-slate-900 border-blue-200/80 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#0567BA] flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-[#0567BA]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold truncate">
                        {isKz ? 'Жаңа өнімдер' : 'Новинки'}
                      </div>
                      <div className={`text-[11px] ${selectedCategoryId === 'cat-new' ? 'text-blue-100' : 'text-slate-500'}`}>
                        {productCounts['cat-new'] || 0} {isKz ? 'өнім' : 'товаров'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${selectedCategoryId === 'cat-new' ? 'text-white' : 'text-slate-400'} shrink-0`} />
                </button>
              </div>

              {/* All Store Categories Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 px-1 flex items-center justify-between uppercase tracking-wider">
                  <span>{isKz ? 'Барлық санаттар' : 'Все разделы магазина'}</span>
                  <span className="tabular-nums font-mono text-[11px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full">
                    {filteredCategories.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const count = productCounts[cat.id] ?? 0;
                    const catName = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handlePickCategory(cat.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0567BA] text-white border-[#0567BA] shadow-sm font-bold'
                            : 'bg-white hover:bg-blue-50/40 hover:border-[#0567BA]/40 text-slate-800 border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {cat.icon || '✨'}
                          </span>
                          <div className="min-w-0">
                            <p
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isSelected ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {catName}
                            </p>
                            <p
                              className={`text-[11px] tabular-nums ${
                                isSelected ? 'text-blue-100' : 'text-slate-500'
                              }`}
                            >
                              {count} {isKz ? 'өнім' : 'товаров'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          )}
                          <ChevronRight
                            className={`w-4 h-4 ${
                              isSelected ? 'text-white' : 'text-slate-400'
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
              <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-[#0567BA] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {isKz ? config.workingHoursKz : config.workingHoursRu}
                    </div>
                    <div className="text-xs text-slate-500">
                      {config.city}, {config.address} ({config.boutiqueNumber})
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                    status.isOpen
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {isKz ? status.textKz : status.textRu}
                </span>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                <a
                  href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
                    isKz
                      ? 'Сәлеметсіз бе! Маған MUSLIM SHOP өнімдері бойынша кеңес керек еді.'
                      : 'Здравствуйте! Мне нужна консультация по товарам MUSLIM SHOP (Бутик №24).'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
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
                  <ChevronRight className="w-5 h-5 text-white/80" />
                </a>

                <a
                  href={`tel:+${config.whatsappNumber}`}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#0567BA] hover:bg-[#045294] text-white shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base">
                        {isKz ? 'Бутикке қоңырау шалу' : 'Позвонить в Бутик №24'}
                      </div>
                      <div className="text-xs text-blue-100 font-bold tabular-nums">
                        +7 778 175 42 41
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80" />
                </a>

                <a
                  href={config.gis2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-[#0567BA] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm sm:text-base text-slate-900">
                        {isKz ? '2GIS картадан ашу' : 'Открыть маршрут в 2ГИС'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {config.city}, {config.address} • {config.boutiqueNumber}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="p-3 sm:px-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{isKz ? 'Артқа' : 'Назад'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{isKz ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
