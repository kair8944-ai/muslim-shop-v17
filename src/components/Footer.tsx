import React from 'react';
import { MapPin, Phone, MessageCircle, Clock, Instagram, ShieldCheck } from 'lucide-react';
import { Language, StoreConfig } from '../types';

interface FooterProps {
  config: StoreConfig;
  lang: Language;
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ config, lang }) => {
  return (
    <footer id="main-footer" className="w-full max-w-full overflow-x-hidden bg-slate-100 text-slate-700 pt-10 pb-8 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-7 sm:gap-8 mb-8">
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-sans font-black text-2xl text-[#0567BA] tracking-tight">
                {config.storeName}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-[#ffbd00] text-slate-900">
                {config.boutiqueNumber}
              </span>
            </div>
            <p className="text-slate-800 font-medium text-sm leading-relaxed">
              {lang === 'kz' ? config.taglineKz : config.taglineRu}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {lang === 'kz' ? config.subtitleKz : config.subtitleRu}
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs sm:text-sm text-[#2db972] font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#2db972]" />
              <span>100% Халяль & Сертификаты качества</span>
            </div>
          </div>

          {/* Col 2: Contacts & Address */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 font-sans pb-1 border-b border-slate-200">
              {lang === 'kz' ? 'Мекенжай және байланыс' : 'Адрес и контакты'}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#0567BA] shrink-0 mt-0.5" />
                <span>
                  {config.address} ({config.city}, {config.boutiqueNumber})
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{lang === 'kz' ? config.workingHoursKz : config.workingHoursRu}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0567BA] shrink-0" />
                <a href={`tel:+${config.whatsappNumber}`} className="hover:text-[#0567BA] font-semibold transition-colors">
                  +7 778 175 42 41
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <a
                  href={`https://wa.me/${config.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 text-[#25D366] font-bold transition-colors"
                >
                  WhatsApp: +7 778 175 42 41
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation & 2GIS */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 font-sans pb-1 border-b border-slate-200">
              {lang === 'kz' ? 'Навигация & Карта' : 'Навигация и карты'}
            </h4>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <a
                href={config.gis2Url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-300 transition-colors shadow-xs"
              >
                <MapPin className="w-4 h-4 text-[#0567BA]" />
                <span>{lang === 'kz' ? '2GIS картасынан ашу' : 'Открыть Бутик №24 в 2GIS'}</span>
              </a>

              <div className="pt-1 flex flex-col gap-2">
                {config.instagram && (
                  <a
                    href={`https://instagram.com/${config.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-pink-600 transition-colors"
                  >
                    <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Instagram: @{config.instagram.replace(/^@/, '')}</span>
                  </a>
                )}

                <a
                  id="footer-tiktok-link"
                  href="https://www.tiktok.com/@muslim_shop06?_r=1&_t=ZS-9A4oN3D5OFB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-slate-700 shrink-0 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  <span>TikTok: @muslim_shop06</span>
                </a>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed pt-1">
              {lang === 'kz' ? config.pickupInfoKz : config.pickupInfoRu}
            </p>
          </div>

          {/* Col 4: Delivery in Atyrau & Kazakhstan */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 font-sans pb-1 border-b border-slate-200">
              {lang === 'kz' ? 'Жеткізу шарттары' : 'Доставка и оплата'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {lang === 'kz' ? config.deliveryInfoKz : config.deliveryInfoRu}
            </p>
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-xs">
              <p className="font-bold text-slate-900 mb-0.5">Оплата Kaspi</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                Перевод на Kaspi Gold, Kaspi QR или наличными при получении в Бутике №24.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright (Flip.kz style clean text) */}
        <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {config.storeName} — г. Атырау, Бутик №24 (ТД «Дина Байзар»). Все права защищены.</p>
          <p className="text-slate-400">Халяль продукция • Доставка по всему Казахстану</p>
        </div>
      </div>
    </footer>
  );
};
