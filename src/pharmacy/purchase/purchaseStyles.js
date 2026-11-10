// src/pharmacy/purchase/purchaseStyles.js
//
// The look of the purchase (and B2B) screens, in one place — and ONLY from the colours file.
//
// No colour is written here. Every one comes from src/theme/appColors.js, which publishes them
// as CSS variables on :root (--cd-primary, …) and as the MUI palette. Edit the values there and
// every screen that uses this file follows.
//
// Tints (hover wash, icon tile, borders) are made with color-mix(), which works on var().
// MUI's alpha() can't read var(), so use fade() instead.
//
// THE PALETTE, AND WHAT EACH COLOUR MEANS
//   primary    the main action and the "you are here" colour: selected supplier, Generate,
//              icon tiles, column headings, focus rings
//   secondary  a supporting accent: sale-based figures (what sold, how long stock lasts)
//   success    money and completion: the order value, "done", a saved order
//   warning    needs a decision: a list with no supplier, an inactive supplier, low stock
//   error      a problem: out of stock, a value that has to be fixed, discard
//   info       "already on order" — information, nothing to do
//   neutral    muted text — anything that should sit quietly
//
// To re-point a meaning (say sale-based should be info instead of secondary), change the
// ONE line in ROLE below.
//
//   import { ROLE, IconTile, StatTile, SectionHead, ColHead, fade, … } from "./purchaseStyles";

import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { cssVar, fade as fadeColor, tone as toneVar, toneInk } from "../../theme/appColors";

/* ------------------------------------------------------------------ */
/* 1. Roles → tone names                                               */
/* ------------------------------------------------------------------ */
export const ROLE = {
  action: "primary", //  buttons, selection, headings
  sales: "secondary", // sale-based figures
  done: "success", //    saved / placed / money
  attention: "warning", // needs a decision
  danger: "error", //    a problem
  onOrder: "info", //    already ordered
  quiet: "neutral", //   everything else
};

/* ------------------------------------------------------------------ */
/* 2. Colours                                                          */
/* ------------------------------------------------------------------ */

/** `color` at `amount` (0–1) strength over transparent. Works on var(), hex, rgb — anything. */
export const fade = fadeColor;

/** A tone name ("primary", "success", …) → its colour from the colours file, live, as var(--cd-…). */
export const toneColor = (_theme, tone) => toneVar(tone);

/** The darker shade of a tone, for text that sits on a tint of that tone. */
export const toneDark = (_theme, tone) => toneInk(tone);

/** The ready-made tints of one tone, so nobody sprinkles fade() calls around. */
export const tints = (theme, tone) => {
  const c = toneColor(theme, tone);
  return {
    main: c,
    dark: toneDark(theme, tone),
    wash: fade(c, 0.04), //   hover
    soft: fade(c, 0.08), //   selected row, active field
    tile: fade(c, 0.12), //   behind an icon
    line: fade(c, 0.24), //   a border that belongs to the tone
    ring: fade(c, 0.16), //   focus ring
  };
};

/* ------------------------------------------------------------------ */
/* 3. Reusable sx fragments                                            */
/* ------------------------------------------------------------------ */
export const nums = { fontVariantNumeric: "tabular-nums" };

/** A thin scrollbar in a colour (pass toneColor(theme, …) or any CSS colour). */
export const thinScroll = (color) => ({
  scrollbarWidth: "thin",
  scrollbarColor: `${fade(color, 0.4)} transparent`,
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-thumb": { backgroundColor: fade(color, 0.35), borderRadius: 3 },
});

/** The soft wash behind a header. */
export const headWash = (theme, tone = ROLE.action) => {
  const c = toneColor(theme, tone);
  return { backgroundImage: `linear-gradient(135deg, ${fade(c, 0.1)} 0%, ${fade(c, 0.02)} 100%)` };
};

/** A panel: card background, quiet border, optionally tinted by a tone. */
export const panelSx = (theme, tone) => ({
  border: 1,
  borderColor: tone ? fade(toneColor(theme, tone), 0.3) : "divider",
  borderRadius: 3,
  bgcolor: "background.paper",
  overflow: "hidden",
});

/** One row in the supplier rail. `active` is the selected one. */
export const railItemSx = (theme, { active, tone = ROLE.action } = {}) => {
  const t = tints(theme, tone);
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 1.25,
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
    color: "inherit",
    border: 1,
    borderColor: active ? t.line : "transparent",
    borderRadius: 2.5,
    px: 1.25,
    py: 1,
    bgcolor: active ? t.soft : "transparent",
    transition: "background-color .15s, border-color .15s, transform .15s",
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 10,
      bottom: 10,
      width: 3,
      borderRadius: 3,
      bgcolor: t.main,
      opacity: active ? 1 : 0,
      transition: "opacity .15s",
    },
    "&:hover": { bgcolor: active ? t.soft : t.wash, borderColor: active ? t.line : fade(t.main, 0.14) },
    "&:focus-visible": { outline: "none", boxShadow: `0 0 0 3px ${t.ring}` },
  };
};

