/*
====================================================================
formTheme.js

The teal palette and the handful of shared surfaces the Form
Management screens use, in one place. Previously the same six hex
values were re-typed in every component, so a tweak meant editing
four files and missing one.
====================================================================
*/

export const T = {
    ink: "#274850",       // headings
    brand: "#3f6f7a",     // primary actions, icons
    brandDark: "#2c4e56", // hover
    brandSoft: "rgba(63,111,122,0.10)",
    muted: "#7c8a8d",     // secondary text
    line: "#e3ebec",      // hairlines
    danger: "#c0392b",
    dangerDark: "#a5301f",
    surface: "#fff",
    page: "#f6f9f9"
};

/* Card surface used by the forms grid and the empty state */
export const card = {
    backgroundColor: T.surface,
    border: `1px solid ${T.line}`,
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(39,72,80,0.04)"
};

/* Pill button, filled */
export const primaryBtn = {
    textTransform: "none",
    fontWeight: 700,
    borderRadius: "999px",
    bgcolor: T.brand,
    boxShadow: "none",
    px: 2.5,
    "&:hover": { bgcolor: T.brandDark, boxShadow: "none" }
};

/* Pill button, outline */
export const ghostBtn = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "999px",
    color: T.brand,
    borderColor: T.line,
    "&:hover": { borderColor: T.brand, bgcolor: T.brandSoft }
};

/* Page shell — narrow for a single form, wide for the grid */
export const shell = (wide) => ({
    width: "100%",
    maxWidth: wide ? 1120 : 780,
    mx: "auto",
    px: { xs: 2, sm: 3 },
    pb: 6
});

/* Truncate a heading to n lines without breaking the card layout */
export const clamp = (lines) => ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
});