// Pickly design tokens.
//
// Direction: a dark, editorial "deal feed" — closer to a magazine or a
// finance app than a supermarket catalogue. Three reasons it's dark:
//   1. The content is photography (real deal images); photos pop on dark and
//      get muddy on a light mint background.
//   2. "Browse when bored" happens in the evening. Dark is comfortable there.
//   3. It deliberately avoids the bright-white + siren-red look every other
//      Australian discount app already uses.
//
// The accent is GOLD, not red. Gold reads as "value / a score / treasure",
// which matches the feeling we're going for (the thrill of finding something)
// rather than the panic of a countdown clock. Red is present but rationed —
// `ember` is only ever used on the single hottest item, so it stays a signal
// instead of becoming the background noise of the whole app.
export const colors = {
  // Brand
  primary: "#2FBF6B",     // fresh grocery green, brightened for dark surfaces
  primaryDark: "#1B8F4A",
  accent: "#F2C14E",      // gold — the "score" accent, used for value/heat

  // Surfaces (warm-tinted near-black, not blue-grey — keeps it human)
  background: "#0E1210",
  card: "#171D19",
  cardHi: "#212926",      // raised/hover surface, chips, thumbnails
  border: "#26302B",

  // Type
  text: "#F2F6F3",
  textMuted: "#8B978F",
  textFaint: "#5E6A63",

  // Semantics
  danger: "#E0533D",
  saving: "#4ADE80",      // savings figures — the number people scan for
  saveBadgeBg: "#F2C14E", // "Save $X" chip
  saveBadgeText: "#231B04",
  star: "#F2C14E",
  ember: "#FF6B4A",       // RATIONED: hottest deal only, never as a fill
  iconBg: "#212926",

  // On-colour text (for filled buttons/badges)
  onPrimary: "#04140A",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 };

// Editorial type scale — deliberately wide range so a hero headline and a
// caption feel like different voices, not the same component at two sizes.
export const type = {
  display: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  title: { fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  section: { fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "600" },
  caption: { fontSize: 12.5, fontWeight: "600" },
  micro: { fontSize: 11, fontWeight: "700", letterSpacing: 0.7 },
};
