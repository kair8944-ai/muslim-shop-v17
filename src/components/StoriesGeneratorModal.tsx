import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Search,
  Palette,
  Tag,
  MessageCircle,
  X,
  Image as ImageIcon,
  RefreshCw,
  MapPin,
  ShieldCheck,
  Truck,
  Link,
} from 'lucide-react';
import { Category, Product, StoreConfig } from '../types';
import { copyTextToClipboard, getProductDirectUrl } from '../utils/formatters';
import {
  renderProductStoryHd,
  renderInfoStoryHd,
  triggerDataUrlDownload,
  shareOrDownloadStoryResult,
  InfoStoryCardSpec,
} from '../utils/storyCanvasRenderer';

function formatPhoneDisplay(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return raw || '+7 (708) 972-09-52';
}

interface StoriesGeneratorProps {
  products: Product[];
  categories: Category[];
  config: StoreConfig;
  initialProduct?: Product | null;
  onClose?: () => void;
}

type StoryThemeId = 'emerald' | 'gold' | 'onyx' | 'rose';

interface StoryTheme {
  id: StoryThemeId;
  name: string;
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  accent: string;
  accentSoft: string;
  cardBg: string;
  cardText: string;
  textPrimary: string;
  textSecondary: string;
  badgeBg: string;
  badgeText: string;
  priceBg: string;
  priceText: string;
}

const STORY_THEMES: StoryTheme[] = [
  {
    id: 'emerald',
    name: 'Изумрудный Премиум',
    bgStart: '#042f24',
    bgMid: '#064e3b',
    bgEnd: '#022018',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.22)',
    cardBg: '#ffffff',
    cardText: '#1c1917',
    textPrimary: '#ffffff',
    textSecondary: '#a7f3d0',
    badgeBg: '#f59e0b',
    badgeText: '#1c1917',
    priceBg: '#fef3c7',
    priceText: '#064e3b',
  },
  {
    id: 'gold',
    name: 'Арабское Золото',
    bgStart: '#451a03',
    bgMid: '#78350f',
    bgEnd: '#291002',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.22)',
    cardBg: '#fffbeb',
    cardText: '#292524',
    textPrimary: '#fffbeb',
    textSecondary: '#fde68a',
    badgeBg: '#10b981',
    badgeText: '#ffffff',
    priceBg: '#064e3b',
    priceText: '#ffffff',
  },
  {
    id: 'onyx',
    name: 'Королевский Оникс',
    bgStart: '#0c0a09',
    bgMid: '#1c1917',
    bgEnd: '#090807',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.18)',
    cardBg: '#ffffff',
    cardText: '#0c0a09',
    textPrimary: '#fafaf9',
    textSecondary: '#d6d3d1',
    badgeBg: '#f59e0b',
    badgeText: '#0c0a09',
    priceBg: '#f59e0b',
    priceText: '#0c0a09',
  },
  {
    id: 'rose',
    name: 'Жемчужная Роза',
    bgStart: '#4c0519',
    bgMid: '#881337',
    bgEnd: '#310410',
    accent: '#fda4af',
    accentSoft: 'rgba(253, 164, 175, 0.22)',
    cardBg: '#fff1f2',
    cardText: '#1c1917',
    textPrimary: '#ffffff',
    textSecondary: '#fecdd3',
    badgeBg: '#fbbf24',
    badgeText: '#1c1917',
    priceBg: '#881337',
    priceText: '#ffffff',
  },
];

