// Deal feed data access.
//
// Tries the live Netlify function first so the feed genuinely changes through
// the day (that churn is the point of a feed). Falls back to the snapshot
// bundled at build time so the screen is never empty — offline, cold start,
// or running `expo start` locally where no function is served.
import snapshot from "./dealsSnapshot.json";

const LIVE_ENDPOINT = "/.netlify/functions/deals";
const TIMEOUT_MS = 6000;

export const DEAL_SOURCE = { LIVE: "live", SNAPSHOT: "snapshot" };

export async function fetchDeals() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(LIVE_ENDPOINT, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.deals) && data.deals.length) {
        return { deals: data.deals, capturedAt: data.capturedAt, source: DEAL_SOURCE.LIVE };
      }
    }
  } catch (_) {
    // Fall through to the snapshot below.
  }

  return {
    deals: snapshot.deals,
    capturedAt: snapshot.capturedAt,
    source: DEAL_SOURCE.SNAPSHOT,
  };
}

// "2h ago" / "3d ago" — freshness is the honest substitute for a fake
// countdown timer, and it's the signal that rewards coming back.
export function timeAgo(dateString) {
  const then = new Date(dateString).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
