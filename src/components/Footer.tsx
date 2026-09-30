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
    <footer id="main-footer" className="w-full max-w-full overflow-x-hidden bg-[#030D0A] text-stone-200 pt-14 pb-10 border-t border-amber-500/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 mb-10">
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="font-serif font-extrabold text-2xl sm:text-3xl text-white tracking-wider">
                {config.storeName}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-amber-400 text-stone-950">
                {config.boutiqueNumber}
              </span>
            </div>
            <p className="text-amber-300 font-serif italic text-base sm:text-lg leading-relaxed">
              {lang === 'kz' ? config.taglineKz : config.taglineRu}
            </p>
            <p className="text-sm text-stone-300 leading-relaxed">
              {lang === 'kz' ? config.subtitleKz : config.subtitleRu}
            </p>
            <div className="pt-2 flex items-center gap-2 text-sm text-emerald-300 font-medium">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <span>100% Халяль & Сертифицированная продукция</span>
            </div>
          </div>

          {/* Col 2: Contacts & Address */}
          <div className="space-y-3.5">
            <h4 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-amber-400 font-serif pb-1 border-b border-amber-500/20">
              {lang === 'kz' ? 'Мекенжай және байланыс' : 'Адрес и контакты'}
            </h4>
            <ul className="space-y-3 text-sm leading-relaxed">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <span>
                  {config.address} ({config.city}, {config.boutiqueNumber})
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{lang === 'kz' ? config.workingHoursKz : config.workingHoursRu}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`tel:+${config.whatsappNumber}`} className="hover:text-amber-300 font-semibold transition-colors">
                  +7 778 175 42 41
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${config.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white text-emerald-300 font-semibold transition-colors"
                >
                  WhatsApp: +7 778 175 42 41
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation & 2GIS */}
          <div className="space-y-3.5">
            <h4 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-amber-400 font-serif pb-1 border-b border-amber-500/20">
              {lang === 'kz' ? 'Навигация & Карта' : 'Навигация и карты'}
            </h4>
            <div className="space-y-3 text-sm">
              <a
                href={config.gis2Url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B241B] hover:bg-[#113528] text-amber-300 font-bold border border-amber-500/30 transition-colors"
              >
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>{lang === 'kz' ? '2GIS картасынан ашу' : 'Открыть точку в 2GIS'}</span>
              </a>

              <div className="pt-2 flex flex-col gap-2.5">
                {config.instagram && (
                  <a
                    href={`https://instagram.com/${config.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-stone-200 hover:text-pink-400 transition-colors"
                  >
                    <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>Instagram: @{config.instagram.replace(/^@/, '')}</span>
                  </a>
                )}

                <a
                  id="footer-tiktok-link"
                  href="https://www.tiktok.com/@muslim_shop06?_r=1&_t=ZS-9A4oN3D5OFB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-stone-200 hover:text-amber-300 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-amber-400 shrink-0 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  <span>TikTok: @muslim_shop06</span>
                </a>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-1">
              {lang === 'kz' ? config.pickupInfoKz : config.pickupInfoRu}
            </p>
          </div>

          {/* Col 4: Delivery in Atyrau & Kazakhstan */}
          <div className="space-y-3.5">
            <h4 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-amber-400 font-serif pb-1 border-b border-amber-500/20">
              {lang === 'kz' ? 'Жеткізу шарттары' : 'Доставка и оплата'}
            </h4>
            <p className="text-sm text-stone-300 leading-relaxed">
              {lang === 'kz' ? config.deliveryInfoKz : config.deliveryInfoRu}
            </p>
            <div className="p-3.5 rounded-2xl bg-[#0B2219] border border-amber-500/25 text-sm text-emerald-100 leading-relaxed">
              <p className="font-extrabold text-amber-300 mb-1">Оплата Kaspi</p>
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                Перевод на Kaspi Gold, Kaspi QR или наличными при получении в Бутике №24.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-6 border-t border-amber-500/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-stone-400">
          <p>© {new Date().getFullYear()} {config.storeName} — г. Атырау, Бутик №24. Все права защищены.</p>
          <p className="text-xs sm:text-sm text-emerald-300/70">Халяль продукция • Доставка по всему Казахстану</p>
        </div>
      </div>
    </footer>
  );
};
