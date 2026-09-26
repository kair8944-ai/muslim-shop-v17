import {
  doc,
  setDoc,
  increment,
  onSnapshot,
  arrayUnion,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AnalyticsOverview, DailyAnalytics, VisitLogItem } from '../types';

export const SETTINGS_COLLECTION = 'settings';
export const ANALYTICS_DOC_ID = 'analytics_stats';

const ADMIN_IGNORE_KEY = 'muslim_shop_ignore_admin_visits';
const VISITOR_ID_KEY = 'muslim_shop_visitor_id';
const LAST_VISITED_DATE_KEY = 'muslim_shop_last_visit_date';
const SESSION_ACTIVE_KEY = 'muslim_shop_session_active';

/**
 * Gets or creates an anonymous persistent visitor ID
 */
export function getVisitorId(): string {
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
      localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
  } catch {
    return 'v_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Check if current browser has admin mode enabled to ignore visits (defaults to false)
 */
export function isIgnoreAdminVisits(): boolean {
  try {
    const val = localStorage.getItem(ADMIN_IGNORE_KEY);
    if (val !== null) {
      return val === 'true';
    }
    // If the browser has an active admin session, default to true
    if (localStorage.getItem('muslim_shop_admin_session_ts')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setIgnoreAdminVisits(ignore: boolean): void {
  try {
    localStorage.setItem(ADMIN_IGNORE_KEY, ignore ? 'true' : 'false');
  } catch {}
}

/**
 * Detects visitor device type
 */
function getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Formats date into YYYY-MM-DD format (local timezone)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats referrer into friendly human label
 */
function formatReferrer(raw: string): string {
  if (!raw) return 'Прямой заход';
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('wa.me') || host.includes('whatsapp')) return 'WhatsApp';
    if (host.includes('2gis')) return '2ГИС';
    if (host.includes('google')) return 'Google';
    if (host.includes('yandex')) return 'Яндекс';
    if (host.includes('telegram') || host.includes('t.me')) return 'Telegram';
    return host.replace(/^www\./, '');
  } catch {
    return 'Внешняя ссылка';
  }
}

/**
 * Records a client visit / page view in Firestore (stored securely in settings/analytics_stats)
 */
export async function trackVisit(options: {
  page?: string;
  lang?: string;
  isInitialLoad?: boolean;
}): Promise<void> {
  if (isIgnoreAdminVisits()) {
    return;
  }

  const today = getTodayDateString();
  const visitorId = getVisitorId();
  const device = getDeviceType();
  const lang = options.lang === 'kz' ? 'kz' : 'ru';
  const page = options.page || 'Главная';

  let isNewVisitorToday = false;
  try {
    const lastVisitDate = localStorage.getItem(LAST_VISITED_DATE_KEY);
    if (lastVisitDate !== today) {
      isNewVisitorToday = true;
      localStorage.setItem(LAST_VISITED_DATE_KEY, today);
    }
  } catch {
    isNewVisitorToday = true;
  }

  let isNewSession = false;
  try {
    const hasSession = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (!hasSession || options.isInitialLoad) {
      isNewSession = true;
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'active_' + Date.now());
    }
  } catch {
    isNewSession = true;
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
    const nowIso = new Date().toISOString();
    const referrer = typeof document !== 'undefined' ? formatReferrer(document.referrer) : 'Прямой заход';

    const visitItem: VisitLogItem = {
      id: 'v_' + Math.random().toString(36).substring(2, 9),
      visitorId: visitorId.slice(-6),
      timestamp: nowIso,
      device,
      lang,
      page,
      referrer,
      isNewVisitor: isNewVisitorToday,
    };

    // Update in Firestore
    await setDoc(
      docRef,
      {
        overview: {
          totalVisits: increment(isNewSession ? 1 : 0),
          uniqueVisitors: increment(isNewVisitorToday ? 1 : 0),
          pageViews: increment(1),
          lastVisitAt: nowIso,
        },
        days: {
          [today]: {
            date: today,
            totalVisits: increment(isNewSession ? 1 : 0),
            uniqueVisitors: increment(isNewVisitorToday ? 1 : 0),
            pageViews: increment(1),
            mobileVisits: increment(device === 'mobile' ? 1 : 0),
            desktopVisits: increment(device === 'desktop' ? 1 : 0),
            ruVisits: increment(lang === 'ru' ? 1 : 0),
            kzVisits: increment(lang === 'kz' ? 1 : 0),
            updatedAt: nowIso,
          },
        },
        recentVisits: arrayUnion(visitItem),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Analytics tracking notice:', err);
  }
}

/**
 * Tracks product detail view
 */
export async function trackProductView(productId: string, productTitle: string): Promise<void> {
  if (isIgnoreAdminVisits()) return;

  const today = getTodayDateString();
  const nowIso = new Date().toISOString();

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
    await setDoc(
      docRef,
      {
        overview: {
          pageViews: increment(1),
          lastVisitAt: nowIso,
        },
        days: {
          [today]: {
            date: today,
            pageViews: increment(1),
            [`productViews.${productId}.title`]: productTitle,
            [`productViews.${productId}.count`]: increment(1),
            updatedAt: nowIso,
          },
        },
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Product view track notice:', err);
  }
}

/**
 * Generates an instant test visit so the store owner can verify tracking in real-time.
 * If "isIgnoreAdminVisits()" is enabled, this is safely blocked to protect statistics.
 */
export async function recordTestVisit(): Promise<{ success: boolean; ignored: boolean }> {
  if (isIgnoreAdminVisits()) {
    console.info('Test visit skipped: admin exclusion mode is active.');
    return { success: false, ignored: true };
  }

  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  const device = getDeviceType();

  const testVisit: VisitLogItem = {
    id: 'v_test_' + Date.now().toString(36),
    visitorId: 'owner',
    timestamp: nowIso,
    device,
    lang: 'ru',
    page: 'Тестовый визит',
    referrer: 'Тест счетчика в админке',
    isNewVisitor: true,
  };

  const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
  await setDoc(
    docRef,
    {
      overview: {
        totalVisits: increment(1),
        uniqueVisitors: increment(1),
        pageViews: increment(1),
        lastVisitAt: nowIso,
      },
      days: {
        [today]: {
          date: today,
          totalVisits: increment(1),
          uniqueVisitors: increment(1),
          pageViews: increment(1),
          mobileVisits: increment(device === 'mobile' ? 1 : 0),
          desktopVisits: increment(device === 'desktop' ? 1 : 0),
          ruVisits: increment(1),
          kzVisits: increment(0),
          updatedAt: nowIso,
        },
      },
      recentVisits: arrayUnion(testVisit),
    },
    { merge: true }
  );

  return { success: true, ignored: false };
}

/**
 * Resets today's visitor analytics so accidental test visits do not distort real statistics.
 * Resilient against Firestore quota limits and offline state.
 */
export async function resetTodayAnalytics(): Promise<void> {
  const today = getTodayDateString();
  const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);

  try {
    localStorage.setItem('muslim_shop_analytics_reset_today', today);
  } catch {}

  // 1. Direct write reset for today (does not require document read units)
  try {
    await setDoc(
      docRef,
      {
        days: {
          [today]: {
            date: today,
            totalVisits: 0,
            uniqueVisitors: 0,
            pageViews: 0,
            mobileVisits: 0,
            desktopVisits: 0,
            ruVisits: 0,
            kzVisits: 0,
            productViews: {},
            updatedAt: new Date().toISOString(),
          },
        },
      },
      { merge: true }
    );
  } catch (writeErr) {
    console.warn('Firestore setDoc notice during reset:', writeErr);
  }

  // 2. Best-effort overview and recent visits cleanup (skips gracefully if read quota reached)
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentOverview = data.overview || {};
      const daysMap = data.days || {};
      const todayData = daysMap[today] || {};

      const todayVisits = Number(todayData.totalVisits) || 0;
      const todayUniques = Number(todayData.uniqueVisitors) || 0;
      const todayViews = Number(todayData.pageViews) || 0;

      const newTotalVisits = Math.max(0, (Number(currentOverview.totalVisits) || 0) - todayVisits);
      const newUniqueVisitors = Math.max(0, (Number(currentOverview.uniqueVisitors) || 0) - todayUniques);
      const newPageViews = Math.max(0, (Number(currentOverview.pageViews) || 0) - todayViews);

      const currentRecent: VisitLogItem[] = data.recentVisits || [];
      const filteredRecent = currentRecent.filter((v) => {
        if (!v.timestamp) return true;
        return !v.timestamp.startsWith(today);
      });

      await setDoc(
        docRef,
        {
          overview: {
            totalVisits: newTotalVisits,
            uniqueVisitors: newUniqueVisitors,
            pageViews: newPageViews,
          },
          recentVisits: filteredRecent,
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Firestore optional read cleanup notice during reset:', err);
  }
}

/**
 * Real-time subscription to analytics stats
 */
export function subscribeToAnalytics(
  callback: (data: {
    overview: AnalyticsOverview;
    dailyData: DailyAnalytics[];
    recentVisits: VisitLogItem[];
  }) => void
): () => void {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);

    return onSnapshot(
      docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const raw = snapshot.data();
        const overviewRaw = raw.overview || {};
        const daysRaw = raw.days || {};
        const recentVisitsRaw: VisitLogItem[] = raw.recentVisits || [];

        const overview: AnalyticsOverview = {
          totalVisitsAllTime: Number(overviewRaw.totalVisits) || 0,
          uniqueVisitorsAllTime: Number(overviewRaw.uniqueVisitors) || 0,
          totalPageViewsAllTime: Number(overviewRaw.pageViews) || 0,
          lastVisitAt: overviewRaw.lastVisitAt || undefined,
        };

        const dailyList: DailyAnalytics[] = Object.keys(daysRaw).map((dKey) => {
          const item = daysRaw[dKey] || {};
          return {
            id: dKey,
            date: item.date || dKey,
            totalVisits: Number(item.totalVisits) || 0,
            uniqueVisitors: Number(item.uniqueVisitors) || 0,
            pageViews: Number(item.pageViews) || 0,
            mobileVisits: Number(item.mobileVisits) || 0,
            desktopVisits: Number(item.desktopVisits) || 0,
            ruVisits: Number(item.ruVisits) || 0,
            kzVisits: Number(item.kzVisits) || 0,
            productViews: item.productViews || {},
            updatedAt: item.updatedAt || '',
          };
        });

        // Sort chronologically
        dailyList.sort((a, b) => a.date.localeCompare(b.date));

        // Sort visits descending
        const sortedVisits = [...recentVisitsRaw].sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp)
        );

        callback({
          overview,
          dailyData: dailyList,
          recentVisits: sortedVisits.slice(0, 35),
        });
      } else {
        // Document doesn't exist yet, return zero state
        callback({
          overview: {
            totalVisitsAllTime: 0,
            uniqueVisitorsAllTime: 0,
            totalPageViewsAllTime: 0,
          },
          dailyData: [],
          recentVisits: [],
        });
      }
    },
    (err) => {
      console.warn('Analytics snapshot notice:', err);
    }
  );
  } catch (err) {
    console.warn('Analytics subscribe initialization notice:', err);
    return () => {};
  }
}
