import { Category, Product, StoreConfig } from '../types';
import { getProductDirectUrl } from './formatters';

export interface InfoStoryCardSpec {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  bullets: string[];
  footerNote?: string;
  accentColor?: string;
}

function formatPhoneDisplay(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return raw || '+7 (708) 972-09-52';
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

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = (text || '').replace(/\s+/g, ' ').trim().split(' ');
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

function extractHighlights(product: Product): string[] {
  if (Array.isArray(product.benefitsRu) && product.benefitsRu.length > 0) {
    return product.benefitsRu
      .map((b) => b.replace(/^[✓✔•*-]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  const desc = product.descriptionRu || '';
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
    product.inStock ? 'В наличии в Бутике №24 — быстрая отправка' : 'Доступно под заказ в Бутике №24',
  ];
}

/**
 * Renders a Product Story in Full HD (1080x1920) on an offscreen canvas and returns PNG Blob + DataURL.
 */
export async function renderProductStoryHd(options: {
  product: Product;
  config: StoreConfig;
  categories?: Category[];
  badgeText?: string;
}): Promise<{ dataUrl: string; blob: Blob | null; filename: string }> {
  const { product, config, categories = [], badgeText } = options;
  const canvas = document.createElement('canvas');
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Emerald & Gold Luxury Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#032219');
  bgGrad.addColorStop(0.5, '#063f2e');
  bgGrad.addColorStop(1, '#021510');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Radial gold glow behind product image
  const glowGrad = ctx.createRadialGradient(W / 2, 620, 60, W / 2, 620, 720);
  glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.26)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Outer gold frame border
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 42, 42, W - 84, H - 84, 48);
  ctx.stroke();

  // 2. Top Brand Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 32px Inter, system-ui, sans-serif';
  ctx.fillText('🌿 MUSLIM SHOP • АТЫРАУ • БУТИК №24', W / 2, 115);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.fillText('Халяль витамины iHerb, натуральные масла, мёд и восточные товары', W / 2, 154);

  // 3. Top Sticker Badge
  const effectiveSticker =
    badgeText ||
    (product.isHit
      ? '🔥 ХИТ ПРОДАЖ БУТИКА №24'
      : product.isNew
      ? '✨ СВЕЖЕЕ ПОСТУПЛЕНИЕ • В НАЛИЧИИ'
      : '🌿 100% ОРИГИНАЛ И ХАЛЯЛЬ');

  ctx.font = '900 27px Inter, system-ui, sans-serif';
  const badgeMetrics = ctx.measureText(effectiveSticker.toUpperCase());
  const badgeW = Math.min(W - 140, badgeMetrics.width + 88);
  const badgeH = 64;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 188;

  ctx.fillStyle = '#f59e0b';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 32);
  ctx.fill();

  ctx.fillStyle = '#1c1917';
  ctx.fillText(effectiveSticker.toUpperCase(), W / 2, badgeY + 42);

  // 4. Product Photo Container
  const imgBoxX = 110;
  const imgBoxY = 284;
  const imgBoxW = W - 220;
  const imgBoxH = 760;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 45;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 44);
  ctx.fill();
  ctx.restore();

  const rawImgSrc = product.images?.[0] || '';
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
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);

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
    const scale = 1.04;
    drawW *= scale;
    drawH *= scale;
    const drawX = imgBoxX + (imgBoxW - drawW) / 2;
    const drawY = imgBoxY + (imgBoxH - drawH) / 2;
    ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = '#062c21';
    ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 38px Inter, system-ui, sans-serif';
    ctx.fillText('MUSLIM SHOP • БУТИК №24', W / 2, imgBoxY + imgBoxH / 2);
  }
  ctx.restore();

  // Gold border around product photo card
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 44);
  ctx.stroke();

  // Discount badge if oldPrice > price
  if (product.oldPrice && product.oldPrice > product.price) {
    const discPercent = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
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

  // Availability pill on bottom-left of image
  const stockBadgeX = imgBoxX + 26;
  const stockBadgeY = imgBoxY + imgBoxH - 82;
  ctx.fillStyle = product.inStock ? 'rgba(6, 78, 59, 0.94)' : 'rgba(190, 18, 60, 0.94)';
  drawRoundedRect(ctx, stockBadgeX, stockBadgeY, 275, 56, 28);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    product.inStock ? '✓ В наличии в №24' : 'Под заказ',
    stockBadgeX + 137,
    stockBadgeY + 37
  );

  // 5. Product Info Card
  const infoCardX = 80;
  const infoCardY = 1084;
  const infoCardW = W - 160;
  const infoCardH = 546;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, infoCardX, infoCardY, infoCardW, infoCardH, 40);
  ctx.fill();
  ctx.restore();

  const catName =
    categories.find((c) => c.id === product.categoryId)?.nameRu || 'Натуральная продукция';
  ctx.fillStyle = '#78716c';
  ctx.font = '700 23px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${catName.toUpperCase()}  •  АРТ: ${product.sku || 'MS'}`,
    W / 2,
    infoCardY + 54
  );

  ctx.fillStyle = '#1c1917';
  ctx.font = '900 40px Inter, system-ui, sans-serif';
  const cleanTitle = product.titleRu.replace(/^[🔥✨🌿💊🍯⚡]+\s*/g, '').trim();
  const wrappedTitle = wrapCanvasText(ctx, cleanTitle, infoCardW - 96, 3);
  let currentY = infoCardY + 112;
  for (const line of wrappedTitle) {
    ctx.fillText(line, W / 2, currentY);
    currentY += 50;
  }

  const highlights = extractHighlights(product);
  if (highlights.length > 0) {
    currentY += 10;
    ctx.textAlign = 'left';
    ctx.font = '600 26px Inter, system-ui, sans-serif';
    for (const benefit of highlights.slice(0, 3)) {
      const cleanBen = benefit.length > 52 ? benefit.slice(0, 50) + '…' : benefit;
      ctx.fillStyle = '#059669';
      ctx.fillText('✔', infoCardX + 56, currentY);
      ctx.fillStyle = '#44403c';
      ctx.fillText(cleanBen, infoCardX + 94, currentY);
      currentY += 42;
    }
  }

  // Price Banner
  const priceBoxW = infoCardW - 96;
  const priceBoxH = 112;
  const priceBoxX = infoCardX + 48;
  const priceBoxY = infoCardY + infoCardH - priceBoxH - 34;

  ctx.fillStyle = '#fef3c7';
  drawRoundedRect(ctx, priceBoxX, priceBoxY, priceBoxW, priceBoxH, 28);
  ctx.fill();

  ctx.textAlign = 'center';
  const formattedPrice = `${product.price.toLocaleString('ru-RU')} ${config.currency || '₸'}`;
  ctx.font = '900 56px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#064e3b';
  ctx.fillText(`Цена: ${formattedPrice}`, W / 2, priceBoxY + 76);

  // 6. Footer CTA
  const footerY = 1680;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 30px Inter, system-ui, sans-serif';
  ctx.fillText('Пишите в WhatsApp • Доставка по Атырау и всему Казахстану', W / 2, footerY);

  const phoneDisplay = formatPhoneDisplay(config.whatsappNumber || '77089720952');
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px Inter, system-ui, sans-serif';
  ctx.fillText(`📞 ${phoneDisplay}  •  muslimshop.kz`, W / 2, footerY + 64);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  ctx.fillText(`📍 ${config.address || 'г. Атырау, ТД «Дина Байзар», Бутик №24'}`, W / 2, footerY + 114);

  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
  );
  const cleanSku = (product.sku || product.id).replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    dataUrl,
    blob,
    filename: `muslimshop-story-${cleanSku}.png`,
  };
}

