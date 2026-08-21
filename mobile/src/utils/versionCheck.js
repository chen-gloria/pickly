// Catches the actual thing that was making people run stale code: none of
// it was an HTTP-cache problem — index.html already serves with
// `Cache-Control: public,max-age=0,must-revalidate` (confirmed directly),
// so a real page load/reload always gets the current build. The real gap
// is a PWA that was never re-loaded at all: "Add to Home Screen" opens a
// standalone web view that can sit backgrounded and resumed later without
// the OS ever tearing it down and forcing a fresh navigation — so it just
// keeps running whatever JS was already in memory from whenever it was
// first opened, with no network request happening to ever notice a new
// deploy exists.
//
// Fix: when the app comes back to the foreground, fetch index.html's own
// ETag (ask Netlify what the current deploy's shell actually is, bypassing
// any cache) and compare it to the one this session booted with. A
// mismatch means a new version has been deployed since — reload picks it
// up, exactly as if the user had force-quit and reopened.
//
// Web-only by design: native builds (iOS/Android app-store installs, or a
// future Expo native build) have their own real update mechanisms — an App
// Store update, or Expo's own OTA updates — this specific "silently stale
// PWA" failure mode doesn't exist there the same way.
import { Platform } from "react-native";

let bootEtag = null;

async function fetchShellEtag() {
  try {
    const res = await fetch("/", { cache: "no-store" });
    return res.headers.get("etag");
  } catch (_) {
    return null; // offline or a transient network blip — not a real "stale" signal
  }
}

export function startVersionCheck() {
  if (Platform.OS !== "web" || typeof document === "undefined") return () => {};

  fetchShellEtag().then((etag) => {
    bootEtag = etag;
  });

  async function onVisible() {
    if (document.visibilityState !== "visible") return;
    const current = await fetchShellEtag();
    // Only ever act on two etags we actually have and that disagree — a
    // failed fetch (null) must never be treated as "different from
    // whatever we had before" and trigger a reload loop.
    if (bootEtag && current && current !== bootEtag) {
      window.location.reload();
    }
  }

  document.addEventListener("visibilitychange", onVisible);
  return () => document.removeEventListener("visibilitychange", onVisible);
}
