import React from 'react';
import { MapPin, Phone, MessageCircle, Clock, Instagram, ShieldCheck, Lock } from 'lucide-react';
import { Language, StoreConfig } from '../types';

interface FooterProps {
  config: StoreConfig;
  lang: Language;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ config, lang, onOpenAdmin }) => {
  return (
    <footer id="main-footer" className="bg-emerald-950 text-stone-300 pt-12 pb-8 border-t border-amber-500/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-serif font-extrabold text-2xl text-white tracking-wider">
                {config.storeName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-stone-950">
                {config.boutiqueNumber}
              </span>
            </div>
            <p className="text-amber-300 font-serif italic text-sm">
              {lang === 'kz' ? config.taglineKz : config.taglineRu}
            </p>
            <p className="text-xs text-stone-400 leading-relaxed">
              {lang === 'kz' ? config.subtitleKz : config.subtitleRu}
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>100% Халяль & Сертифицированная продукция</span>
            </div>
          </div>

          {/* Col 2: Contacts & Address */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 font-serif">
              {lang === 'kz' ? 'Мекенжай және байланыс' : 'Адрес и контакты'}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {config.address} ({config.city}, {config.boutiqueNumber})
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{lang === 'kz' ? config.workingHoursKz : config.workingHoursRu}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`tel:+${config.whatsappNumber}`} className="hover:text-white transition-colors">
                  +7 778 175 42 41
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${config.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white text-emerald-300 transition-colors"
                >
                  WhatsApp: +7 778 175 42 41
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation & 2GIS */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 font-serif">
              {lang === 'kz' ? 'Навигация & Карта' : 'Навигация и карты'}
            </h4>
            <div className="space-y-2 text-xs">
              <a
                href={config.gis2Url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 font-medium border border-emerald-700 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>{lang === 'kz' ? '2GIS картасынан ашу' : 'Открыть точку в 2GIS'}</span>
              </a>

              {config.instagram && (
                <div className="pt-2">
                  <a
                    href={`https://instagram.com/${config.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-pink-400 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>@{config.instagram}</span>
                  </a>
                </div>
              )}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed pt-1">
              {lang === 'kz' ? config.pickupInfoKz : config.pickupInfoRu}
            </p>
          </div>

          {/* Col 4: Delivery in Atyrau & Kazakhstan */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 font-serif">
              {lang === 'kz' ? 'Жеткізу шарттары' : 'Доставка и оплата'}
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              {lang === 'kz' ? config.deliveryInfoKz : config.deliveryInfoRu}
            </p>
            <div className="p-3 rounded-xl bg-emerald-900/50 border border-emerald-800/80 text-xs text-emerald-200">
              <p className="font-bold text-amber-300 mb-1">Оплата Kaspi</p>
              <p className="text-[11px] text-stone-300">
                Перевод на Kaspi Gold, Kaspi QR или наличными при получении в Бутике №24.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Admin link */}
        <div className="pt-6 border-t border-emerald-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {config.storeName} — г. Атырау, Бутик №24. Все права защищены.</p>

          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 text-stone-500 hover:text-amber-400 transition-colors cursor-pointer"
            title="Вход для владельца бутика"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Панель управления (Бутик №24)</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
