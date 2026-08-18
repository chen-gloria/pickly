// Pickly design tokens.
//
// Direction: a dark, editorial "deal feed" — closer to a magazine or a
// finance app than a supermarket catalogue. Three reasons it's dark:
//   1. The content is photography (real deal images); photos pop on dark and
//      get muddy on a light mint background.
//   2. "Browse when bored" happens in the evening. Dark is comfortable there.
//   3. It deliberately avoids the bright-white + siren-red look every other
//      Australian discount app already uses.
// Dark stays the default for that reason — but light is a real, separately
// contrast-checked palette (not just the dark one inverted), for people who
// want it. See src/context/ThemeContext.js for how the two get switched.
//
// The accent is GOLD, not red. Gold reads as "value / a score / treasure",
// which matches the feeling we're going for (the thrill of finding something)
// rather than the panic of a countdown clock. Red is present but rationed —
// `ember` is only ever used on the single hottest item, so it stays a signal
// instead of becoming the background noise of the whole app.
export const darkColors = {
  // Brand
  primary: "#2FBF6B",     // fresh grocery green, brightened for dark surfaces
  primaryDark: "#1B8F4A",
  accent: "#F2C14E",      // gold — the "score" accent, used for value/heat

  // Surfaces — neutral charcoal, not green-tinted. The green/gold brand
  // colors carry the identity; the background itself stays a plain
  // near-black gray so the app doesn't read as monochrome "black-and-green".
  background: "#16181A",
  card: "#1F2124",
  cardHi: "#282B2F",      // raised/hover surface, chips, thumbnails
  border: "#33363A",

  // Type
  text: "#F2F3F4",
  textMuted: "#9A9DA1",
  textFaint: "#686B70",

  // Semantics
  danger: "#E0533D",
  saving: "#4ADE80",      // savings figures — the number people scan for
  saveBadgeBg: "#F2C14E", // "Save $X" chip
  saveBadgeText: "#231B04",
  star: "#F2C14E",
  ember: "#FF6B4A",       // RATIONED: hottest deal only, never as a fill
  iconBg: "#212926",
  imageFrame: "#FFFFFF",  // product photos always sit on white, either theme

  // On-colour text (for filled buttons/badges)
  onPrimary: "#04140A",
};

// Same role names, own contrast pass — a plain inversion of the dark palette
// reads muddy (a brightened-for-dark green goes neon on white; dark-mode
// gold washes out). Reuses the brand green/neutrals already established on
// the marketing site (website/style.css) for continuity.
export const lightColors = {
  primary: "#1FAB5B",
  primaryDark: "#178841",
  accent: "#B8860B",

  background: "#F6F8F7",
  card: "#FFFFFF",
  cardHi: "#F0F3F1",
  border: "#E4E9E6",

  text: "#1C2620",
  textMuted: "#5B665F",
  textFaint: "#8A948D",

  danger: "#D03A2A",
  saving: "#178841",
  saveBadgeBg: "#F2C14E",
  saveBadgeText: "#231B04",
  star: "#B8860B",
  ember: "#D14A2E",
  iconBg: "#F0F3F1",
  imageFrame: "#FFFFFF",

  onPrimary: "#FFFFFF",
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
