import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AccessibilitySettings,
  CartItem,
  Category,
  Language,
  Product,
  StoreConfig,
} from './types';
import { CATEGORIES, INITIAL_CONFIG } from './data/storeData';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { BoutiqueStories } from './components/BoutiqueStories';
import { CategoryFilter } from './components/CategoryFilter';
import { SymptomSelector } from './components/SymptomSelector';
import { SmartHealthBundles } from './components/SmartHealthBundles';
import { FeaturedHealthBundleWidget } from './components/FeaturedHealthBundleWidget';
import { RecentlyViewedSection } from './components/RecentlyViewedSection';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { QuickOrderModal } from './components/QuickOrderModal';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { AdminModal } from './components/AdminModal';
import { Footer } from './components/Footer';
import { BottomNav, BottomNavTab } from './components/BottomNav';
import { CatalogDrawer } from './components/CatalogDrawer';
import { CompareBar, CompareModal } from './components/CompareModal';
import { doesProductMatchSymptom, SYMPTOM_GOALS } from './utils/recommendations';
import { scoreProductSearchMatch } from './utils/searchEngine';
import {
  MessageCircle,
  PhoneCall,
  SlidersHorizontal,
  PackageSearch,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  X,
} from 'lucide-react';
import {
  subscribeToProducts,
  subscribeToCategories,
  subscribeToSettings,
  getProductById,
  fetchUniversalCatalog,
  fetchNetworkCatalog,
  isQuotaOrNetworkError,
  recordLocalProductUpsert,
  recordLocalProductDelete,
  recordLocalCategoryUpsert,
  recordLocalCategoryDelete,
  recordLocalSettingsUpdate,
  applyProductsDelta,
  getLocalCatalogDelta,
  getCachedProductsFromLocalStorage,
  saveProductsToLocalStorageCache,
  mergeProductPreservingFields,
  autoSyncLocalProductsIfNeeded,
  PRODUCTS_CACHE_STORAGE_KEY,
} from './services/firestoreService';
import { trackVisit, trackProductView, trackAddToCart } from './services/analyticsService';
import {
  deduplicateProducts,
  extractProductIdFromUrl,
  getProductDirectUrl,
} from './utils/formatters';
import { applyProductSeoMeta, resetStoreSeoMeta } from './utils/seoMeta';

const FALLBACK_PLACEHOLDER_IMAGE = 'photo-1584308666744-24d5c474f2ae';

function hasCustomImage(images?: string[]): boolean {
  return Boolean(
    Array.isArray(images) &&
      images.length > 0 &&
      images[0] &&
      !images[0].includes(FALLBACK_PLACEHOLDER_IMAGE)
  );
}

/**
 * Performs a deep field-by-field comparison between two Product objects
 * to detect any difference in metadata, price, category, stock, badges, or images.
 */
function areProductsDeepEqual(a: Product, b: Product): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.id !== b.id ||
    a.titleRu !== b.titleRu ||
    a.titleKz !== b.titleKz ||
    a.price !== b.price ||
    a.oldPrice !== b.oldPrice ||
    a.categoryId !== b.categoryId ||
    a.inStock !== b.inStock ||
    a.sku !== b.sku ||
    a.isHit !== b.isHit ||
    a.isNew !== b.isNew ||
    a.isSale !== b.isSale ||
    a.descriptionRu !== b.descriptionRu ||
    a.descriptionKz !== b.descriptionKz ||
    a.specsRu !== b.specsRu ||
    a.specsKz !== b.specsKz ||
    a.howToUseRu !== b.howToUseRu ||
    a.howToUseKz !== b.howToUseKz ||
    a.volumeOrWeight !== b.volumeOrWeight ||
    a.country !== b.country
  ) {
    return false;
  }

  const aImgs = a.images || [];
  const bImgs = b.images || [];
  if (aImgs.length !== bImgs.length) return false;
  for (let i = 0; i < aImgs.length; i++) {
    if (aImgs[i] !== bImgs[i]) return false;
  }

  const aBenRu = a.benefitsRu || [];
  const bBenRu = b.benefitsRu || [];
  if (aBenRu.length !== bBenRu.length) return false;
  for (let i = 0; i < aBenRu.length; i++) {
    if (aBenRu[i] !== bBenRu[i]) return false;
  }

  return true;
}

/**
 * Deeply reconciles an incoming Firestore/network product snapshot with the localStorage cache.
 * Guarantees that any newly added, edited, or deleted product in any browser or session forces a
 * deterministic merge and cache refresh across all clients (Chrome, Yandex Browser, iPhone Safari, etc.).
 */
function reconcileProductsWithCache(
  firestoreSnapshot: Product[],
  cachedProducts: Product[]
): { reconciled: Product[]; hasChanges: boolean } {
  const delta = getLocalCatalogDelta();
  const deletedSet = new Set<string>(delta.deletedProductIds || []);

  // Build map starting with cached products (excluding deleted IDs)
  const mergedMap = new Map<string, Product>();
  for (const cached of cachedProducts) {
    if (cached && cached.id && !deletedSet.has(cached.id)) {
      mergedMap.set(cached.id, cached);
    }
  }

  // Merge incoming Firestore/network snapshot with deep field & image preservation
  for (const incoming of firestoreSnapshot) {
    if (!incoming || !incoming.id || deletedSet.has(incoming.id)) continue;
    const existing = mergedMap.get(incoming.id);
    if (!existing) {
      mergedMap.set(incoming.id, incoming);
    } else {
      // Preserve real product images if one of the copies has a compacted placeholder
      const resolvedImages =
        hasCustomImage(incoming.images)
          ? incoming.images
          : hasCustomImage(existing.images)
          ? existing.images
          : incoming.images;

      // Prefer local delta override if explicitly modified locally, otherwise incoming Firestore state wins
      const localUpsert = delta.upsertedProducts?.[incoming.id];
      const merged = localUpsert
        ? {
            ...incoming,
            ...localUpsert,
            images: hasCustomImage(localUpsert.images) ? localUpsert.images : resolvedImages,
          }
        : mergeProductPreservingFields(existing, incoming);

      mergedMap.set(incoming.id, {
        ...merged,
        images: resolvedImages,
      });
    }
  }

  // Apply any remaining delta upserts and deduplicate
  const combined = applyProductsDelta(Array.from(mergedMap.values()), delta);
  const reconciled = deduplicateProducts(combined);

  // Sort deterministically: newest added products first, preserving catalog order
  reconciled.sort((a, b) => {
    const aTime = a.id.startsWith('prod-17') ? Number(a.id.replace('prod-', '')) || 0 : 0;
    const bTime = b.id.startsWith('prod-17') ? Number(b.id.replace('prod-', '')) || 0 : 0;
    if (aTime !== bTime) return bTime - aTime;
    return 0;
  });

  // Deep comparison against cachedProducts to detect if cache invalidation/update is needed
  let hasChanges = reconciled.length !== cachedProducts.length;
  if (!hasChanges) {
    const cachedById = new Map<string, Product>();
    for (const c of cachedProducts) {
      if (c && c.id) cachedById.set(c.id, c);
    }
    for (let i = 0; i < reconciled.length; i++) {
      const rec = reconciled[i];
      const cached = cachedById.get(rec.id);
      if (!cached || cachedProducts[i]?.id !== rec.id || !areProductsDeepEqual(rec, cached)) {
        hasChanges = true;
        break;
      }
    }
  }

  return { reconciled, hasChanges };
}