const STICKER_PRESETS = [
  '🔥 ХИТ ПРОДАЖ',
  '✨ 100% ОРИГИНАЛ',
  '🌿 НАТУРАЛЬНЫЙ СОСТАВ',
  '⚡ В НАЛИЧИИ В АТЫРАУ',
  '🎁 ВЫГОДНАЯ ЦЕНА',
  '💎 КАЧЕСТВО PREMIUM',
];

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) {
        const remaining = words.slice(i).join(' ');
        let lastLine = remaining;
        while (ctx.measureText(lastLine + '…').width > maxWidth && lastLine.length > 3) {
          lastLine = lastLine.slice(0, -1).trim();
        }
        lines.push(lastLine === remaining ? lastLine : lastLine + '…');
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.slice(0, maxLines);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export const StoriesGeneratorModal: React.FC<StoriesGeneratorProps> = ({
  products,
  categories,
  config,
  initialProduct,
  onClose,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || products[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [themeId, setThemeId] = useState<StoryThemeId>('emerald');
  const [stickerText, setStickerText] = useState<string>('🔥 ХИТ ПРОДАЖ');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [ctaText, setCtaText] = useState<string>('Пишите в WhatsApp • Доставка по всему Казахстану');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBenefits, setShowBenefits] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [downloadedSuccess, setDownloadedSuccess] = useState<boolean>(false);

  // Showcase of rotating ready-to-download HD stories
  const [showcaseSeed, setShowcaseSeed] = useState<number>(() => Math.floor(Math.random() * 10000));
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [copiedLinkCardId, setCopiedLinkCardId] = useState<string | null>(null);
  const customEditorRef = useRef<HTMLDivElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialProduct?.id) {
      setSelectedProductId(initialProduct.id);
    }
  }, [initialProduct]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  useEffect(() => {
    if (selectedProduct) {
      const cleanTitle = selectedProduct.titleRu.replace(/^[🔥✨🌿💊🍯⚡]+\s*/g, '').trim();
      setCustomTitle(cleanTitle);
      if (selectedProduct.isHit) {
        setStickerText('🔥 ХИТ ПРОДАЖ');
      } else if (selectedProduct.isNew) {
        setStickerText('✨ НОВОЕ ПОСТУПЛЕНИЕ');
      } else if (selectedProduct.categoryId === 'cat-women' || selectedProduct.categoryId === 'cat-beauty') {
        setThemeId('rose');
      }
    }
  }, [selectedProduct]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 60);
    return products
      .filter(
        (p) =>
          p.titleRu.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.titleKz && p.titleKz.toLowerCase().includes(q))
      )
      .slice(0, 60);
  }, [products, searchQuery]);

  const activeTheme = useMemo(
    () => STORY_THEMES.find((t) => t.id === themeId) || STORY_THEMES[0],
    [themeId]
  );

  // 6 Rotating Showcase Products for instant 1-click HD Story download
  const showcaseProducts = useMemo(() => {
    const pool = products.filter((p) => p.inStock && p.images && p.images[0]);
    if (pool.length <= 6) return pool;
    const shuffled = [...pool].sort((a, b) => {
      const hashA =
        ((a.id.charCodeAt(a.id.length - 1) || 1) * 37 +
          (a.price % 97) +
          showcaseSeed * 19) %
        101;
      const hashB =
        ((b.id.charCodeAt(b.id.length - 1) || 1) * 37 +
          (b.price % 97) +
          showcaseSeed * 19) %
        101;
      return hashA - hashB;
    });
    return shuffled.slice(0, 6);
  }, [products, showcaseSeed]);

  // 3 Branded Boutique Informational Stories
  const boutiqueInfoSpecs: InfoStoryCardSpec[] = useMemo(
    () => [
      {
        id: 'location-dina-24',
        badge: 'БУТИК №24 • АТЫРАУ',
        title: 'Ждём вас в ТД «Дина Байзар», Бутик №24',
        subtitle:
          'Приходите лично выбрать витамины iHerb, натуральный мёд, масла и восточные миски с профессиональной консультацией.',
        bullets: [
          `📍 Адрес: ${config.address || 'г. Атырау, ТД «Дина Байзар», Бутик №24'}`,
          `🕙 График: ${config.workingHoursRu || 'Ежедневно с 10:00 до 19:00'}`,
          '🅿️ Быстрая выдача онлайн-заказов без очереди',
          '💳 Оплата Kaspi QR / Kaspi Gold / Наличными',
        ],
      },
      {
        id: 'authentic-halal',
        badge: 'ГАРАНТИЯ КАЧЕСТВА',
        title: '100% Оригинал iHerb и строгий стандарт Халяль',
        subtitle:
          'Мы дорожим доверием каждой семьи в Атырау и отбираем только проверенные добавки и натуральные средства.',
        bullets: [
          '✅ Прямые поставки оригинальных брендов США (Now Foods, Solgar, California Gold)',
          '✅ Чистый состав без запрещённого желатина и сомнительных добавок',
          '✅ Строгий контроль сроков годности и правильное хранение в бутике',
          '✅ Поможем подобрать дозировку для взрослых и детей',
        ],
      },
      {
        id: 'fast-delivery',
        badge: 'ДОСТАВКА В ДЕНЬ ЗАКАЗА',
        title: 'Быстрая доставка по Атырау и отправка по всему Казахстану',
        subtitle:
          'Не нужно ждать посылку из-за рубежа 3 недели — всё уже в наличии в Бутике №24!',
        bullets: [
          '🚀 Курьер по г. Атырау — отправим сразу после подтверждения заказа',
          '🛍️ Самовывоз из Бутика №24 — соберём ваш пакет заранее к вашему приезду',
          '📦 Отправка по РК — Казпочта, СДЭК, Индрайвер в любой город и район',
          '💬 Заказ в 1 клик через сайт muslimshop.kz или напрямую в WhatsApp',
        ],
      },
    ],
    [config.address, config.workingHoursRu]
  );

  const handleQuickProductStoryAction = async (
    prod: Product,
    mode: 'download' | 'share'
  ) => {
    if (busyCardId) return;
    setBusyCardId(prod.id);
    try {
      const badge = prod.isHit
        ? '🔥 ХИТ ПРОДАЖ БУТИКА №24'
        : prod.isNew
        ? '✨ СВЕЖЕЕ ПОСТУПЛЕНИЕ • В НАЛИЧИИ'
        : '🌿 100% ОРИГИНАЛ И ХАЛЯЛЬ';
      const res = await renderProductStoryHd({
        product: prod,
        config,
        categories,
        badgeText: badge,
      });
      if (mode === 'share') {
        await shareOrDownloadStoryResult(res, prod.titleRu, prod);
      } else {
        triggerDataUrlDownload(res.dataUrl, res.filename);
      }
      setSavedCardId(prod.id);
      setTimeout(() => {
        setSavedCardId((curr) => (curr === prod.id ? null : curr));
      }, 3000);
    } finally {
      setBusyCardId(null);
    }
  };

  const handleQuickInfoStoryAction = async (
    spec: InfoStoryCardSpec,
    mode: 'download' | 'share'
  ) => {
    if (busyCardId) return;
    setBusyCardId(spec.id);
    try {
      const res = await renderInfoStoryHd({ spec, config });
      if (mode === 'share') {
        await shareOrDownloadStoryResult(res, spec.title);
      } else {
        triggerDataUrlDownload(res.dataUrl, res.filename);
      }
      setSavedCardId(spec.id);
      setTimeout(() => {
        setSavedCardId((curr) => (curr === spec.id ? null : curr));
      }, 3000);
    } finally {
      setBusyCardId(null);
    }
  };

  // Extract up to 3 crisp benefits from product data or description
  const productHighlights = useMemo(() => {
    if (!selectedProduct) return [];
    if (Array.isArray(selectedProduct.benefitsRu) && selectedProduct.benefitsRu.length > 0) {
      return selectedProduct.benefitsRu
        .map((b) => b.replace(/^[✓✔•*-]\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }
    const desc = selectedProduct.descriptionRu || '';
    const lines = desc
      .split(/\n|•|✔|✓/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12 && s.length < 85);
    if (lines.length >= 2) {
      return lines.slice(0, 3);
    }
    return [
      '100% натуральный проверенный состав',
      'Высокая эффективность и безопасность',
      selectedProduct.inStock ? 'В наличии — быстрая отправка в день заказа' : 'Доступно под заказ',
    ];
  }, [selectedProduct]);

  const renderStoryCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedProduct) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // 1. Rich background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, activeTheme.bgStart);
    bgGrad.addColorStop(0.5, activeTheme.bgMid);
    bgGrad.addColorStop(1, activeTheme.bgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle oriental radial glow & decorative arch lines
    const glowGrad = ctx.createRadialGradient(W / 2, 580, 60, W / 2, 580, 680);
    glowGrad.addColorStop(0, activeTheme.accentSoft);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, W, H);

    // Outer luxury frame border
    ctx.strokeStyle = activeTheme.accentSoft;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 44, 44, W - 88, H - 88, 48);
    ctx.stroke();

    // 2. Top Brand Header
    ctx.textAlign = 'center';
    ctx.fillStyle = activeTheme.accent;
    ctx.font = '800 30px Inter, system-ui, sans-serif';
    ctx.fillText('🌿 MUSLIM SHOP • АТЫРАУ', W / 2, 118);

    ctx.fillStyle = activeTheme.textSecondary;
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillText('Натуральная продукция для здоровья и баракята', W / 2, 156);

    // 3. Top Sticker Badge
    if (stickerText.trim()) {
      ctx.font = '900 28px Inter, system-ui, sans-serif';
      const badgeMetrics = ctx.measureText(stickerText.toUpperCase());
      const badgeW = Math.min(W - 160, badgeMetrics.width + 84);
      const badgeH = 66;
      const badgeX = (W - badgeW) / 2;
      const badgeY = 192;

      ctx.fillStyle = activeTheme.badgeBg;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 33);
      ctx.fill();

      ctx.fillStyle = activeTheme.badgeText;
      ctx.fillText(stickerText.toUpperCase(), W / 2, badgeY + 43);
    }

    // 4. Product Photo Container (Centerpiece)
    const imgBoxX = 110;
    const imgBoxY = 290;
    const imgBoxW = W - 220; // 860
    const imgBoxH = 760;

    // Drop shadow behind image card
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 44);
    ctx.fill();
    ctx.restore();

    // Load product image safely
    const rawImgSrc = selectedProduct.images?.[0] || '';
    let loadedImg: HTMLImageElement | null = null;
    if (rawImgSrc) {
      loadedImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        if (!rawImgSrc.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = rawImgSrc;
      });
    }

    ctx.save();
    drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 44);
    ctx.clip();

    if (loadedImg && loadedImg.width > 0 && loadedImg.height > 0) {
      // Soft background fill inside image box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);

      // Cover/contain smart scaling so product bottle/box is never awkwardly cropped
      const imgRatio = loadedImg.width / loadedImg.height;
      const boxRatio = imgBoxW / imgBoxH;
      let drawW = imgBoxW;
      let drawH = imgBoxH;
      if (imgRatio > boxRatio) {
        drawW = imgBoxW;
        drawH = imgBoxW / imgRatio;
      } else {
        drawH = imgBoxH;
        drawW = imgBoxH * imgRatio;
      }
      // Slight zoom for clean visual impact
      const scale = 1.04;
      drawW *= scale;
      drawH *= scale;
      const drawX = imgBoxX + (imgBoxW - drawW) / 2;
      const drawY = imgBoxY + (imgBoxH - drawH) / 2;
      ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
      ctx.fillStyle = '#78716c';
      ctx.font = '700 34px Inter, system-ui, sans-serif';
      ctx.fillText('MUSLIM SHOP', W / 2, imgBoxY + imgBoxH / 2);
    }
    ctx.restore();

    // Discount corner badge if oldPrice > price
    if (
      showPrice &&
      selectedProduct.oldPrice &&
      selectedProduct.oldPrice > selectedProduct.price
    ) {
      const discPercent = Math.round(
        ((selectedProduct.oldPrice - selectedProduct.price) / selectedProduct.oldPrice) * 100
      );
      if (discPercent > 0) {
        const dBadgeX = imgBoxX + imgBoxW - 195;
        const dBadgeY = imgBoxY + 26;
        ctx.fillStyle = '#e11d48';
        drawRoundedRect(ctx, dBadgeX, dBadgeY, 168, 64, 32);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`-${discPercent}%`, dBadgeX + 84, dBadgeY + 44);
      }
    }

    // SKU / In-stock pill on image bottom-left
    const stockBadgeX = imgBoxX + 26;
    const stockBadgeY = imgBoxY + imgBoxH - 82;
    ctx.fillStyle = selectedProduct.inStock ? 'rgba(6, 78, 59, 0.92)' : 'rgba(190, 18, 60, 0.92)';
    drawRoundedRect(ctx, stockBadgeX, stockBadgeY, 265, 56, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      selectedProduct.inStock ? '✓ В наличии' : 'Под заказ',
      stockBadgeX + 132,
      stockBadgeY + 37
    );

    // 5. Main Product Info Card
    const infoCardX = 80;
    const infoCardY = 1090;
    const infoCardW = W - 160;
    const infoCardH = 540;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = activeTheme.cardBg;
    drawRoundedRect(ctx, infoCardX, infoCardY, infoCardW, infoCardH, 40);
    ctx.fill();
    ctx.restore();

    // Category & SKU kicker inside card
    const catName =
      categories.find((c) => c.id === selectedProduct.categoryId)?.nameRu || 'Натуральная продукция';
    ctx.fillStyle = '#78716c';
    ctx.font = '700 23px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${catName.toUpperCase()}  •  АРТ: ${selectedProduct.sku || 'MS'}`,
      W / 2,
      infoCardY + 54
    );

    // Product Title (2-3 lines wrapped)
    ctx.fillStyle = activeTheme.cardText;
    ctx.font = '900 40px Inter, system-ui, sans-serif';
    const titleToRender = (customTitle || selectedProduct.titleRu).trim();
    const wrappedTitle = wrapCanvasText(ctx, titleToRender, infoCardW - 96, 3);
    let currentY = infoCardY + 112;
    for (const line of wrappedTitle) {
      ctx.fillText(line, W / 2, currentY);
      currentY += 50;
    }

    // Benefits list (up to 3 items)
    if (showBenefits && productHighlights.length > 0) {
      currentY += 12;
      ctx.textAlign = 'left';
      ctx.font = '600 26px Inter, system-ui, sans-serif';
      for (const benefit of productHighlights.slice(0, 3)) {
        const cleanBen = benefit.length > 52 ? benefit.slice(0, 50) + '…' : benefit;
        ctx.fillStyle = '#059669';
        ctx.fillText('✔', infoCardX + 56, currentY);
        ctx.fillStyle = '#44403c';
        ctx.fillText(cleanBen, infoCardX + 94, currentY);
        currentY += 42;
      }
    }

    // Price Banner inside bottom of Info Card
    if (showPrice) {
      const priceBoxW = infoCardW - 96;
      const priceBoxH = 112;
      const priceBoxX = infoCardX + 48;
      const priceBoxY = infoCardY + infoCardH - priceBoxH - 34;

      ctx.fillStyle = activeTheme.priceBg;
      drawRoundedRect(ctx, priceBoxX, priceBoxY, priceBoxW, priceBoxH, 28);
      ctx.fill();

      ctx.textAlign = 'center';
      const formattedPrice = `${selectedProduct.price.toLocaleString('ru-RU')} ${config.currency || '₸'}`;

      if (selectedProduct.oldPrice && selectedProduct.oldPrice > selectedProduct.price) {
        const formattedOld = `${selectedProduct.oldPrice.toLocaleString('ru-RU')} ${config.currency || '₸'}`;
        ctx.font = '700 30px Inter, system-ui, sans-serif';
        ctx.fillStyle = activeTheme.priceText;
        ctx.globalAlpha = 0.65;
        ctx.fillText(`Старая цена: ${formattedOld}`, W / 2 - 170, priceBoxY + 68);
        // Strikethrough line
        const oldMetrics = ctx.measureText(formattedOld);
        ctx.strokeStyle = activeTheme.priceText;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 85 - oldMetrics.width / 2, priceBoxY + 58);
        ctx.lineTo(W / 2 - 85 + oldMetrics.width / 2, priceBoxY + 58);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.font = '900 54px Inter, system-ui, sans-serif';
        ctx.fillStyle = activeTheme.priceText;
        ctx.fillText(formattedPrice, W / 2 + 165, priceBoxY + 75);
      } else {
        ctx.font = '900 56px Inter, system-ui, sans-serif';
        ctx.fillStyle = activeTheme.priceText;
        ctx.fillText(`Цена: ${formattedPrice}`, W / 2, priceBoxY + 76);
      }
    }

    // 6. Bottom Call-To-Action Footer (WhatsApp + Website)
    const footerY = 1675;
    ctx.textAlign = 'center';
    ctx.fillStyle = activeTheme.accent;
    ctx.font = '800 30px Inter, system-ui, sans-serif';
    ctx.fillText(ctaText || 'Для заказа пишите на WhatsApp:', W / 2, footerY);

    const phoneDisplay = formatPhoneDisplay(config.whatsappNumber || '77089720952');
    ctx.fillStyle = activeTheme.textPrimary;
    ctx.font = '900 44px Inter, system-ui, sans-serif';
    ctx.fillText(`📞 ${phoneDisplay}  •  muslimshop.kz`, W / 2, footerY + 64);

    if (config.addressRu) {
      ctx.fillStyle = activeTheme.textSecondary;
      ctx.font = '600 24px Inter, system-ui, sans-serif';
      ctx.fillText(`📍 ${config.addressRu}`, W / 2, footerY + 114);
    }

    setIsRendering(false);
  }, [
    selectedProduct,
    activeTheme,
    stickerText,
    customTitle,
    ctaText,
    showPrice,
    showBenefits,
    productHighlights,
    categories,
    config,
  ]);

  useEffect(() => {
    renderStoryCanvas();
  }, [renderStoryCanvas]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedProduct) return;
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const cleanSku = (selectedProduct.sku || selectedProduct.id).replace(/[^a-zA-Z0-9_-]/g, '');
      link.download = `muslimshop-story-${cleanSku}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadedSuccess(true);
      setTimeout(() => setDownloadedSuccess(false), 3500);
    } catch (err) {
      console.error('Canvas download error:', err);
    }
  };

  const handleShareStory = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedProduct) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
      );
      if (!blob) {
        handleDownloadImage();
        return;
      }

      const cleanSku = (selectedProduct.sku || selectedProduct.id).replace(/[^a-zA-Z0-9_-]/g, '');
      const file = new File([blob], `muslimshop-story-${cleanSku}.png`, { type: 'image/png' });
      const directUrl = getProductDirectUrl(selectedProduct.id);

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: selectedProduct.titleRu,
          text: `${selectedProduct.titleRu} — ${selectedProduct.price.toLocaleString('ru-RU')} ₸\nЗаказать: ${directUrl}`,
        });
        return;
      }
    } catch {
      // Fallback to direct download if Web Share API is cancelled or unsupported on desktop
    }
    handleDownloadImage();
  };

  const handleCopyCaption = async () => {
    if (!selectedProduct) return;
    const directUrl = getProductDirectUrl(selectedProduct.id);
    const phoneDisplay = formatPhoneDisplay(config.whatsappNumber || '77089720952');
    const benefitsLines = productHighlights.map((b) => `✅ ${b}`).join('\n');
    const caption = `${stickerText ? stickerText + '\n\n' : ''}🌿 ${selectedProduct.titleRu}\n\n${
      benefitsLines ? benefitsLines + '\n\n' : ''
    }💰 Цена: ${selectedProduct.price.toLocaleString('ru-RU')} ${config.currency || '₸'}${
      selectedProduct.oldPrice ? ` (вместо ${selectedProduct.oldPrice.toLocaleString('ru-RU')} ₸)` : ''
    }\n📦 Артикул: ${selectedProduct.sku}\n\n📲 Заказать в WhatsApp: ${phoneDisplay}\n🔗 Прямая ссылка на товар:\n${directUrl}`;

    await copyTextToClipboard(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 3500);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="font-extrabold text-base sm:text-lg">
              Генератор карточек для Instagram Stories и WhatsApp Status
            </h3>
          </div>
          <p className="text-xs text-emerald-200 mt-1">
            Выберите любой товар — система автоматически создаст вертикальную карточку 1080×1920 с фото, ценой и вашим номером телефона
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-auto px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Вернуться к списку</span>
          </button>
        )}
      </div>

      {/* NEW: ROTATING SHOWCASE OF READY-TO-DOWNLOAD HD STORIES */}
      <div
        id="admin-rotating-stories-showcase"
        className="bg-gradient-to-b from-[#041E16] via-[#06261C] to-[#041812] rounded-3xl p-4 sm:p-6 border-2 border-amber-400/40 shadow-xl space-y-5 text-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-amber-400/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Full HD 1080×1920 • Качество без сжатия</span>
            </div>
            <h4 className="font-serif font-extrabold text-base sm:text-xl text-white">
              Витрина меняющихся Сторис (Скачивание в 1 клик)
            </h4>
            <p className="text-xs sm:text-sm text-emerald-200/85 mt-0.5">
              Нажмите «Показать другие товары», чтобы перемешать подборку, и скачайте понравившийся сторис в HD для Instagram или WhatsApp Status
            </p>
          </div>

          <button
            type="button"
            id="admin-shuffle-stories-btn"
            onClick={() => setShowcaseSeed((s) => s + 1)}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <RefreshCw className="w-4 h-4 text-stone-950 shrink-0" />
            <span>Показать другие товары (Перемешать)</span>
          </button>
        </div>

        {/* 6 Rotating Product Story Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {showcaseProducts.map((prod) => {
            const isBusy = busyCardId === prod.id;
            const isSaved = savedCardId === prod.id;
            const isLinkCopied = copiedLinkCardId === prod.id;
            const badge = prod.isHit
              ? '🔥 Хит продаж №24'
              : prod.isNew
              ? '✨ Свежее поступление'
              : '🌿 100% Оригинал & Халяль';

            return (
              <div
                key={prod.id}
                className="rounded-2xl bg-[#07241B] border border-amber-400/30 hover:border-amber-400/70 p-3.5 flex flex-col justify-between gap-3 shadow-lg transition-all"
              >
                {/* Visual 9:16-inspired Story Card Preview */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1.5 text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black">
                      {badge}
                    </span>
                    <span className="font-mono text-emerald-200/80">Арт: {prod.sku}</span>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedProductId(prod.id);
                      customEditorRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="relative aspect-[4/4] w-full rounded-2xl overflow-hidden bg-stone-900 border-2 border-amber-400/40 cursor-pointer group"
                    title="Нажмите, чтобы открыть этот товар в детальном конструкторе ниже"
                  >
                    <img
                      src={prod.images[0]}
                      alt={prod.titleRu}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent flex items-end justify-between gap-2">
                      <span className="text-[11px] font-bold text-emerald-300">
                        ✓ В наличии в №24
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-stone-950 font-black text-xs sm:text-sm shadow-md">
                        {prod.price.toLocaleString('ru-RU')} {config.currency || '₸'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-serif font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug">
                      {prod.titleRu}
                    </h5>
                    <p className="text-[11px] text-emerald-200/75 line-clamp-2 mt-1">
                      {prod.descriptionRu}
                    </p>
                  </div>
                </div>

                {/* Instant HD Download & Share Actions */}
                <div className="space-y-2 pt-2 border-t border-amber-500/20">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickProductStoryAction(prod, 'download')}
                      className="py-2.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                      title="Скачать готовую картинку 1080×1920 в высоком качестве PNG"
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-4 h-4 text-stone-950 shrink-0" />
                          <span>Скачано HD!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-stone-950 shrink-0" />
                          <span>{isBusy ? 'Создаём...' : 'Скачать HD'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickProductStoryAction(prod, 'share')}
                      className="py-2.5 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                      title="Поделиться в Instagram Stories или WhatsApp Status"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>В соцсети</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const url = getProductDirectUrl(prod.id);
                        await copyTextToClipboard(url);
                        setCopiedLinkCardId(prod.id);
                        setTimeout(() => {
                          setCopiedLinkCardId((c) => (c === prod.id ? null : c));
                        }, 2500);
                      }}
                      className="py-1.5 px-2 rounded-xl bg-[#0B2E22] hover:bg-[#123E2F] text-amber-200 border border-amber-500/25 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Скопировать прямую ссылку на этот товар для стикера-ссылки в сторис"
                    >
                      {isLinkCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Ссылка скопирована</span>
                        </>
                      ) : (
                        <>
                          <Link className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Ссылка для сторис</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId(prod.id);
                        customEditorRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="py-1.5 px-2 rounded-xl bg-[#0B2E22] hover:bg-[#123E2F] text-emerald-200 border border-amber-500/25 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Изменить цвет фона или надпись в конструкторе ниже"
                    >
                      <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Настроить дизайн</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3 Branded Boutique Info Stories (Адрес, 100% Оригинал, Доставка) */}
        <div className="pt-4 border-t border-amber-400/20 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-serif font-extrabold text-sm sm:text-base text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Фирменные информационные Сторис Бутика №24 (Full HD 1080×1920):</span>
            </h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {boutiqueInfoSpecs.map((spec, i) => {
              const isBusy = busyCardId === spec.id;
              const isSaved = savedCardId === spec.id;
              return (
                <div
                  key={spec.id}
                  className="rounded-2xl bg-[#082A1F] border border-amber-400/30 p-3.5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-extrabold">
                      {i === 0 ? (
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                      ) : i === 1 ? (
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Truck className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{spec.badge}</span>
                    </div>
                    <h6 className="font-serif font-bold text-sm text-white leading-snug">
                      {spec.title}
                    </h6>
                    <p className="text-[11px] text-emerald-200/80 line-clamp-2">
                      {spec.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickInfoStoryAction(spec, 'download')}
                      className="py-2 px-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-stone-950 shrink-0" />
                          <span>Скачано HD!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-stone-950 shrink-0" />
                          <span>{isBusy ? 'Создаём...' : 'Скачать HD'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickInfoStoryAction(spec, 'share')}
                      className="py-2 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>В соцсети</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Custom Story Constructor */}
      <div ref={customEditorRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Controls & Product Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-4 bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs">
          {/* 1. Product Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider">
              1. Выберите товар из каталога ({products.length})
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Быстрый поиск товара по названию или артикулу..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-stone-50 focus:bg-white"
              />
            </div>

            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-stone-300 bg-white text-stone-900 focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            >
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku ? `[${p.sku}] ` : ''}
                  {p.titleRu} — {p.price.toLocaleString('ru-RU')} ₸
                </option>
              ))}
            </select>
          </div>

          {/* 2. Theme Selector */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. Дизайн и цветовая тема</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STORY_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    themeId === t.id
                      ? 'border-emerald-700 bg-emerald-50/70 ring-2 ring-emerald-700/20 font-bold'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 border border-white shadow-xs"
                    style={{
                      background: `linear-gradient(135deg, ${t.bgStart}, ${t.bgMid})`,
                    }}
                  />
                  <span className="text-[11px] text-stone-800 leading-tight">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Sticker / Badge Preset */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Верхняя плашка-стикер</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STICKER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setStickerText(preset)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    stickerText === preset
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={stickerText}
              onChange={(e) => setStickerText(e.target.value)}
              placeholder="Или напишите свой текст стикера..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          {/* 4. Custom Headline & CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Заголовок товара на карточке
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>Призыв внизу карточки</span>
              </label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* 5. Checkboxes */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-stone-100">
            <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
              />
              <span>Показывать крупную цену ({selectedProduct?.price.toLocaleString('ru-RU')} ₸)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
              <input
                type="checkbox"
                checked={showBenefits}
                onChange={(e) => setShowBenefits(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
              />
              <span>Показывать преимущества (3 пункта)</span>
            </label>
          </div>

          {/* 6. Action Buttons (1-Click Download / Share / Copy Caption) */}
          <div className="pt-3 border-t border-stone-200 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadImage}
                className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
              >
                {downloadedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-amber-300" />
                    <span>Картинка скачана!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>Скачать для Stories (PNG)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareStory}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>Поделиться в Instagram / WhatsApp</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyCaption}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 hover:border-emerald-700 bg-stone-50 hover:bg-emerald-50/50 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedCaption ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span className="text-emerald-800">
                    Готовый текст с ценой и прямой ссылкой скопирован!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-600" />
                  <span>Скопировать готовый текст и ссылку на товар для описания</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live 9:16 Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[320px] bg-stone-900 rounded-3xl p-3 shadow-xl border border-stone-800">
            <div className="flex items-center justify-between text-[11px] text-stone-400 px-2 pb-2">
              <span className="flex items-center gap-1.5 font-semibold text-stone-200">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Предпросмотр 9:16 (1080×1920)</span>
              </span>
              {isRendering && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />}
            </div>

            <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-stone-950 shadow-inner">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
