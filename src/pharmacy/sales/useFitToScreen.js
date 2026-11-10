// src/components/pharmacy/sales/useFitToScreen.js
//
// Layout helpers for the sales screens.
//
//   useElementWidth(ref)
//     The width a container actually has (after your sidebar), so layouts switch
//     to cards or drop a column based on real available space instead of the
//     browser window size. Still fully active — the module header depends on it.
//
//   useFitToScreen(ref, enabled, options)
//     DEPRECATED behavior — now a no-op that always returns null.
//
//     The old behavior gave each list card its own max-height so it would scroll
//     inside the viewport. We now want the PAGE (the module root) to scroll, with
//     lists growing with their content and no inner scrollbar on any card.
//
//     The signature is kept so existing callers (`maxHeight: fitHeight`) keep
//     working — they just receive `null` and the browser treats that as "no cap".
//     If you still need per-element max-height for a specific case, set it inline.

import { useLayoutEffect, useState } from "react";

export function useElementWidth(ref) {
  const [width, setWidth] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = (w) => { if (w > 0) setWidth((prev) => (prev === w ? prev : w)); };
    set(Math.round(el.getBoundingClientRect().width));
    if (typeof ResizeObserver !== "function") return undefined;
    const ro = new ResizeObserver(([entry]) => set(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// ─────────────────────────────────────────────────────────────
// useFitToScreen — intentionally returns null now.
//
// Why: the page (Sales module root) owns the vertical scrollbar.
// Lists render inline and grow with their content. There is no
// per-card scrollbar anywhere in the sales screens.
//
// Any consumer doing something like:
//     const h = useFitToScreen(ref, enabled);
//     <Paper sx={{ maxHeight: h, overflowY: "auto" }} />
// now gets h === null, so maxHeight is unset and the Paper flows naturally.
//
// Params are kept for backwards compatibility — none of them are used.
// ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
export function useFitToScreen(_ref, _enabled, _options) {
  return null;
}