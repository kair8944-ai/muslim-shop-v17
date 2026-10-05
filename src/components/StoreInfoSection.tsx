import React from 'react';
import {
  MapPin,
  Phone,
  Clock,
  Truck,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { Language, StoreConfig } from '../types';

interface StoreInfoSectionProps {
  config: StoreConfig;
  lang: Language;
}

export const StoreInfoSection: React.FC<StoreInfoSectionProps> = ({ config, lang }) => {
  const isKz = lang === 'kz';

  const instagramUrl = 'https://www.instagram.com/musliim_shop06?stkn=dnAzejJ2cm5nOXNi';
  const tiktokUrl = 'https://www.tiktok.com/@muslim_shop06?_r=1&_t=ZS-9AFgdLAOcZ2';
  const telegramUrl = 'https://t.me/muslim_shop06';
  const whatsappUrl = `https://wa.me/${config.whatsappNumber || '77781754241'}?text=${encodeURIComponent(
    isKz ? 'Сәлеметсіз бе! Muslim Shop дүкенінен өнімдер бойынша ақпарат алғым келеді' : 'Здравствуйте! Хочу узнать подробнее о товарах в Muslim Shop'
  )}`;

  return (
    <section id="store-info-section" className="w-full bg-white border-t border-slate-200 py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-14">
        {/* 1. Блок преимуществ и гарантий */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-[#C5A059] flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                {isKz ? '100% Түпнұсқа өнімдер' : '100% Оригинальная продукция'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                {isKz
                  ? 'Барлық витаминдер мен халал-өнімдер тікелей сенімді өндірушілерден алынады.'
                  : 'Прямые поставки витаминов iHerb, натурального меда, масел и восточных ароматов.'}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-[#C5A059] flex items-center justify-center shrink-0 shadow-xs">
              <Truck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                {isKz ? 'Атырау бойынша жылдам жеткізу' : 'Быстрая доставка по Атырау'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                {isKz
                  ? 'Тапсырыс берілген күні курьер арқылы. Қазақстан бойынша СДЭК және Қазпошта.'
                  : 'Доставка курьером в день заказа. Доставка по Казахстану через СДЭК / Казпочту.'}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-[#C5A059] flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                {isKz ? 'Бутик №24 (Дина базары)' : 'Бутик №24 (Рынок Дина)'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                {isKz
                  ? 'Атырау қаласы, Дина базары, «Дина Байзар» СО. Келіп таңдауға болады.'
                  : 'г. Атырау, ТД «Дина Байзар», бутик №24. Все товары в наличии на витрине.'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Блок «МЫ В СОЦИАЛЬНЫХ СЕТЯХ» */}
        <div id="social-networks-block" className="rounded-3xl bg-slate-900 text-white p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-[#C5A059]">
                  {isKz ? 'Ресми аккаунттар' : 'Официальные каналы'}
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-white mt-1">
                  {isKz ? 'Біз әлеуметтік желілерде' : 'Мы в социальных сетях'}
                </h2>
                <p className="text-xs sm:text-base text-slate-400 mt-1.5 max-w-xl leading-relaxed">
                  {isKz
                    ? 'Жаңа түсімдерді, шолуларды, пайдалы кеңестерді және акцияларды біздің парақшалардан қараңыз'
                    : 'Следите за новыми поступлениями, видеообзорами товаров, акциями и отзывами'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">MUSLIM SHOP Атырау</span>
              </div>
            </div>

            {/* Карточки соцсетей */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Instagram */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#C5A059] transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white group-hover:text-[#C5A059] transition-colors">
                      Instagram
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      @musliim_shop06
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </a>

              {/* TikTok */}
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#C5A059] transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-black border border-slate-700 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.37a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 1 0 6.34 6.34V9.06a8.16 8.16 0 0 0 4.77 1.52v-3.45a4.85 4.85 0 0 1-1-.44z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white group-hover:text-[#C5A059] transition-colors">
                      TikTok
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      @muslim_shop06
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#C5A059] transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <MessageCircle className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white group-hover:text-[#C5A059] transition-colors">
                      WhatsApp
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      +7 778 175 42 41
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </a>

              {/* Telegram */}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-[#C5A059] transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white group-hover:text-[#C5A059] transition-colors">
                      Telegram
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      @muslim_shop06
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>
        </div>

        {/* 3. Блок контактов магазина и карта */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200">
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs font-bold text-[#C5A059] uppercase tracking-wider">
              {isKz ? 'Біздің мекенжайымыз' : 'Контакты и график работы'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              MUSLIM SHOP • Атырау, Бутик №24
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isKz
                ? 'Дина базары, «Дина Байзар» сауда үйі, №24 бутик. Күн сайын 10:00-ден 19:00-ге дейін қызмет көрсетеміз. Сатып алу алдында тауарларды қарап, кеңес алуға болады.'
                : 'г. Атырау, Рынок Дина, ТД «Дина Байзар», Бутик №24. Работаем ежедневно с 10:00 до 19:00. Выдача онлайн-заказов и консультации по всем товарам.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-sm text-slate-800">
              <div className="flex items-center gap-2.5 font-medium">
                <Clock className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>{isKz ? 'Күн сайын: 10:00 – 19:00' : 'Ежедневно: 10:00 – 19:00'}</span>
              </div>
              <div className="flex items-center gap-2.5 font-medium">
                <Phone className="w-4 h-4 text-[#C5A059] shrink-0" />
                <a href="tel:+77781754241" className="hover:text-[#C5A059] transition-colors font-bold">
                  +7 778 175 42 41
                </a>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#C5A059]" />
                <span>{isKz ? 'WhatsApp арқылы жазу' : 'Написать в WhatsApp'}</span>
              </a>

              {config.gis2Url && (
                <a
                  href={config.gis2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#C5A059]" />
                  <span>2GIS картадан ашу</span>
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#C5A059] border border-amber-200/60 flex items-center justify-center mx-auto shadow-2xs">
              <Award className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-base sm:text-lg text-slate-900">
              {isKz ? 'Сенімді сапа кепілдігі' : 'Гарантия качества и доверия'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isKz
                ? 'Атырау тұрғындарының сеніміне ие болған дүкен. Біз әрқашан өз тұтынушыларымызға ең жақсы өнімдер мен адал қызметті ұсынамыз.'
                : 'Проверенный магазин в Атырау. Мы дорожим доверием каждого покупателя и предлагаем только сертифицированные качественные товары.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
