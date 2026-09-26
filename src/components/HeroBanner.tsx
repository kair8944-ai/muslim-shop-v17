import React from 'react';
import {
  Sparkles,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
  Award,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Category, Language, StoreConfig } from '../types';

interface HeroBannerProps {
  config: StoreConfig;
  lang: Language;
  onScrollToCatalog: () => void;
  categories?: Category[];
  selectedCategoryId?: string;
  onSelectCategory?: (id: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  config,
  lang,
  onScrollToCatalog,
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const isKz = lang === 'kz';

  // Resolved title & subtitle with fallbacks to the new required copy
  const titleRu =
    config.taglineRu && config.taglineRu !== 'Красота. Здоровье. Вера.'
      ? config.taglineRu
      : 'Красота, здоровье и халяль-товары в Атырау';
  const titleKz =
    config.taglineKz && config.taglineKz !== 'Сұлулық. Денсаулық. Сенім.'
      ? config.taglineKz
      : 'Атыраудағы сұлулық, денсаулық және халал өнімдер';

  const subtitleRu =
    config.subtitleRu && !config.subtitleRu.includes('Премиальные товары для здоровья, красоты и повседневной')
      ? config.subtitleRu
      : 'Витамины iHerb, БАДы, товары для мужского и женского здоровья, мед, хиджама и мусульманские ароматы.';
  const subtitleKz =
    config.subtitleKz && !config.subtitleKz.includes('Атыраудағы денсаулық, сұлулық және күнделікті')
      ? config.subtitleKz
      : 'iHerb дәрумендері, ББҚ, ерлер мен әйелдер денсаулығына арналған өнімдер, бал, хиджама және мұсылман хош иістері.';

  // Categories to show in quick chips (excluding "Все товары")
  const activeChips =
    categories && categories.length > 0
      ? categories.filter((c) => c.id !== 'cat-all')
      : [
          { id: 'cat-iherb', nameRu: 'Витамины iHerb', nameKz: 'iHerb Витаминдер', icon: '💊' },
          { id: 'cat-health', nameRu: 'БАДы & Омега-3', nameKz: 'ББҚ & Омега-3', icon: '🌿' },
          { id: 'cat-men', nameRu: 'Мужское здоровье', nameKz: 'Ерлер денсаулығы', icon: '💪' },
          { id: 'cat-women', nameRu: 'Женское здоровье', nameKz: 'Әйелдер денсаулығы', icon: '🌸' },
          { id: 'cat-honey', nameRu: 'Натуральный мед', nameKz: 'Табиғи бал', icon: '🍯' },
          { id: 'cat-hijama', nameRu: 'Хиджама', nameKz: 'Хиджама', icon: '🩸' },
          { id: 'cat-muslim', nameRu: 'Мусульманские ароматы', nameKz: 'Мұсылман хош иістері', icon: '🕌' },
        ];

  return (
    <div
      id="hero-section"
      className="relative w-full max-w-full overflow-hidden bg-radial-[at_50%_-20%] from-emerald-900 via-[#051F17] to-[#03140F] text-white border-b border-amber-500/25"
    >
      {/* Decorative ambient gold lighting aura */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle Islamic pattern background effect */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#d4af37 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 relative z-10 w-full overflow-hidden">
        <div className="max-w-3xl">
          {/* Boutique Tag */}
          <div
            id="hero-boutique-badge"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold tracking-wide mb-4 sm:mb-5 backdrop-blur-md shadow-xs flex-wrap max-w-full"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="font-serif tracking-wider font-bold">MUSLIM SHOP</span>
            <span className="text-amber-400/40">•</span>
            <span>{config.city}</span>
            <span className="text-amber-400/40">•</span>
            <span className="text-amber-200 font-medium">{config.boutiqueNumber}</span>
          </div>

          {/* Heading */}
          <h1
            id="hero-main-title"
            className="font-serif text-2xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.2] sm:leading-[1.18] mb-4 sm:mb-5 drop-shadow-sm text-balance"
          >
            {isKz ? (
              <>
                <span className="block">Атыраудағы сұлулық, денсаулық</span>
                <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 font-serif">
                  және халал өнімдер
                </span>
              </>
            ) : (
              <>
                <span className="block">Красота, здоровье</span>
                <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 font-serif">
                  и халяль-товары в Атырау
                </span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p
            id="hero-subtitle"
            className="text-emerald-100/90 text-sm sm:text-xl font-normal leading-relaxed mb-6 max-w-2xl text-balance"
          >
            {isKz ? subtitleKz : subtitleRu}
          </p>

          {/* Quick Category Visual Chips (Наглядные акценты каталогов) */}
          <div
            id="hero-quick-chips"
            className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mb-6 sm:mb-8"
          >
            {activeChips.map((chip) => {
              const isSelected = selectedCategoryId === chip.id;
              const chipName = isKz && chip.nameKz ? chip.nameKz : chip.nameRu;

              return (
                <button
                  key={chip.id}
                  id={`hero-chip-${chip.id}`}
                  type="button"
                  onClick={() => {
                    if (onSelectCategory) {
                      onSelectCategory(chip.id);
                    }
                    onScrollToCatalog();
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none active:scale-97 ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 font-bold shadow-md shadow-amber-500/25 ring-2 ring-amber-300'
                      : 'bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/40 hover:border-amber-400/50 text-emerald-200 hover:text-white backdrop-blur-xs'
                  }`}
                >
                  <span className="text-sm">{chip.icon || '✨'}</span>
                  <span>{chipName}</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div id="hero-actions" className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            <button
              id="hero-view-catalog-btn"
              onClick={onScrollToCatalog}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-stone-950 font-bold text-xs sm:text-base shadow-xl shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
            >
              <span>{isKz ? 'Каталогты қарау' : 'Перейти в каталог'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              id="hero-whatsapp-btn"
              href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
                isKz
                  ? 'Сәлеметсіз бе! Дәрумендер мен халал өнімдер бойынша кеңес алғым келеді.'
                  : 'Здравствуйте! Хочу проконсультироваться по витаминам и продукции бутика.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-emerald-800/70 hover:bg-emerald-700/80 text-white font-medium text-xs sm:text-base border border-emerald-500/40 transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isKz ? 'WhatsApp кеңес' : 'WhatsApp заказ / Консультация'}</span>
            </a>

            <a
              id="hero-gis-btn"
              href={config.gis2Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 hover:text-white font-medium text-xs sm:text-base border border-emerald-700/40 transition-colors"
            >
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{isKz ? '2GIS Бутик №24' : 'Бутик №24 в 2GIS'}</span>
            </a>
          </div>
        </div>

        {/* 4 Trust Feature Blocks */}
        <div
          id="hero-features-grid"
          className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-emerald-800/60 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4"
        >
          <div
            id="feature-halal"
            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-amber-400/15 backdrop-blur-xs min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">100% Халяль</h3>
              <p className="text-[10px] sm:text-xs text-emerald-200/80 mt-0.5 line-clamp-2">
                {isKz ? 'Тексерілген табиғи құрамдар' : 'Проверенные чистые составы'}
              </p>
            </div>
          </div>

          <div
            id="feature-direct"
            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-amber-400/15 backdrop-blur-xs min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {isKz ? 'iHerb импорт' : 'iHerb & Импорт'}
              </h3>
              <p className="text-[10px] sm:text-xs text-emerald-200/80 mt-0.5 line-clamp-2">
                {isKz ? 'АҚШ, Дубай, Мекке, Египет' : 'Оригинал из США, ОАЭ, Мекки'}
              </p>
            </div>
          </div>

          <div
            id="feature-delivery"
            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-amber-400/15 backdrop-blur-xs min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {isKz ? 'Жылдам жеткізу' : 'Быстрая доставка'}
              </h3>
              <p className="text-[10px] sm:text-xs text-emerald-200/80 mt-0.5 line-clamp-2">
                {isKz ? 'Күні бойы курьермен' : 'В день заказа по городу и РК'}
              </p>
            </div>
          </div>

          <div
            id="feature-boutique"
            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-xs min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {config.boutiqueNumber} • {config.city}
              </h3>
              <p className="text-[10px] sm:text-xs text-emerald-200/80 mt-0.5 line-clamp-2">
                {isKz ? config.workingHoursKz : config.workingHoursRu}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

