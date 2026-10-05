import React from 'react';
import {
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
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
}) => {
  const isKz = lang === 'kz';

  const whatsappConsultationUrl = `https://wa.me/${config.whatsappNumber || '77781754241'}?text=${encodeURIComponent(
    isKz ? 'Сәлеметсіз бе! Өнімдер бойынша кеңес алғым келеді' : 'Здравствуйте! Хочу получить консультацию по товарам в Muslim Shop'
  )}`;

  return (
    <div
      id="hero-section"
      className="relative w-full bg-slate-900 text-white border-b border-slate-800 py-8 sm:py-14 overflow-hidden"
    >
      {/* Subtle luxury bronze glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl space-y-4 sm:space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs sm:text-sm font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
            <span className="font-extrabold text-[#C5A059]">MUSLIM SHOP</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">г. Атырау, Рынок Дина, Бутик №24</span>
          </div>

          {/* Heading */}
          <h1
            id="hero-main-title"
            className="font-sans text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight"
          >
            {isKz ? (
              <>
                <span>Атыраудағы сұлулық, денсаулық </span>
                <span className="text-[#C5A059]">және халал өнімдер</span>
              </>
            ) : (
              <>
                <span>Оригинальные витамины, БАДы </span>
                <span className="text-[#C5A059]">и халяль-товары в Атырау</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            {isKz
              ? 'iHerb дәрумендері, ББҚ, ерлер мен әйелдер денсаулығына арналған өнімдер, бал, хиджама және мұсылман хош иістері. Атырау қаласы бойынша жылдам жеткізу.'
              : 'Витамины iHerb, БАДы, омега-3, коллаген, мужское и женское здоровье, мед, хиджама и натуральная косметика. Все товары в наличии в Бутике №24.'}
          </p>

          {/* CTAs: Large, comfortable for mobile */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onScrollToCatalog}
              className="h-12 sm:h-13 px-6 sm:px-8 rounded-xl bg-[#C5A059] hover:bg-[#B38F48] text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <span>{isKz ? 'Каталогты көру' : 'Перейти к покупкам'}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <a
              href={whatsappConsultationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 sm:h-13 px-5 sm:px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 text-emerald-400" />
              <span>{isKz ? 'WhatsApp кеңес' : 'Консультация в WhatsApp'}</span>
            </a>
          </div>

          {/* Quick facts row */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>100% Түпнұсқа сапа</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>Жеткізу: Атырау & ҚР</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
              <span>Дина базары, Бутик 24</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
