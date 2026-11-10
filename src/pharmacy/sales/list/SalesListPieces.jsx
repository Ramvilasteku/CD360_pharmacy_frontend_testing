// src/components/pharmacy/sales/list/SalesListPieces.jsx
// Small reusable UI pieces for the sales list — pills, cards, empty state, skeletons.

import { Box, Stack, Paper, Typography, Button, Skeleton, Divider } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { STATUS_META, srOnly, numeric } from "./salesListConstants";
import { balanceOf, formatSaleDate, money } from "./salesListHelpers";

/* ───────────────────────────── Status pill ───────────────────────────── */

export function StatusPill({ status }) {
  const theme = useTheme();
  const meta = STATUS_META[status];
  const main = meta ? theme.palette[meta.color].main : theme.palette.text.secondary;
  const text = meta
    ? theme.palette[meta.color][theme.palette.mode === "dark" ? "light" : "dark"]
    : theme.palette.text.secondary;
  const label = meta?.label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "—");

  return (
    <Box component="span" sx={{
      display: "inline-flex", alignItems: "center", gap: "6px", height: 24, px: "10px",
      borderRadius: "999px",
      bgcolor: alpha(main, theme.palette.mode === "dark" ? 0.2 : 0.12),
      color: text, fontSize: 12.5, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap",
    }}>
      <Box component="span" sx={{
        width: 6, height: 6, borderRadius: "50%", bgcolor: main, flexShrink: 0,
      }} />
      {label}
    </Box>
  );
}

/* ───────────────────────────── Balance ───────────────────────────── */

export function BalanceText({ sale, sx }) {
  const due = balanceOf(sale);
  return due > 0 ? (
    <Typography component="span" variant="body2"
      sx={{ ...numeric, color: "error.main", fontWeight: 600, ...sx }}>
      {money(due)}
    </Typography>
  ) : (
    <Typography component="span" variant="body2" color="text.disabled" sx={sx}>
      <span aria-hidden="true">—</span>
      <Box component="span" sx={srOnly}>No balance due</Box>
    </Typography>
  );
}

/* ───────────────────────────── Empty state ───────────────────────────── */

export function EmptyState({ filtered, onClear }) {
  const Icon = filtered ? SearchOffIcon : ReceiptLongOutlinedIcon;
  return (
    <Stack alignItems="center" spacing={1}
      sx={{ py: { xs: 7, md: 9 }, px: 3, textAlign: "center" }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center",
        bgcolor: "action.hover", color: "text.secondary", mb: 1,
      }}>
        <Icon />
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {filtered ? "No matching sales" : "No sales yet"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340 }}>
        {filtered
          ? "Try a different search term, status or date range."
          : "Bills you create will show up here."}
      </Typography>
      {filtered && (
        <Button onClick={onClear}
          sx={{ mt: 1, textTransform: "none", fontWeight: 600 }}>
          Clear filters
        </Button>
      )}
    </Stack>
  );
}

/* ───────────────────────────── Mini-metric ───────────────────────────── */

function Metric({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div"
        sx={{ lineHeight: 1.4 }}>
        {label}
      </Typography>
      <Box sx={{ fontSize: { xs: 13.5, sm: 14 }, fontWeight: 600, ...numeric }}>
        {children}
      </Box>
    </Box>
  );
}

/* ───────────────────────────── Sale card (mobile) ───────────────────────────── */

export function SaleCard({ sale, onView }) {
  const date = formatSaleDate(sale.sale_date);
  const customer = sale.customer_name?.trim();

  return (
    <Paper
      variant="outlined"
      onClick={onView ? () => onView(sale) : undefined}
      sx={{
        borderRadius: "14px", overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "border-color .15s, box-shadow .15s",
        ...(onView && {
          cursor: "pointer",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: (t) => `0 2px 10px ${alpha(t.palette.common.black, 0.06)}`,
          },
        }),
      }}
    >
      <Box sx={{ p: 2, flex: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {sale.sale_number}
            </Typography>
            <Typography variant="body2" noWrap
              color={customer ? "text.primary" : "text.secondary"}>
              {customer || "Walk-in customer"}
            </Typography>
          </Box>
          <StatusPill status={sale.payment_status} />
        </Stack>

        <Typography variant="caption" color="text.secondary"
          component="div" sx={{ mt: 0.5 }}>
          {date.day}{date.time && ` · ${date.time}`}
          {sale.customer_phone && ` · ${sale.customer_phone}`}
        </Typography>

        <Box sx={{
          display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1,
          mt: 1.5, px: 1.5, py: 1.25, borderRadius: "10px", bgcolor: "action.hover",
        }}>
          <Metric label="Total">{money(sale.grand_total)}</Metric>
          <Metric label="Paid">{money(sale.paid_amount)}</Metric>
          <Metric label="Due">
            <BalanceText sale={sale} sx={{ fontSize: "inherit" }} />
          </Metric>
        </Box>
      </Box>
      <Divider />
    </Paper>
  );
}

/* ───────────────────────────── Skeleton (loading) ───────────────────────────── */

export function SaleCardSkeleton() {
  return (
    <Paper variant="outlined" sx={{ borderRadius: "14px", p: 2 }}>
      <Stack direction="row" justifyContent="space-between">
        <Box>
          <Skeleton width={110} height={22} />
          <Skeleton width={150} />
        </Box>
        <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: "999px" }} />
      </Stack>
      <Skeleton width={120} height={16} />
      <Skeleton variant="rounded" height={52} sx={{ mt: 1.5, borderRadius: "10px" }} />
      <Skeleton height={36} sx={{ mt: 1 }} />
    </Paper>
  );
}
