import React from 'react';
import { Sparkles, MapPin, MessageCircle, ShieldCheck, Truck, Award, CheckCircle2 } from 'lucide-react';
import { Language, StoreConfig } from '../types';

interface HeroBannerProps {
  config: StoreConfig;
  lang: Language;
  onScrollToCatalog: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ config, lang, onScrollToCatalog }) => {
  return (
    <div id="hero-section" className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white border-b border-amber-500/20">
      {/* Subtle Islamic pattern background effect */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#d4af37 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 relative z-10">
        <div className="max-w-3xl">
          {/* Boutique Tag */}
          <div
            id="hero-boutique-badge"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold tracking-wide mb-4 backdrop-blur-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{config.city} • {config.boutiqueNumber}</span>
            <span className="text-amber-400/50">•</span>
            <span className="text-amber-200">пр. Султана Бейбарыса, 45а/5</span>
          </div>

          {/* Heading */}
          <h1
            id="hero-main-title"
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4"
          >
            {config.storeName}
            <span className="block text-amber-300 text-2xl sm:text-3xl lg:text-4xl font-normal italic mt-1 font-serif">
              {lang === 'kz' ? config.taglineKz : config.taglineRu}
            </span>
          </h1>

          {/* Subtitle */}
          <p
            id="hero-subtitle"
            className="text-emerald-100/90 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl font-light"
          >
            {lang === 'kz' ? config.subtitleKz : config.subtitleRu}
          </p>

          {/* Action Buttons */}
          <div id="hero-actions" className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              id="hero-view-catalog-btn"
              onClick={onScrollToCatalog}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all cursor-pointer"
            >
              {lang === 'kz' ? 'Каталогты қарау' : 'Перейти в каталог'}
            </button>

            <a
              id="hero-gis-btn"
              href={config.gis2Url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/80 text-white font-medium text-sm sm:text-base border border-emerald-600/50 transition-colors shadow-xs"
            >
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>{lang === 'kz' ? '2GIS Маршрут' : 'Открыть в 2GIS'}</span>
            </a>

            <a
              id="hero-whatsapp-btn"
              href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
                lang === 'kz'
                  ? 'Сәлеметсіз бе! Бутик №24 бойынша сұрағым бар еді.'
                  : 'Здравствуйте! У меня есть вопрос по ассортименту Бутика №24.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 hover:text-white font-medium text-sm sm:text-base border border-emerald-500/40 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* 4 Trust Feature Blocks */}
        <div id="hero-features-grid" className="mt-10 pt-8 border-t border-emerald-800/50 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div id="feature-halal" className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">100% Халяль</h3>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5">
                {lang === 'kz' ? 'Тексерілген табиғи өнімдер' : 'Проверенные чистые составы'}
              </p>
            </div>
          </div>

          <div id="feature-delivery" className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {lang === 'kz' ? 'Атырауда жылдам жеткізу' : 'Доставка в день заказа'}
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5">
                {lang === 'kz' ? 'Курьер арқылы есікке дейін' : 'Курьером по Атырау и РК'}
              </p>
            </div>
          </div>

          <div id="feature-direct" className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {lang === 'kz' ? 'Тікелей жеткізілім' : 'Прямой импорт'}
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5">
                {lang === 'kz' ? 'Мекке, Дубай, АҚШ (iHerb)' : 'Мекка, ОАЭ, США, Египет'}
              </p>
            </div>
          </div>

          <div id="feature-boutique" className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {lang === 'kz' ? 'Бутик №24 Атырау' : 'Бутик №24 в Атырау'}
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 mt-0.5">
                {lang === 'kz' ? 'Күн сайын 10:00 - 21:00' : 'Ежедневно с 10:00 до 21:00'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