/** The look shared by every text field on these screens. `color` is any CSS colour. */
export const inputSx = (color, active) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    bgcolor: active ? fade(color, 0.08) : "background.paper",
    transition: "background-color .15s",
    "& fieldset": { borderColor: active ? fade(color, 0.55) : undefined },
    "&:hover fieldset": { borderColor: active ? color : undefined },
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": active ? { color, fontWeight: 700 } : { fontWeight: 600 },
});

/** The little box a quantity / rate / GST is typed into. */
export const numCellSx = (theme, { error, disabled, width } = {}) => {
  const t = tints(theme, error ? ROLE.danger : ROLE.action);
  return {
    width: width || "100%",
    minWidth: 0,
    font: "inherit",
    fontSize: 13.5,
    fontWeight: 600,
    textAlign: "right",
    ...nums,
    px: 0.75,
    py: 0.55,
    color: disabled ? "text.disabled" : "text.primary",
    bgcolor: disabled ? "transparent" : "background.paper",
    border: 1,
    borderColor: error ? t.main : "divider",
    borderRadius: 1.5,
    outline: "none",
    transition: "border-color .15s, box-shadow .15s",
    "&:hover": { borderColor: error ? t.main : "text.disabled" },
    "&:focus": { borderColor: t.main, boxShadow: `0 0 0 3px ${t.ring}` },
  };
};

/** A button's shape and weight. Colour comes from the Button's own `color` prop. */
export const buttonSx = { textTransform: "none", fontWeight: 600, borderRadius: 2 };

/* ------------------------------------------------------------------ */
/* 4. Small components                                                 */
/* ------------------------------------------------------------------ */

/** A rounded square with an icon in it, tinted in `tone`. `solid` fills it instead. */
export function IconTile({ icon: Icon, tone = ROLE.action, size = 32, radius = 2, solid = false }) {
  const theme = useTheme();
  const t = tints(theme, tone);
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        bgcolor: solid ? t.main : t.tile,
        transition: "background-color .15s",
      }}
    >
      <Icon sx={{ fontSize: Math.round(size * 0.56), color: solid ? cssVar("white") : t.main }} />
    </Box>
  );
}

/** One figure with its icon, for the strip along the top. */
export function StatTile({ icon, label, value, tone = ROLE.action, strong }) {
  const theme = useTheme();
  const t = tints(theme, tone);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        p: 1.1,
        minWidth: 0,
        borderRadius: 2.5,
        bgcolor: "background.paper",
        border: 1,
        borderColor: t.line,
        transition: "box-shadow .15s, transform .15s",
        "&:hover": { boxShadow: `0 2px 10px ${fade(t.main, 0.14)}` },
      }}
    >
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <IconTile icon={icon} tone={tone} size={34} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: "text.secondary", letterSpacing: "0.05em" }} noWrap>
          {label}
        </Typography>
        <Typography
          sx={{ fontSize: { xs: 14.5, sm: 15.5 }, fontWeight: 800, ...nums, color: strong ? t.main : "text.primary" }}
          noWrap
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/** A section heading: icon tile, title, count, optional hint and an action on the right. */
export function SectionHead({ icon, title, count, hint, action, tone = ROLE.action }) {
  const theme = useTheme();
  const t = tints(theme, tone);
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
      <IconTile icon={icon} tone={tone} size={30} radius={1.75} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }} noWrap>
        {title}
      </Typography>
      {count != null && (
        <Chip size="small" label={count} sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: t.tile, color: t.main }} />
      )}
      {hint && (
        <Typography sx={{ fontSize: 12, color: "text.secondary", display: { xs: "none", sm: "block" } }} noWrap>
          {hint}
        </Typography>
      )}
      <Box sx={{ flex: 1 }} />
      {action}
    </Stack>
  );
}

/** A column heading in the medicine table. */
export function ColHead({ icon: Icon, right = false, tone = ROLE.action, children }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: right ? "flex-end" : "flex-start",
        gap: 0.6,
        minWidth: 0,
        color: toneDark(theme, tone),
      }}
    >
      <Icon sx={{ fontSize: 15, opacity: 0.85 }} />
      <Typography
        sx={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "inherit" }}
        noWrap
      >
        {children}
      </Typography>
    </Box>
  );
}

/** A small status pill in a tone. `soft` is a tinted fill, otherwise outlined. */
export function Pill({ tone = ROLE.quiet, icon: Icon, children, soft = true, sx }) {
  const theme = useTheme();
  const t = tints(theme, tone);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4,
        height: 20,
        px: 0.9,
        borderRadius: 10,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: t.dark,
        bgcolor: soft ? t.tile : "transparent",
        border: 1,
        borderColor: soft ? "transparent" : t.line,
        ...sx,
      }}
    >
      {Icon && <Icon sx={{ fontSize: 12 }} />}
      {children}
    </Box>
  );
}