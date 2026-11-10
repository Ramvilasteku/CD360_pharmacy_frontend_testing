// src/pharmacy/shared/AppPager.js
//
// THE pager for every pharmacy list.
//
//   [Previous]  3  4  5  [Next]          41–60 of 230      Rows: [20 ▾]
//
//   • At most THREE page numbers, moving with the current page:
//       page 1 → 1 2 3     page 4 → 3 4 5     page 10 of 10 → 8 9 10     2 pages → 1 2
//   • Previous / Next (words on wide screens, arrows on phones). No first / last, no "…".
//   • "41–60 of 230" and the rows-per-page choice are optional.
//
// Usage
//   <AppPager page={page} pageSize={limit} total={total}
//             onPageChange={setPage}
//             pageSizeOptions={[10, 20, 50]} onPageSizeChange={(n) => { setLimit(n); setPage(1); }} />
//   page is 1-based. Pass `pages` instead of `total` + `pageSize` if that's what you have.
//   Hidden entirely when there is nothing to page (total 0) unless `alwaysShow`.

import React from "react";
import {
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { cssVar, fade } from "../../theme/appColors";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";

/** The page numbers to show: at most 3, around the current page. */
export function pageWindow(page, pages) {
  const n = Math.max(1, Math.floor(pages) || 1);
  const p = Math.min(Math.max(1, Math.floor(page) || 1), n);
  const start = Math.max(1, Math.min(p - 1, n - 2));
  const end = Math.min(n, start + 2);
  const out = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

const numSx = (active) => ({
  minWidth: 30,
  width: 30,
  height:30,
  p: 0,
  borderRadius: "10px",
  fontWeight: active ? 700 : 500,
  fontSize: 13,
  fontVariantNumeric: "tabular-nums",
  textTransform: "none",
  border: "1px solid",
  borderColor: active ? "primary.main" : "transparent",
  color: active ? "#fff" : "text.primary",
  bgcolor: active ? "primary.main" : "transparent",
  boxShadow: active ? "0 2px 6px rgba(0, 0, 0, 0.12)" : "none",
  transition: "all 0.2s ease",

  "&:hover": {
    bgcolor: active ? "primary.dark" : "action.hover",
    borderColor: active ? "primary.dark" : "divider",
  },

  "&.Mui-disabled": {
    color: "text.disabled",
    opacity: 0.5,
  },
});

const arrowSx = {
  width: 30,
  height: 30,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "divider",
  color: "text.primary",

  "&:hover": {
    bgcolor: "action.hover",
    borderColor: "primary.main",
  },

  "&.Mui-disabled": {
    opacity: 0.35,
  },
};

export function paginationNumbers(page, pages) {
  const n = Math.max(1, Math.floor(pages) || 1);
  const current = Math.min(Math.max(1, Math.floor(page) || 1), n);

  if (n <= 5) {
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  const window = pageWindow(current, n);
  const result = [];

  if (window[0] > 1) {
    result.push(1);
  }

  if (window[0] > 2) {
    result.push("...");
  }

  result.push(...window);

  if (window[window.length - 1] < n - 1) {
    result.push("...");
  }

  if (window[window.length - 1] < n) {
    result.push(n);
  }

  return result;
}

export default function AppPager({
  page,
  pageSize,
  total,
  pages: pagesProp,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  showCount = true,
  alwaysShow = false,
  disabled = false,
  sx,
}) {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("sm"));
  const pages = Math.max(
    1,
    pagesProp != null
      ? Math.floor(pagesProp) || 1
      : Math.ceil((Number(total) || 0) / Math.max(1, Number(pageSize) || 1)),
  );
  const current = Math.min(Math.max(1, page || 1), pages);
  if (!alwaysShow && pagesProp == null && !(Number(total) > 0)) return null;

  const go = (p) => {
    if (disabled || p < 1 || p > pages || p === current) return;
    onPageChange(p);
  };
  const from = total ? (current - 1) * pageSize + 1 : 0;
  const to = total ? Math.min(current * pageSize, total) : 0;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{
        flexShrink: 0,
        px: { xs: 1.25, md: 2 },
        py: 0.75,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        ...sx,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ minWidth: 0 }}
      >
        {showCount && total != null && (
          <Typography
            sx={{
              fontSize: 12.5,
              color: "text.secondary",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {total
              ? `${from}–${to} of ${Number(total).toLocaleString("en-IN")}`
              : "0 results"}
          </Typography>
        )}
        {pageSizeOptions && onPageSizeChange && !narrow && (
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
              Rows
            </Typography>
            <Select
              size="small"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={disabled}
              inputProps={{ "aria-label": "Rows per page" }}
              sx={{
                fontSize: 13,
                height: 30,
                borderRadius: 2,
                "& .MuiSelect-select": { py: 0.4 },
              }}
            >
              {pageSizeOptions.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        )}
      </Stack>

<Stack
  direction="row"
  alignItems="center"
  spacing={0.5}
  component="nav"
  aria-label="Pagination"
>
  {/* First page */}
  <IconButton
    size="small"
    aria-label="First page"
    disabled={disabled || current === 1}
    onClick={() => go(1)}
    sx={arrowSx}
  >
    <FirstPageIcon fontSize="small" />
  </IconButton>

  {/* Previous page */}
  <IconButton
    size="small"
    aria-label="Previous page"
    disabled={disabled || current === 1}
    onClick={() => go(current - 1)}
    sx={arrowSx}
  >
    <ChevronLeftIcon fontSize="small" />
  </IconButton>

  {/* Three page numbers */}
  {pageWindow(current, pages).map((n) => (
    <Button
      key={n}
      size="small"
      aria-label={`Page ${n}`}
      aria-current={n === current ? "page" : undefined}
      disabled={disabled}
      onClick={() => go(n)}
      sx={numSx(n === current)}
    >
      {n}
    </Button>
  ))}

  {/* Next page */}
  <IconButton
    size="small"
    aria-label="Next page"
    disabled={disabled || current === pages}
    onClick={() => go(current + 1)}
    sx={arrowSx}
  >
    <ChevronRightIcon fontSize="small" />
  </IconButton>

  {/* Last page */}
  <IconButton
    size="small"
    aria-label="Last page"
    disabled={disabled || current === pages}
    onClick={() => go(pages)}
    sx={arrowSx}
  >
    <LastPageIcon fontSize="small" />
  </IconButton>
</Stack>
    </Stack>
  );
}

/** For client-side lists: the rows of one page. */
export const pageSlice = (rows, page, pageSize) =>
  rows.slice((page - 1) * pageSize, page * pageSize);

/** Keeps `page` valid when the list shrinks (e.g. after a filter or a delete). */
export function clampPage(page, total, pageSize) {
  const pages = Math.max(
    1,
    Math.ceil((Number(total) || 0) / Math.max(1, pageSize)),
  );
  return Math.min(Math.max(1, page), pages);
}
