// Turns raw feed numbers into a line a person might actually say.
//
// This is the difference between a screen that feels generated and one that
// feels edited. "▲ 811 · 31204 clicks" is data; "Everyone's on this one" is
// a recommendation. Every phrase below is still driven by the real numbers —
// we're changing the register, not inventing claims.

function hoursSince(dateString) {
  const then = new Date(dateString).getTime();
  if (!Number.isFinite(then)) return Infinity;
  return (Date.now() - then) / 36e5;
}

// Ordered by how notable the signal is — the first match wins, so a runaway
// hit is described as such rather than as merely "fresh".
export function dealVoice(deal) {
  const age = hoursSince(deal.postedAt);

  if (deal.votes >= 400) return "Everyone's on this one";
  if (deal.clicks >= 10000) return "Most clicked this week";
  if (age <= 4 && deal.votes >= 25) return "Taking off right now";
  if (deal.votes >= 150) return "Community favourite";
  if (deal.comments >= 60) return "People have opinions";
  if (age <= 3) return "Just posted";
  if (deal.kind === "FREE") return "Actually free";
  if (deal.kind === "½ PRICE") return "Half price today";
  if (deal.votes >= 50) return "Solid find";
  return "Worth a look";
}

// Short label for the hero slot, which needs to sound like a headline rather
// than a status line.
export function heroKicker(deal) {
  const age = hoursSince(deal.postedAt);
  if (age <= 3) return "HOT OFF THE FEED";
  if (deal.votes >= 400) return "TOP FIND RIGHT NOW";
  if (deal.clicks >= 10000) return "MOST CLICKED";
  return "TODAY'S BEST FIND";
}

// 31204 -> "31.2k". Big raw numbers read as noise; rounded ones read as scale.
export function compactNumber(n) {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
