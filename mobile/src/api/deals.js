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

// How long is left on a deal, from the retailer's own end date recorded on
// the post. Returns null when there's no stated deadline — plenty of deals
// simply don't have one, and inventing urgency for those is exactly the
// pattern we're avoiding.
export function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return null;

  const ms = end - Date.now();
  if (ms <= 0) return null;

  const hours = ms / 36e5;
  if (hours < 24) return { label: `${Math.max(1, Math.round(hours))}h left`, urgent: true };
  const days = Math.round(hours / 24);
  // "Ends tomorrow" reads more concretely than "1 day left".
  if (days === 1) return { label: "Ends tomorrow", urgent: true };
  return { label: `${days} days left`, urgent: days <= 3 };
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