export default function App() {
  // Config state
  const [config, setConfig] = useState<StoreConfig>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...INITIAL_CONFIG, ...parsed };
        if (!merged.taglineRu || merged.taglineRu === 'Красота. Здоровье. Вера.') {
          merged.taglineRu = INITIAL_CONFIG.taglineRu;
          merged.taglineKz = INITIAL_CONFIG.taglineKz;
        }
        if (
          !merged.subtitleRu ||
          merged.subtitleRu.includes('Премиальные товары для здоровья, красоты и повседневной')
        ) {
          merged.subtitleRu = INITIAL_CONFIG.subtitleRu;
          merged.subtitleKz = INITIAL_CONFIG.subtitleKz;
        }
        return merged;
      }
      return INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  // Helper for tracking deleted categories to prevent resurrection from static defaults
  const getDeletedCategoryIds = (): string[] => {
    try {
      const raw = localStorage.getItem('muslim_shop_deleted_categories');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const addDeletedCategoryId = (id: string) => {
    try {
      const list = getDeletedCategoryIds();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('muslim_shop_deleted_categories', JSON.stringify(list));
      }
    } catch {}
  };

  // Categories state (starts with defaults/cache, gets populated from Firestore)
  const [categories, setCategories] = useState<Category[]>(() => {
    const deletedIds = getDeletedCategoryIds();
    try {
      const saved = localStorage.getItem('muslim_shop_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((c: Category) => !deletedIds.includes(c.id));
        }
      }
      return CATEGORIES.filter((c) => !deletedIds.includes(c.id));
    } catch {
      return CATEGORIES.filter((c) => !deletedIds.includes(c.id));
    }
  });

  // Products state (loads immediately from localStorage cache + local delta, then syncs with server & Firestore)
  const [products, setProducts] = useState<Product[]>(() => {
    const cachedProds = getCachedProductsFromLocalStorage();
    return cachedProds.length > 0 ? deduplicateProducts(cachedProds) : [];
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(() => {
    return getCachedProductsFromLocalStorage().length === 0;
  });
  const [visibleLimit, setVisibleLimit] = useState<number>(24);

  // Language state
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_lang');
      return (saved as Language) || 'ru';
    } catch {
      return 'ru';
    }
  });

  // Accessibility state (Font scale & Contrast)
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_accessibility');
      return saved ? JSON.parse(saved) : { scale: 'normal', highContrast: false };
    } catch {
      return { scale: 'normal', highContrast: false };
    }
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorites state
  const [favorites, setFavorites] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Recently Viewed state (up to 12 products)
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_recently_viewed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Comparison state (up to 3 products)
  const [compareList, setCompareList] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_compare');
      return saved ? JSON.parse(saved).slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  // Filtering & Search state (supports ?category= from sitemap.xml & search engines)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      return catParam ? catParam.trim() : 'cat-all';
    } catch {
      return 'cat-all';
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSymptom, setSelectedSymptom] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'priceAsc' | 'priceDesc'>('popular');
  const [cardViewMode, setCardViewMode] = useState<'large' | 'compact'>('large');

  // Modals state
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedProductForQuickOrder, setSelectedProductForQuickOrder] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [bottomDrawerMode, setBottomDrawerMode] = useState<'catalog' | 'contact' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDirectProductLoading, setIsDirectProductLoading] = useState<boolean>(false);
  const isExitGuardArmedRef = useRef<boolean>(false);

  // 1. Subscribe to Firestore & Universal Server Catalog Products with Deep Cache Reconciliation
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsLoadingProducts(false);
    }, 15000);

    const applyAndReconcileSnapshot = (incomingSnapshot: Product[]) => {
      const cachedProducts = getCachedProductsFromLocalStorage();
      const { reconciled, hasChanges } = reconcileProductsWithCache(
        incomingSnapshot,
        cachedProducts
      );

      if (hasChanges) {
        saveProductsToLocalStorageCache(reconciled);
      }

      setProducts((prev) => {
        if (prev.length !== reconciled.length) return reconciled;
        for (let i = 0; i < reconciled.length; i++) {
          if (!areProductsDeepEqual(prev[i], reconciled[i])) {
            return reconciled;
          }
        }
        return prev;
      });
      setIsLoadingProducts(false);
    };

    // Fast-path: immediately fetch server catalog or static snapshot so products appear at 0-20ms
    fetch('/api/catalog')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.products) && data.products.length > 0) {
          applyAndReconcileSnapshot(data.products);
        }
      })
      .catch(() => {
        fetch('./catalog-snapshot.json')
          .then((r) => (r.ok ? r.json() : null))
          .then((snap) => {
            if (snap && Array.isArray(snap.products) && snap.products.length > 0) {
              applyAndReconcileSnapshot(snap.products);
            }
          })
          .catch(() => {});
      });

    const unsubscribe = subscribeToProducts(
      (firestoreProducts) => {
        clearTimeout(fallbackTimer);
        applyAndReconcileSnapshot(firestoreProducts);
      },
      (error) => {
        clearTimeout(fallbackTimer);
        if (isQuotaOrNetworkError(error)) {
          console.warn('Firestore notice: operating via fallback catalog.');
        } else {
          console.warn('Could not load products from Firestore:', error);
        }
        setIsLoadingProducts(false);
      }
    );

    // Cross-tab & cross-session synchronization when localStorage changes or window regains focus
    const handleStorageSync = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key === PRODUCTS_CACHE_STORAGE_KEY ||
        e.key === 'muslim_shop_products' ||
        e.key === 'muslim_shop_catalog_delta_v6' ||
        e.key === 'muslim_shop_catalog_delta_v2'
      ) {
        const latestCached = getCachedProductsFromLocalStorage();
        if (latestCached.length > 0) {
          applyAndReconcileSnapshot(latestCached);
        }
      }
    };

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const freshCatalog = await fetchNetworkCatalog();
        if (freshCatalog && freshCatalog.products.length > 0) {
          applyAndReconcileSnapshot(freshCatalog.products);
        } else {
          const universal = await fetchUniversalCatalog();
          if (universal && universal.products.length > 0) {
            applyAndReconcileSnapshot(universal.products);
          }
        }
      } catch {}
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // 2. Subscribe to Firestore Categories
  useEffect(() => {
    const unsubscribe = subscribeToCategories((firestoreCategories) => {
      const deletedIds = getDeletedCategoryIds();
      const catMap = new Map<string, Category>();

      if (firestoreCategories.length > 0) {
        firestoreCategories.forEach((fc) => {
          if (!deletedIds.includes(fc.id)) {
            catMap.set(fc.id, fc);
          }
        });
      } else {
        CATEGORIES.filter((c) => !deletedIds.includes(c.id)).forEach((c) =>
          catMap.set(c.id, c)
        );
      }

      // Ensure "cat-all" is the first category
      const allCat: Category = catMap.get('cat-all') || {
        id: 'cat-all',
        nameRu: 'Все товары',
        nameKz: 'Барлық өнімдер',
        icon: '✨',
        order: 0,
      };
      catMap.delete('cat-all');

      const otherCats = Array.from(catMap.values()).sort((a, b) => a.order - b.order);
      const merged = [allCat, ...otherCats];

      setCategories(merged);
      try {
        localStorage.setItem('muslim_shop_categories', JSON.stringify(merged));
      } catch {}
    });

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Firestore Store Settings
  useEffect(() => {
    const unsubscribe = subscribeToSettings(INITIAL_CONFIG, (firestoreConfig) => {
      setConfig((prev) => ({ ...prev, ...firestoreConfig }));
    });

    return () => unsubscribe();
  }, []);

  // Sync state with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('muslim_shop_config', JSON.stringify(config));
    } catch (e) {
      console.warn(e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('muslim_shop_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn(e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('muslim_shop_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn(e);
    }
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('muslim_shop_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('muslim_shop_accessibility', JSON.stringify(accessibility));
  }, [accessibility]);

  // Helper to match targetId against products array with high tolerance
  const findProductMatch = useCallback((list: Product[], targetId: string): Product | undefined => {
    if (!targetId || !Array.isArray(list) || list.length === 0) return undefined;
    const clean = targetId.trim().toLowerCase();

    // 1. Strict ID match or case-insensitive match
    let found = list.find((p) => p.id === targetId || p.id.toLowerCase() === clean);
    if (found) return found;

    // 2. SKU match
    found = list.find((p) => p.sku && (p.sku === targetId || p.sku.toLowerCase() === clean));
    if (found) return found;

    // 3. Match without prefix 'prod-'
    const cleanNoPrefix = clean.replace(/^prod-/, '');
    found = list.find((p) => p.id.toLowerCase().replace(/^prod-/, '') === cleanNoPrefix);
    if (found) return found;

    // 4. Match SKU numeric part
    const numPart = clean.replace(/^[a-z]+-?/i, '');
    if (numPart && numPart.length >= 3) {
      found = list.find((p) => p.sku && p.sku.toLowerCase().endsWith(numPart));
      if (found) return found;
    }

    return undefined;
  }, []);

  // Deep linking: Automatically open product detail modal if URL has ?p=prod-id or #prod-id
  useEffect(() => {
    let isCancelled = false;

    const resolveDirectLink = async () => {
      const targetId = extractProductIdFromUrl();
      if (!targetId) {
        // If there is no targetId in URL (e.g. user navigated Back via browser button), close detail modal
        setSelectedProductForDetail((curr) => (curr ? null : curr));
        return;
      }

      // 1. Check if already loaded in current state
      const existing = findProductMatch(products, targetId);
      if (existing) {
        setSelectedProductForDetail(existing);
        applyProductSeoMeta(existing, config, lang);
        return;
      }

      // 2. Check cached products in localStorage
      try {
        const cachedRaw = localStorage.getItem('muslim_shop_products_cache') || localStorage.getItem('muslim_shop_products');
        if (cachedRaw) {
          const cachedList = JSON.parse(cachedRaw);
          const cachedMatch = findProductMatch(cachedList, targetId);
          if (cachedMatch) {
            setSelectedProductForDetail(cachedMatch);
            applyProductSeoMeta(cachedMatch, config, lang);
            return;
          }
        }
      } catch {}

      // 3. Directly fetch single document from Firestore by ID or SKU
      setIsDirectProductLoading(true);
      try {
        const directProd = await getProductById(targetId);
        if (isCancelled) return;

        if (directProd) {
          setSelectedProductForDetail(directProd);
          applyProductSeoMeta(directProd, config, lang);

          // Also inject into products list if not yet included so catalog renders it
          setProducts((prev) => {
            if (prev.some((p) => p.id === directProd.id)) return prev;
            return [directProd, ...prev];
          });
        } else {
          // If products collection is still loading, wait; otherwise notify user
          if (!isLoadingProducts) {
            setToastMessage(
              lang === 'kz'
                ? 'Өнім сілтемесі бойынша табылмады немесе сатылымнан алынды'
                : 'Товар по ссылке не найден или был снят с продажи'
            );
            setTimeout(() => setToastMessage(null), 4000);
          }
        }
      } catch (err) {
        console.error('Direct link resolution error:', err);
      } finally {
        if (!isCancelled) {
          setIsDirectProductLoading(false);
        }
      }
    };

    resolveDirectLink();

    const handleUrlChange = () => {
      resolveDirectLink();
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      isCancelled = true;
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [products, isLoadingProducts, lang, config.storeName, findProductMatch]);

  // Track visitor traffic safely
  useEffect(() => {
    trackVisit({ page: 'Каталог бутика', lang, isInitialLoad: true });
  }, []);

  const recordRecentlyViewed = useCallback((product: Product) => {
    if (!product || !product.id) return;
    setRecentlyViewed((prev) => {
      const next = [product, ...prev.filter((p) => p.id !== product.id)].slice(0, 12);
      try {
        localStorage.setItem('muslim_shop_recently_viewed', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleRemoveRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewed((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      try {
        localStorage.setItem('muslim_shop_recently_viewed', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleClearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    try {
      localStorage.setItem('muslim_shop_recently_viewed', JSON.stringify([]));
    } catch {}
    showToast(
      lang === 'kz'
        ? 'Қарау тарихы тазартылды'
        : 'История просмотренных товаров очищена'
    );
  }, [lang]);

  const handleOpenDetail = (product: Product) => {
    setSelectedProductForDetail(product);
    recordRecentlyViewed(product);
    trackProductView(product.id, product.titleRu);
    applyProductSeoMeta(product, config, lang);
    try {
      const targetUrl = getProductDirectUrl(product.id);
      window.history.pushState({ productId: product.id }, '', targetUrl);
    } catch {}
  };

  const handleCloseDetail = useCallback(() => {
    setSelectedProductForDetail(null);
    resetStoreSeoMeta(config, lang);
    try {
      const url = new URL(window.location.href);
      ['p', 'product', 'prod', 'id', 'sku', 'item'].forEach((k) => url.searchParams.delete(k));
      const cleanPath = url.pathname + (url.search ? url.search : '');
      window.history.replaceState({ muslimShopGuard: true }, '', cleanPath);
    } catch {}
  }, [config, lang]);

  // Ensure store-level SEO meta tags are restored whenever no product detail modal is open
  useEffect(() => {
    if (!selectedProductForDetail) {
      resetStoreSeoMeta(config, lang);
    }
  }, [selectedProductForDetail, config, lang]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Keep a ref of current navigation/modal states for the mobile hardware Back-button (popstate) handler
  const navStateRef = useRef({
    selectedProductForQuickOrder,
    selectedProductForDetail,
    isCompareOpen,
    isCartOpen,
    isFavoritesOpen,
    bottomDrawerMode,
    isAdminOpen,
    selectedCategoryId,
    selectedSymptom,
    searchQuery,
    lang,
  });

  useEffect(() => {
    navStateRef.current = {
      selectedProductForQuickOrder,
      selectedProductForDetail,
      isCompareOpen,
      isCartOpen,
      isFavoritesOpen,
      bottomDrawerMode,
      isAdminOpen,
      selectedCategoryId,
      selectedSymptom,
      searchQuery,
      lang,
    };
  }, [
    selectedProductForQuickOrder,
    selectedProductForDetail,
    isCompareOpen,
    isCartOpen,
    isFavoritesOpen,
    bottomDrawerMode,
    isAdminOpen,
    selectedCategoryId,
    selectedSymptom,
    searchQuery,
    lang,
  ]);

  // Push a protective history state whenever a modal/drawer or category filter is opened
  useEffect(() => {
    const hasOverlayOrFilter =
      Boolean(selectedProductForQuickOrder) ||
      Boolean(selectedProductForDetail) ||
      isCompareOpen ||
      isCartOpen ||
      isFavoritesOpen ||
      bottomDrawerMode !== null ||
      isAdminOpen ||
      selectedCategoryId !== 'cat-all' ||
      selectedSymptom !== 'all';

    if (hasOverlayOrFilter) {
      try {
        if (!window.history.state?.muslimShopGuard && !window.history.state?.productId) {
          window.history.pushState({ muslimShopGuard: true }, '');
        }
      } catch {}
    }
  }, [
    selectedProductForQuickOrder,
    selectedProductForDetail,
    isCompareOpen,
    isCartOpen,
    isFavoritesOpen,
    bottomDrawerMode,
    isAdminOpen,
    selectedCategoryId,
    selectedSymptom,
  ]);

  // Mobile Back-button & Accidental Exit Protection on Main Page
  useEffect(() => {
    const armHistoryGuard = () => {
      if (isExitGuardArmedRef.current) return;
      try {
        window.history.pushState({ muslimShopGuard: true }, '');
        isExitGuardArmedRef.current = true;
      } catch {}
    };

    // Arm on mount and on first user touch/click (required by mobile browsers to trap hardware Back)
    armHistoryGuard();
    const handleUserGesture = () => {
      armHistoryGuard();
    };
    window.addEventListener('touchstart', handleUserGesture, { passive: true, once: true });
    window.addEventListener('click', handleUserGesture, { passive: true, once: true });

    const handleMobileBackNavigation = () => {
      const st = navStateRef.current;
      const rePushGuard = () => {
        try {
          window.history.pushState({ muslimShopGuard: true }, '');
          isExitGuardArmedRef.current = true;
        } catch {}
      };

      // 1. Close QuickOrderModal if open
      if (st.selectedProductForQuickOrder) {
        setSelectedProductForQuickOrder(null);
        rePushGuard();
        return;
      }

      // 2. Close ProductDetailModal if open
      if (st.selectedProductForDetail) {
        handleCloseDetail();
        rePushGuard();
        return;
      }

      // 3. Close CompareModal if open
      if (st.isCompareOpen) {
        setIsCompareOpen(false);
        rePushGuard();
        return;
      }

      // 4. Close CartDrawer if open
      if (st.isCartOpen) {
        setIsCartOpen(false);
        rePushGuard();
        return;
      }

      // 5. Close FavoritesDrawer if open
      if (st.isFavoritesOpen) {
        setIsFavoritesOpen(false);
        rePushGuard();
        return;
      }

      // 6. Close Catalog/Contact Bottom Drawer if open
      if (st.bottomDrawerMode !== null) {
        setBottomDrawerMode(null);
        rePushGuard();
        return;
      }

      // 7. Close AdminModal if open
      if (st.isAdminOpen) {
        setIsAdminOpen(false);
        rePushGuard();
        return;
      }

      // 8. Reset active category, symptom, or search filter back to main catalog ("Все товары")
      if (
        st.selectedCategoryId !== 'cat-all' ||
        st.selectedSymptom !== 'all' ||
        st.searchQuery.trim() !== ''
      ) {
        setSelectedCategoryId('cat-all');
        setSelectedSymptom('all');
        setSearchQuery('');
        rePushGuard();
        showToast(
          st.lang === 'kz'
            ? 'Барлық өнімдерге оралдыңыз'
            : 'Возврат ко всем товарам'
        );
        return;
      }

      // 9. If scrolled down on the main page, scroll smoothly back to top first
      if (window.scrollY > 350) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        rePushGuard();
        return;
      }
    };

    window.addEventListener('popstate', handleMobileBackNavigation);
    return () => {
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('popstate', handleMobileBackNavigation);
    };
  }, [handleCloseDetail, showToast]);

  // Cart handlers
  const handleAddToCart = (product: Product) => {
    let currentQty = 1;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      currentQty = existing ? existing.quantity + 1 : 1;
      const next = existing
        ? prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prev, { product, quantity: 1 }];
      try {
        localStorage.setItem('muslim_shop_cart', JSON.stringify(next));
      } catch {}
      return next;
    });

    const title = lang === 'kz' && product.titleKz?.trim() ? product.titleKz : product.titleRu;
    trackAddToCart(product.id, title);
    showToast(
      lang === 'kz'
        ? `🛒 «${title}» себетке қосылды (${currentQty} дана)!`
        : `🛒 «${title}» добавлен в корзину (${currentQty} шт.)!`
    );
  };

  const handleAddBundleToCart = (bundleProducts: Product[], bundleTitle: string) => {
    if (!bundleProducts || bundleProducts.length === 0) return;
    setCart((prev) => {
      const next = [...prev];
      bundleProducts.forEach((product) => {
        const idx = next.findIndex((item) => item.product.id === product.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        } else {
          next.push({ product, quantity: 1 });
        }
      });
      try {
        localStorage.setItem('muslim_shop_cart', JSON.stringify(next));
      } catch {}
      return next;
    });

    showToast(
      lang === 'kz'
        ? `✨ «${bundleTitle}» жиынтығы себетке қосылды (-10% жеңілдікпен)!`
        : `✨ Курс «${bundleTitle}» (${bundleProducts.length} шт.) добавлен в корзину со скидкой -10%!`
    );
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      try {
        localStorage.setItem('muslim_shop_cart', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const next = prev.filter((item) => item.product.id !== productId);
      try {
        localStorage.setItem('muslim_shop_cart', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(
      lang === 'kz'
        ? 'Тауар себеттен өшірілді'
        : 'Товар удален из корзины'
    );
  };

  const handleClearCart = () => {
    setCart([]);
    try {
      localStorage.setItem('muslim_shop_cart', JSON.stringify([]));
    } catch {}
    showToast(
      lang === 'kz'
        ? 'Себет тазартылды'
        : 'Корзина очищена'
    );
  };

  // Favorites handlers
  const handleToggleFavorite = (product: Product) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        showToast(
          lang === 'kz'
            ? 'Таңдаулылардан алынды'
            : 'Удалено из избранного'
        );
        return prev.filter((p) => p.id !== product.id);
      } else {
        showToast(
          lang === 'kz'
            ? 'Таңдаулыларға сақталды'
            : 'Сохранено в избранное'
        );
        return [...prev, product];
      }
    });
  };

  // Compare handlers (up to 3 products)
  useEffect(() => {
    try {
      localStorage.setItem('muslim_shop_compare', JSON.stringify(compareList));
    } catch {}
  }, [compareList]);

  // Keep selectedProductForDetail and compareList synced with latest product descriptions/fields
  useEffect(() => {
    if (products.length === 0) return;
    const byId = new Map<string, Product>();
    products.forEach((p) => byId.set(p.id, p));

    setSelectedProductForDetail((prev) => {
      if (!prev) return prev;
      const fresh = byId.get(prev.id);
      if (fresh && !areProductsDeepEqual(prev, fresh)) {
        return fresh;
      }
      return prev;
    });

    setCompareList((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((item) => {
        const fresh = byId.get(item.id);
        if (fresh && !areProductsDeepEqual(item, fresh)) {
          changed = true;
          return fresh;
        }
        return item;
      });
      return changed ? next : prev;
    });

    setRecentlyViewed((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev
        .map((item) => {
          const fresh = byId.get(item.id);
          if (fresh) {
            if (!areProductsDeepEqual(item, fresh)) changed = true;
            return fresh;
          }
          return item;
        })
        .filter((item) => byId.has(item.id));
      if (next.length !== prev.length) changed = true;
      if (changed) {
        try {
          localStorage.setItem('muslim_shop_recently_viewed', JSON.stringify(next));
        } catch {}
      }
      return changed ? next : prev;
    });
  }, [products]);

  const handleToggleCompare = (product: Product) => {
    setCompareList((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev;
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), product];
      }
      return [...prev, product];
    });
    setIsCompareOpen(true);
  };

  // Product Counts for categories
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = { 'cat-all': products.length };
    products.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
      if (p.isHit) counts['cat-hits'] = (counts['cat-hits'] || 0) + 1;
      if (p.isNew) counts['cat-new'] = (counts['cat-new'] || 0) + 1;
    });
    return counts;
  }, [products]);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    const hasQuery = Boolean(searchQuery.trim());
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategoryId === 'cat-hits') {
          if (!p.isHit) return false;
        } else if (selectedCategoryId === 'cat-new') {
          if (!p.isNew) return false;
        } else if (selectedCategoryId !== 'cat-all' && p.categoryId !== selectedCategoryId) {
          return false;
        }

        // Symptom / Health Goal filter
        if (selectedSymptom !== 'all' && !doesProductMatchSymptom(p, selectedSymptom)) {
          return false;
        }

        // Smart Search query filter (matches titles, categories, benefits, specs, SKU & synonyms)
        if (hasQuery) {
          return scoreProductSearchMatch(p, searchQuery, categoriesMap) > 0;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceAsc') return a.price - b.price;
        if (sortBy === 'priceDesc') return b.price - a.price;

        if (hasQuery) {
          const scoreDiff =
            scoreProductSearchMatch(b, searchQuery, categoriesMap) -
            scoreProductSearchMatch(a, searchQuery, categoriesMap);
          if (scoreDiff !== 0) return scoreDiff;
        }

        // Default "popular" sorting:
        // 1. First priority: Hits of sales (isHit)
        if (a.isHit && !b.isHit) return -1;
        if (!a.isHit && b.isHit) return 1;

        // 2. Second priority: Newest products first (by createdAt or ID timestamp)
        const timeA = a.createdAt || (a.id.startsWith('prod-') ? a.id.replace('prod-', '') : '');
        const timeB = b.createdAt || (b.id.startsWith('prod-') ? b.id.replace('prod-', '') : '');
        return timeB.localeCompare(timeA);
      });
  }, [products, selectedCategoryId, selectedSymptom, searchQuery, sortBy, categoriesMap]);

  const scrollToCatalog = useCallback(() => {
    const performScroll = () => {
      const el = document.getElementById('catalog-section');
      if (!el) return;
      const headerEl = document.getElementById('main-header');
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 72;
      const rect = el.getBoundingClientRect();
      const targetTop = Math.max(0, rect.top + window.scrollY - headerHeight - 8);
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    };
    requestAnimationFrame(() => {
      performScroll();
      setTimeout(performScroll, 80);
    });
  }, []);

  const handleSelectCategoryAndScroll = useCallback(
    (catId: string) => {
      setSelectedCategoryId(catId);
      setSelectedSymptom('all');
      scrollToCatalog();
    },
    [scrollToCatalog]
  );

  const handleSelectSymptomAndScroll = useCallback(
    (symId: string) => {
      setSelectedSymptom(symId);
      if (symId !== 'all') {
        setSelectedCategoryId('cat-all');
      }
      scrollToCatalog();
    },
    [scrollToCatalog]
  );

  // Progressive rendering: render first 24 cards immediately for instant paint, then mount the rest smoothly
  useEffect(() => {
    if (filteredProducts.length <= 24) {
      setVisibleLimit(filteredProducts.length || 24);
      return;
    }
    setVisibleLimit(24);
    const timer = setTimeout(() => {
      setVisibleLimit(filteredProducts.length);
    }, 40);
    return () => clearTimeout(timer);
  }, [filteredProducts.length, selectedCategoryId, searchQuery, sortBy]);

  return (
    <div
      id="app-root"
      className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col pb-20 sm:pb-[74px] transition-colors bg-[#f4f5f7] text-slate-800 text-base sm:text-[17px] leading-relaxed selection:bg-emerald-600 selection:text-white"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-sm sm:text-base font-bold flex items-center gap-3"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading banner when opening a direct link from Instagram Story or WhatsApp */}
      {isDirectProductLoading && !selectedProductForDetail && (
        <div
          id="direct-product-loader"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-sm sm:text-base font-bold flex items-center gap-3"
        >
          <Loader2 className="w-5 h-5 text-[#C5A059] animate-spin shrink-0" />
          <span>{lang === 'kz' ? 'Өнім жүктелуде...' : 'Загружаем товар по ссылке...'}</span>
        </div>
      )}

      {/* Header */}
      <Header
        config={config}
        lang={lang}
        onLanguageChange={setLang}
        accessibility={accessibility}
        onAccessibilityChange={setAccessibility}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        products={products}
        categories={categories}
        productCounts={productCounts}
        onSelectCategory={handleSelectCategoryAndScroll}
        onSelectSymptom={handleSelectSymptomAndScroll}
        onOpenProduct={handleOpenDetail}
        onAddToCart={handleAddToCart}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        favoritesCount={favorites.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenCatalog={() => setBottomDrawerMode('catalog')}
      />

      {/* Hero Banner with Islamic Elegance & Boutique Highlights */}
      <HeroBanner
        config={config}
        lang={lang}
        onScrollToCatalog={scrollToCatalog}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategoryAndScroll}
      />

      {/* 8. Quick View Boutique Stories Bar right on the website */}
      <BoutiqueStories
        products={products}
        config={config}
        lang={lang}
        onOpenProduct={handleOpenDetail}
        onAddToCart={handleAddToCart}
        onSelectCategory={handleSelectCategoryAndScroll}
      />

      {/* 9. Dynamic Interactive Bundle Showcase: «Польза в комплексе» (-10%) */}
      {selectedCategoryId === 'cat-all' && searchQuery.trim() === '' && (
        <FeaturedHealthBundleWidget
          products={products}
          config={config}
          lang={lang}
          onOpenProduct={handleOpenDetail}
          onAddBundleToCart={handleAddBundleToCart}
        />
      )}

      {/* Category Nav Filter — All visible side-by-side without horizontal scrolling */}
      <CategoryFilter
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategoryAndScroll}
        lang={lang}
        productCounts={productCounts}
        onOpenAdminCategories={() => setIsAdminOpen(true)}
      />

      {/* 2. Smart Product Selector by Symptom / Health Goal («Что вас беспокоит?») — Hidden when a specific category is selected so products appear immediately */}
      {selectedCategoryId === 'cat-all' && (
        <SymptomSelector
          products={products}
          selectedSymptom={selectedSymptom}
          onSelectSymptom={handleSelectSymptomAndScroll}
          lang={lang}
          accessibility={accessibility}
        />
      )}

      {/* Main Catalog Content */}
      <main id="catalog-section" className="scroll-mt-24 max-w-7xl mx-auto px-4 py-7 sm:py-12 flex-1 w-full">
        {/* Active Filter / Search Back & Close Bar */}
        {(selectedCategoryId !== 'cat-all' || selectedSymptom !== 'all' || searchQuery.trim() !== '') && (
          <div
            id="catalog-active-filter-bar"
            className="mb-4 p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5 shadow-xs"
          >
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId('cat-all');
                setSelectedSymptom('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                {lang === 'kz'
                  ? `Артқа • Барлық өнімдерге оралу (${products.length})`
                  : `Назад ко всем товарам (${products.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId('cat-all');
                setSelectedSymptom('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{lang === 'kz' ? 'Сүзгіні жабу' : 'Сбросить / Закрыть'}</span>
            </button>
          </div>
        )}

        {/* Title & Sorting Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h2 className="font-sans font-black text-xl sm:text-3xl text-slate-900 flex items-center gap-2.5 flex-wrap tracking-tight leading-tight">
              <span>
                {selectedSymptom !== 'all' && SYMPTOM_GOALS.find((g) => g.id === selectedSymptom)
                  ? lang === 'kz'
                    ? SYMPTOM_GOALS.find((g) => g.id === selectedSymptom)?.titleKz
                    : SYMPTOM_GOALS.find((g) => g.id === selectedSymptom)?.titleRu
                  : categories.find((c) => c.id === selectedCategoryId)
                  ? lang === 'kz' && categories.find((c) => c.id === selectedCategoryId)?.nameKz
                    ? categories.find((c) => c.id === selectedCategoryId)?.nameKz
                    : categories.find((c) => c.id === selectedCategoryId)?.nameRu
                  : lang === 'kz'
                  ? 'Барлық өнімдер'
                  : 'Все товары'}
              </span>
              <span className="text-xs sm:text-sm font-mono tabular-nums px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {filteredProducts.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              {lang === 'kz'
                ? 'Атыраудағы Бутик №24 сөрелеріндегі түпнұсқа өнімдер'
                : 'Оригинальные сертифицированные товары в наличии в Бутике №24'}
            </p>
          </div>

          {/* Controls: View Mode + Sort selector */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* View Mode Toggle: Large cards (1-col on mobile) vs Compact (2-col) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs font-bold text-slate-700">
              <button
                type="button"
                id="view-mode-large-btn"
                onClick={() => setCardViewMode('large')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  cardViewMode === 'large'
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={lang === 'kz' ? 'Ірі карточкалар' : 'Крупные карточки'}
              >
                <span>{lang === 'kz' ? 'Ірі' : 'Крупно'}</span>
              </button>
              <button
                type="button"
                id="view-mode-compact-btn"
                onClick={() => setCardViewMode('compact')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  cardViewMode === 'compact'
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={lang === 'kz' ? 'Ықшам тор' : 'Сетка'}
              >
                <span>{lang === 'kz' ? 'Тор' : 'Сетка'}</span>
              </button>
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <select
                id="sort-products-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs sm:text-sm font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] cursor-pointer shadow-xs"
              >
                <option value="popular">{lang === 'kz' ? 'Танымалдығы бойынша' : 'Сначала популярные'}</option>
                <option value="priceAsc">{lang === 'kz' ? 'Арзаннан қымбатқа' : 'Сначала недорогие'}</option>
                <option value="priceDesc">{lang === 'kz' ? 'Қымбаттан арзанға' : 'Сначала премиум'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Spinner during initial fetch */}
        {isLoadingProducts && products.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <p className="text-slate-600 font-semibold text-sm">
              {lang === 'kz' ? 'Өнімдер жүктелуде...' : 'Загрузка товаров из каталога...'}
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div id="catalog-empty-state" className="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-6 my-6 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto">
              <PackageSearch className="w-7 h-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              {lang === 'kz' ? 'Өнімдер табылмады' : 'Товары не найдены'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {lang === 'kz'
                ? 'Іздеу сұранысын өзгертіп көріңіз немесе басқа санатты таңдаңыз'
                : 'Попробуйте изменить запрос в строке поиска или выберите другую категорию'}
            </p>
            <button
              onClick={async () => {
                setSearchQuery('');
                setSelectedCategoryId('cat-all');
                setSelectedSymptom('all');
                if (products.length === 0) {
                  setIsLoadingProducts(true);
                  const cat = await fetchUniversalCatalog();
                  if (cat && cat.products.length > 0) {
                    setProducts(deduplicateProducts(cat.products));
                  }
                  setIsLoadingProducts(false);
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              {products.length === 0
                ? lang === 'kz'
                  ? 'Каталогты қайта жүктеу'
                  : 'Обновить каталог'
                : lang === 'kz'
                ? 'Барлық өнімдерді көрсету'
                : 'Сбросить фильтры'}
            </button>
          </div>
        ) : (
          <div
            id="products-grid"
            className={
              cardViewMode === 'large'
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-8 mt-7'
                : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5 sm:gap-6 mt-7'
            }
          >
            {filteredProducts.slice(0, visibleLimit).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                accessibility={accessibility}
                isLargeView={cardViewMode === 'large'}
                isFavorite={favorites.some((f) => f.id === product.id)}
                isInCart={cart.some((c) => c.product.id === product.id)}
                isInCompare={compareList.some((c) => c.id === product.id)}
                onToggleFavorite={handleToggleFavorite}
                onToggleCompare={handleToggleCompare}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onOpenDetail={handleOpenDetail}
                onQuickOrder={setSelectedProductForQuickOrder}
                onShareFeedback={showToast}
              />
            ))}
          </div>
        )}
      </main>

      {/* Smart Curated Health Courses & Bundles with 10% Discount */}
      <SmartHealthBundles
        products={products}
        config={config}
        lang={lang}
        selectedSymptom={selectedSymptom}
        onOpenProduct={handleOpenDetail}
        onAddBundleToCart={handleAddBundleToCart}
      />

      {/* Recently Viewed Products Strip */}
      <RecentlyViewedSection
        items={recentlyViewed}
        cartProductIds={new Set(cart.map((c) => c.product.id))}
        lang={lang}
        onOpenProduct={handleOpenDetail}
        onAddToCart={handleAddToCart}
        onRemoveItem={handleRemoveRecentlyViewed}
        onClearAll={handleClearRecentlyViewed}
      />

      {/* Floating Action Buttons for Desktop: WhatsApp & Phone quick call (above bottom nav) */}
      <div id="floating-actions" className="hidden md:flex fixed bottom-22 right-5 z-40 flex-col gap-2.5">
        <a
          id="floating-whatsapp-btn"
          href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
            lang === 'kz'
              ? 'Сәлеметсіз бе! Маған MUSLIM SHOP бойынша кеңес керек еді.'
              : 'Здравствуйте! Мне нужна консультация по ассортименту MUSLIM SHOP.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all border border-emerald-400/40"
          title="Написать в WhatsApp менеджеру"
        >
          <MessageCircle className="w-6 h-6" />
        </a>

        <a
          id="floating-call-btn"
          href={`tel:+${config.whatsappNumber}`}
          className="w-13 h-13 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center shadow-lg hover:scale-105 transition-all"
          title="Позвонить в Бутик №24"
        >
          <PhoneCall className="w-6 h-6" />
        </a>
      </div>

      {/* SEO Text Block before Footer */}
      <section
        id="seo-about-section"
        aria-label="О магазине MUSLIM SHOP в Атырау"
        className="w-full border-t border-slate-200 bg-[#f4f5f7] text-slate-700 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="rounded-2xl p-5 sm:p-8 bg-white border border-slate-200/90 shadow-xs">
            <h2 className="font-sans font-bold text-lg sm:text-2xl text-slate-900 mb-4 leading-snug">
              MUSLIM SHOP — купить халяль витамины в Атырау, товары iHerb и натуральные БАДы (Бутик №24)
            </h2>
            <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-slate-600">
              <p>
                В <strong className="text-slate-900">MUSLIM SHOP</strong> в Атырау вы можете <strong className="text-[#0567BA]">купить халяль витамины в Атырау</strong>, оригинальные витамины <strong className="text-[#0567BA]">iHerb</strong>, сертифицированные <strong className="text-[#0567BA]">БАДы</strong> для мужского и женского здоровья, натуральный мёд, масло чёрного тмина, товары для хиджамы и стойкие мусульманские ароматы (миски). Мы находимся в удобной локации: <strong className="text-slate-900">г. Атырау, ТД «Дина Байзар», Бутик №24</strong>. Все представленные в каталоге позиции проходят строгий отбор качества и соответствуют стандартам Халяль.
              </p>
              <p>
                В нашем ассортименте собраны проверенные комплексы и <strong className="text-[#0567BA]">БАДы</strong> мировых брендов <strong className="text-[#0567BA]">iHerb</strong> (Now Foods, California Gold Nutrition, Solgar, Swanson, Life-flo, ChildLife), натуральные травяные пасты, эпимедиумные и медовые сборы, средства для укрепления иммунитета, суставов, красоты кожи и роста волос. Если вы ищете, где выгодно <strong className="text-[#0567BA]">купить халяль витамины в Атырау</strong> без ожидания долгой зарубежной пересылки — в <strong className="text-slate-900">Бутике №24</strong> самые востребованные товары уже в наличии на полках.
              </p>
              <p>
                Наш магазин работает для вас <strong className="text-slate-900">ежедневно с 10:00 до 19:00</strong>. Вы можете оформить заказ прямо на сайте <strong className="text-[#0567BA]">muslimshop.kz</strong> или через WhatsApp в 1 клик: действует оперативная курьерская доставка по городу Атырау в день обращения, удобный самовывоз из <strong className="text-slate-900">Бутика №24</strong>, а также быстрая и надёжная <strong className="text-[#0567BA]">доставка по Казахстану</strong> (Казпочта, СДЭК и курьерские службы во все регионы РК).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (NO Telegram) */}
      <Footer config={config} lang={lang} onOpenAdmin={() => setIsAdminOpen(true)} />

      {/* Modals & Drawers */}

      {/* 1. Full-Screen Zoomable Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          allProducts={products}
          config={config}
          lang={lang}
          onLanguageChange={setLang}
          accessibility={accessibility}
          isFavorite={favorites.some((f) => f.id === selectedProductForDetail.id)}
          cartQuantity={
            cart.find((c) => c.product.id === selectedProductForDetail.id)?.quantity || 0
          }
          onToggleFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
          onQuickOrder={setSelectedProductForQuickOrder}
          onSelectProduct={handleOpenDetail}
          onOpenCart={() => setIsCartOpen(true)}
          onClose={handleCloseDetail}
        />
      )}

      {/* 2. 1-Click Quick Order Modal */}
      {selectedProductForQuickOrder && (
        <QuickOrderModal
          product={selectedProductForQuickOrder}
          config={config}
          lang={lang}
          onClose={() => setSelectedProductForQuickOrder(null)}
        />
      )}

      {/* 3. Cart Drawer with WhatsApp Order & Recommendations */}
      {isCartOpen && (
        <CartDrawer
          items={cart}
          allProducts={products}
          recentlyViewed={recentlyViewed}
          config={config}
          lang={lang}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onAddToCart={handleAddToCart}
          onOpenDetail={handleOpenDetail}
          onClearCart={handleClearCart}
          onClose={() => setIsCartOpen(false)}
        />
      )}

      {/* Floating Comparison Bar & Side-by-Side Comparison Modal (up to 3 products) */}
      <CompareBar
        compareList={compareList}
        lang={lang}
        onOpenCompareModal={() => setIsCompareOpen(true)}
        onRemoveFromCompare={(id) =>
          setCompareList((prev) => prev.filter((p) => p.id !== id))
        }
        onClearCompare={() => setCompareList([])}
      />

      <CompareModal
        isOpen={isCompareOpen}
        products={compareList}
        allProducts={products}
        categories={categories}
        lang={lang}
        accessibility={accessibility}
        onAddProductToCompare={handleToggleCompare}
        onRemoveProduct={(id) => {
          setCompareList((prev) => {
            const next = prev.filter((p) => p.id !== id);
            if (next.length === 0) setIsCompareOpen(false);
            return next;
          });
        }}
        onClearAll={() => setCompareList([])}
        onAddToCart={handleAddToCart}
        onOpenDetail={handleOpenDetail}
        onClose={() => setIsCompareOpen(false)}
      />

      {/* 4. Favorites Drawer */}
      {isFavoritesOpen && (
        <FavoritesDrawer
          favorites={favorites}
          lang={lang}
          onRemoveFavorite={handleToggleFavorite}
          onClearFavorites={() => {
            setFavorites([]);
            try {
              localStorage.setItem('muslim_shop_favorites', JSON.stringify([]));
            } catch {}
            showToast(lang === 'kz' ? 'Таңдаулылар тазартылды' : 'Избранное очищено');
          }}
          onAddToCart={handleAddToCart}
          onOpenDetail={handleOpenDetail}
          onClose={() => setIsFavoritesOpen(false)}
        />
      )}

      {/* 5. Store Admin Modal (PIN protected, connected to Firestore) */}
      {isAdminOpen && (
        <AdminModal
          config={config}
          products={products}
          categories={categories}
          lang={lang}
          onUpdateConfig={(newCfg) => {
            recordLocalSettingsUpdate(newCfg);
            setConfig(newCfg);
            try {
              localStorage.setItem('muslim_shop_config', JSON.stringify(newCfg));
            } catch {}
          }}
          onUpdateProduct={(updated) => {
            recordLocalProductUpsert(updated);
            setProducts((prev) => {
              const next = deduplicateProducts(
                prev.map((p) => (p.id === updated.id ? updated : p))
              );
              saveProductsToLocalStorageCache(next);
              return next;
            });
          }}
          onBulkUpdateProducts={(updatedList) => {
            const byId = new Map<string, Product>();
            for (const item of updatedList) {
              if (item && item.id) {
                recordLocalProductUpsert(item);
                byId.set(item.id, item);
              }
            }
            setProducts((prev) => {
              const next = deduplicateProducts(
                prev.map((p) => (byId.has(p.id) ? byId.get(p.id)! : p))
              );
              saveProductsToLocalStorageCache(next);
              return next;
            });
          }}
          onAddProduct={(newProd) => {
            recordLocalProductUpsert(newProd);
            setProducts((prev) => {
              const alreadyExists = prev.some((p) => p.id === newProd.id);
              const next = alreadyExists
                ? deduplicateProducts(prev.map((p) => (p.id === newProd.id ? newProd : p)))
                : deduplicateProducts([newProd, ...prev]);
              saveProductsToLocalStorageCache(next);
              return next;
            });
            showToast(lang === 'kz' ? 'Өнім сәтті қосылды!' : 'Товар успешно добавлен в каталог!');
          }}
          onDeleteProduct={(deletedId) => {
            recordLocalProductDelete(deletedId);
            setProducts((prev) => {
              const next = prev.filter((p) => p.id !== deletedId);
              saveProductsToLocalStorageCache(next);
              return next;
            });
            setCart((prev) => {
              const next = prev.filter((item) => item.product.id !== deletedId);
              try {
                localStorage.setItem('muslim_shop_cart', JSON.stringify(next));
              } catch {}
              return next;
            });
            setFavorites((prev) => {
              const next = prev.filter((p) => p.id !== deletedId);
              try {
                localStorage.setItem('muslim_shop_favorites', JSON.stringify(next));
              } catch {}
              return next;
            });
            setCompareList((prev) => prev.filter((p) => p.id !== deletedId));
            showToast(lang === 'kz' ? 'Өнім жойылды' : 'Товар удален из каталога');
          }}
          onPreviewProduct={handleOpenDetail}
          onAddCategory={(newCat) => {
            recordLocalCategoryUpsert(newCat);
            try {
              const currentDeleted = getDeletedCategoryIds().filter((id) => id !== newCat.id);
              localStorage.setItem('muslim_shop_deleted_categories', JSON.stringify(currentDeleted));
            } catch {}
            setCategories((prev) => {
              const exists = prev.some((c) => c.id === newCat.id);
              if (exists) return prev;
              const updated = [...prev, newCat];
              try {
                localStorage.setItem('muslim_shop_categories', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            showToast(lang === 'kz' ? 'Каталог қосылды!' : 'Каталог успешно добавлен!');
          }}
          onUpdateCategory={(updatedCat) => {
            recordLocalCategoryUpsert(updatedCat);
            setCategories((prev) => {
              const updated = prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
              try {
                localStorage.setItem('muslim_shop_categories', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            showToast(lang === 'kz' ? 'Каталог жаңартылды!' : 'Каталог успешно обновлен!');
          }}
          onDeleteCategory={(deletedCatId) => {
            recordLocalCategoryDelete(deletedCatId);
            addDeletedCategoryId(deletedCatId);
            setCategories((prev) => {
              const updated = prev.filter((c) => c.id !== deletedCatId);
              try {
                localStorage.setItem('muslim_shop_categories', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            // If the deleted category was currently selected, reset to 'cat-all'
            if (selectedCategoryId === deletedCatId) {
              setSelectedCategoryId('cat-all');
            }
            showToast(lang === 'kz' ? 'Каталог жойылды' : 'Каталог удален');
          }}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

      {/* 6. Bottom Sheet Drawer for Catalog & Contact */}
      <CatalogDrawer
        isOpen={bottomDrawerMode !== null}
        mode={bottomDrawerMode || 'catalog'}
        onClose={() => setBottomDrawerMode(null)}
        products={products}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(catId) => {
          setBottomDrawerMode(null);
          handleSelectCategoryAndScroll(catId);
        }}
        onSelectSymptom={(symId) => {
          setBottomDrawerMode(null);
          handleSelectSymptomAndScroll(symId);
        }}
        onOpenProduct={handleOpenDetail}
        onAddToCart={handleAddToCart}
        productCounts={productCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        config={config}
        lang={lang}
      />

      {/* 7. Fixed Bottom Navigation Bar (Главная • Каталог • Поиск • Корзина • Админ) */}
      <BottomNav
        activeTab={
          (isAdminOpen
            ? 'admin'
            : isCartOpen
            ? 'cart'
            : bottomDrawerMode === 'catalog' || selectedCategoryId !== 'cat-all'
            ? 'catalog'
            : 'home') as BottomNavTab
        }
        lang={lang}
        accessibility={accessibility}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onSelectHome={() => {
          setBottomDrawerMode(null);
          setIsCartOpen(false);
          setIsFavoritesOpen(false);
          setIsAdminOpen(false);
          setSelectedCategoryId('cat-all');
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCatalog={() => {
          setIsCartOpen(false);
          setIsFavoritesOpen(false);
          setIsAdminOpen(false);
          setBottomDrawerMode((prev) => (prev === 'catalog' ? null : 'catalog'));
        }}
        onOpenSearch={() => {
          setIsCartOpen(false);
          setIsFavoritesOpen(false);
          setIsAdminOpen(false);
          setBottomDrawerMode(null);
          const el = document.getElementById('header-search-input');
          if (el) {
            el.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenCart={() => {
          setBottomDrawerMode(null);
          setIsFavoritesOpen(false);
          setIsAdminOpen(false);
          setIsCartOpen((prev) => !prev);
        }}
        onOpenAdmin={() => {
          setBottomDrawerMode(null);
          setIsCartOpen(false);
          setIsFavoritesOpen(false);
          setIsAdminOpen(true);
        }}
      />
    </div>
  );
}
