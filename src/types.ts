export interface Product {
  id: string;
  titleRu: string;
  titleKz: string;
  price: number;
  oldPrice?: number;
  categoryId: string;
  descriptionRu: string;
  descriptionKz: string;
  specsRu?: string;
  specsKz?: string;
  benefitsRu?: string[];
  benefitsKz?: string[];
  howToUseRu?: string;
  howToUseKz?: string;
  inStock: boolean;
  sku: string;
  isHit?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  images: string[];
  volumeOrWeight?: string;
  country?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  nameRu: string;
  nameKz: string;
  icon: string;
  order: number;
}

export interface StoreConfig {
  storeName: string;
  taglineRu: string;
  taglineKz: string;
  subtitleRu: string;
  subtitleKz: string;
  city: string;
  boutiqueNumber: string;
  address: string;
  whatsappNumber: string;
  instagram: string;
  gis2Url: string;
  workingHoursRu: string;
  workingHoursKz: string;
  deliveryInfoRu: string;
  deliveryInfoKz: string;
  pickupInfoRu: string;
  pickupInfoKz: string;
  currency: string;
  adminPin: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type Language = 'ru' | 'kz';

export type TextScale = 'normal' | 'large' | 'extra';

export interface AccessibilitySettings {
  scale: TextScale;
  highContrast: boolean;
}

export type DeliveryMethod = 'delivery' | 'pickup' | 'post';

export interface DailyAnalytics {
  id: string; // YYYY-MM-DD
  date: string;
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: number;
  mobileVisits: number;
  desktopVisits: number;
  ruVisits: number;
  kzVisits: number;
  productViews?: Record<string, { title: string; count: number }>;
  updatedAt: string;
}

export interface AnalyticsOverview {
  totalVisitsAllTime: number;
  uniqueVisitorsAllTime: number;
  totalPageViewsAllTime: number;
  lastVisitAt?: string;
}

export interface VisitLogItem {
  id: string;
  visitorId: string;
  timestamp: string;
  device: 'mobile' | 'desktop' | 'tablet';
  lang: 'ru' | 'kz';
  page: string;
  referrer?: string;
  isNewVisitor?: boolean;
}