/**
 * Renders an Informational Boutique Story (Location, 100% Original & Halal, Fast Delivery) in Full HD (1080x1920)
 */
export async function renderInfoStoryHd(options: {
  spec: InfoStoryCardSpec;
  config: StoreConfig;
}): Promise<{ dataUrl: string; blob: Blob | null; filename: string }> {
  const { spec, config } = options;
  const canvas = document.createElement('canvas');
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Emerald & Gold Luxury Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#032017');
  bgGrad.addColorStop(0.5, '#063b2b');
  bgGrad.addColorStop(1, '#02130e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const glowGrad = ctx.createRadialGradient(W / 2, 550, 50, W / 2, 550, 750);
  glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Outer gold frame
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 46, 46, W - 92, H - 92, 48);
  ctx.stroke();

  // Brand Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 36px Inter, system-ui, sans-serif';
  ctx.fillText('🌿 MUSLIM SHOP • АТЫРАУ', W / 2, 140);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '700 25px Inter, system-ui, sans-serif';
  ctx.fillText('ТД «Дина Байзар», Бутик №24 • Халяль & Премиум бутик', W / 2, 188);

  // Top Badge
  ctx.font = '900 30px Inter, system-ui, sans-serif';
  const badgeText = spec.badge.toUpperCase();
  const badgeW = Math.min(W - 160, ctx.measureText(badgeText).width + 96);
  const badgeH = 72;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 240;

  ctx.fillStyle = '#f59e0b';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 36);
  ctx.fill();
  ctx.fillStyle = '#1c1917';
  ctx.fillText(badgeText, W / 2, badgeY + 47);

  // Center Card
  const cardX = 84;
  const cardY = 365;
  const cardW = W - 168;
  const cardH = 1220;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 45;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#07291E';
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.stroke();

  // Title inside Card
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const titleLines = wrapCanvasText(ctx, spec.title, cardW - 110, 3);
  let y = cardY + 110;
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, y);
    y += 62;
  }

  // Subtitle
  y += 16;
  ctx.fillStyle = '#d1fae5';
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  const subLines = wrapCanvasText(ctx, spec.subtitle, cardW - 120, 3);
  for (const line of subLines) {
    ctx.fillText(line, W / 2, y);
    y += 44;
  }

  // Bullets
  y += 38;
  ctx.textAlign = 'left';
  for (const bullet of spec.bullets.slice(0, 4)) {
    const boxX = cardX + 52;
    const boxW = cardW - 104;
    const boxH = 148;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    drawRoundedRect(ctx, boxX, y, boxW, boxH, 28);
    ctx.fill();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, boxX, y, boxW, boxH, 28);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px Inter, system-ui, sans-serif';
    const bLines = wrapCanvasText(ctx, bullet, boxW - 64, 2);
    let by = y + (bLines.length === 1 ? 84 : 62);
    for (const bl of bLines) {
      ctx.fillText(bl, boxX + 32, by);
      by += 40;
    }

    y += boxH + 26;
  }

  // Footer CTA
  const footerY = 1675;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 30px Inter, system-ui, sans-serif';
  ctx.fillText('Ждём вас ежедневно • Заказ в 1 клик через WhatsApp:', W / 2, footerY);

  const phoneDisplay = formatPhoneDisplay(config.whatsappNumber || '77089720952');
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px Inter, system-ui, sans-serif';
  ctx.fillText(`📞 ${phoneDisplay}  •  muslimshop.kz`, W / 2, footerY + 64);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  ctx.fillText(`📍 ${config.address || 'г. Атырау, ТД «Дина Байзар», Бутик №24'}`, W / 2, footerY + 114);

  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
  );
  return {
    dataUrl,
    blob,
    filename: `muslimshop-story-${spec.id}.png`,
  };
}

export function triggerDataUrlDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function shareOrDownloadStoryResult(
  result: { dataUrl: string; blob: Blob | null; filename: string },
  title: string,
  product?: Product
): Promise<'shared' | 'downloaded'> {
  if (result.blob && navigator.canShare) {
    try {
      const file = new File([result.blob], result.filename, { type: 'image/png' });
      const shareData: ShareData = {
        files: [file],
        title,
        text: product
          ? `${product.titleRu} — ${product.price.toLocaleString('ru-RU')} ₸\nЗаказать: ${getProductDirectUrl(product.id)}`
          : `${title} — MUSLIM SHOP Атырау, Бутик №24`,
      };
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return 'shared';
      }
    } catch {
      // Fallback to download
    }
  }
  triggerDataUrlDownload(result.dataUrl, result.filename);
  return 'downloaded';
}
