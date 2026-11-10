// src/theme/appColors.js
//
// THE ONE PLACE THE COLOURS LIVE.
//
// Change a value in COLORS below and every purchase screen and every B2B screen follows:
// buttons, selected rows, icon tiles, column headings, status chips, the pager, the PDF
// preview chips — all of them. No other file holds a colour.
//
//   primary     the main colour: buttons, selection, headings, focus rings
//   secondary   the supporting colour: sale-based figures, second accent
//   black       the darkest ink (headings, the "strong" figures)
//   white       the lightest surface (cards, text on a coloured button)
//   textPrimary / textSecondary   body text and quiet text
//   border      hairlines and dividers
//   background  the page behind the cards
//   success / warning / error / info   status colours (paid, due, failed, on order …)
//   whatsapp    WhatsApp's brand green — only used on the WhatsApp send button
//
// HOW IT REACHES THE SCREENS
//   1. <ColorRoot> publishes COLORS twice: as CSS variables on :root (--cd-primary, …) and as the
//      MUI palette (so <Button color="primary"> and friends follow too).
//      The purchase and B2B pages wrap themselves in it, so nothing else is needed. To
//      recolour the WHOLE app, wrap <App /> in <ColorRoot> instead (or as well — it nests).
//   2. Screens read colours through the helpers at the bottom of this file (cssVar / tone),
//      which always answer var(--cd-…, <the value from COLORS>) — so a colour still shows
//      even where <ColorRoot> is not mounted.
//
// Prefer plain hex (#rrggbb) values: tints are made with color-mix(), which understands any
// CSS colour, but MUI's palette maths (hover shades) wants hex / rgb / hsl.

import React, { useMemo } from "react";
import { GlobalStyles, ThemeProvider, createTheme } from "@mui/material";

/* ------------------------------------------------------------------ */
/* 1. EDIT HERE                                                         */
/* ------------------------------------------------------------------ */
export const COLORS = {
  primary: "#0f766e",
  secondary: "#4338ca",

  black: "#111827",
  white: "#ffffff",

  textPrimary: "#1f2937",
  textSecondary: "#5b6472",
  textDisabled: "#9aa3af",

  border: "#e3e8ee",
  background: "#f6f8fa",

  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  info: "#0284c7",

  whatsapp: "#25D366",
};

/* ------------------------------------------------------------------ */
/* 2. Variable names (rarely changed)                                   */
/* ------------------------------------------------------------------ */
export const VAR_PREFIX = "--cd-";

const kebab = (k) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** { primary: "--cd-primary", textPrimary: "--cd-text-primary", … } */
export const VARS = Object.fromEntries(Object.keys(COLORS).map((k) => [k, `${VAR_PREFIX}${kebab(k)}`]));

/** The :root block as an object — for GlobalStyles, or to paste into index.css. */
export const rootVars = () => Object.fromEntries(Object.keys(COLORS).map((k) => [VARS[k], COLORS[k]]));

/** The same block as CSS text, e.g. to drop into index.css. */
export const rootCssText = () =>
  `:root {\n${Object.keys(COLORS).map((k) => `  ${VARS[k]}: ${COLORS[k]};`).join("\n")}\n}\n`;

/* ------------------------------------------------------------------ */
/* 3. Reading a colour                                                  */
/* ------------------------------------------------------------------ */

/** A named colour as live CSS: var(--cd-primary, #0f766e). */
export const cssVar = (name) => (COLORS[name] ? `var(${VARS[name]}, ${COLORS[name]})` : undefined);

// The status / role names the screens use ("tones"), and which colour each one is.
const TONE_TO_COLOR = {
  primary: "primary",
  secondary: "secondary",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  neutral: "textSecondary",
};

/** A tone name → live CSS colour. Unknown tones fall back to the quiet text colour. */
export const tone = (name) => cssVar(TONE_TO_COLOR[name] || "textSecondary");

/** The darker shade of a tone, for text that sits on a tint of the same tone. */
export const toneInk = (name) =>
  name === "neutral" || !TONE_TO_COLOR[name]
    ? cssVar("textPrimary")
    : `color-mix(in srgb, ${tone(name)} 78%, black)`;

/** `color` at `amount` (0–1) strength over transparent — works on var(), hex, rgb … */
export const fade = (color, amount) =>
  `color-mix(in srgb, ${color} ${Math.round(amount * 1000) / 10}%, transparent)`;

/* ------------------------------------------------------------------ */
/* 4. The MUI palette, from the same values                             */
/* ------------------------------------------------------------------ */
export const buildPalette = () => ({
  mode: "light",
  primary: { main: COLORS.primary, contrastText: COLORS.white },
  secondary: { main: COLORS.secondary, contrastText: COLORS.white },
  success: { main: COLORS.success, contrastText: COLORS.white },
  warning: { main: COLORS.warning, contrastText: COLORS.white },
  error: { main: COLORS.error, contrastText: COLORS.white },
  info: { main: COLORS.info, contrastText: COLORS.white },
  common: { black: COLORS.black, white: COLORS.white },
  text: { primary: COLORS.textPrimary, secondary: COLORS.textSecondary, disabled: COLORS.textDisabled },
  divider: COLORS.border,
  background: { default: COLORS.background, paper: COLORS.white },
});

/**
 * A complete MUI theme from COLORS. Use it as createTheme's base if you build your own.
 *
 * The palette is built once on its own FIRST, so every colour carries its computed light / dark
 * shades; merging only `main` over an existing theme would leave that theme's own light / dark
 * behind (a teal button that turns BLUE on hover, for example).
 */
export const buildTheme = (outer) => {
  const p = createTheme({ palette: buildPalette() }).palette;
  const set = (c) => ({ main: c.main, light: c.light, dark: c.dark, contrastText: c.contrastText });
  return createTheme(outer || {}, {
    palette: {
      mode: "light",
      primary: set(p.primary),
      secondary: set(p.secondary),
      success: set(p.success),
      warning: set(p.warning),
      error: set(p.error),
      info: set(p.info),
      common: { black: COLORS.black, white: COLORS.white },
      text: { primary: COLORS.textPrimary, secondary: COLORS.textSecondary, disabled: COLORS.textDisabled },
      divider: COLORS.border,
      background: { default: COLORS.background, paper: COLORS.white },
    },
  });
};

/* ------------------------------------------------------------------ */
/* 5. <ColorRoot>                                                       */
/* ------------------------------------------------------------------ */
/**
 * Publishes COLORS to everything inside it: CSS variables on :root and the MUI palette.
 * Nests safely inside an existing ThemeProvider (the rest of its theme is kept).
 */
export function ColorRoot({ children }) {
  const theme = useMemo(() => (outer) => buildTheme(outer), []);
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={{ ":root": rootVars() }} />
      {children}
    </ThemeProvider>
  );
}

export default ColorRoot;