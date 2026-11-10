// PurchaseOrderFilters.js — sits next to PurchaseOrderList.js
//
// One row of filters:  Status ▾ · Payment ▾ · Supplier (searchable) · Branch · Search · Clear
// The Branch slot is whatever the list hands in (the shared <BranchPicker>): a select for the
// admin of a multi-branch pharmacy, the staff member's own branch as a chip, nothing otherwise.
// Status and payment options carry an icon in their status colour; the supplier
// picker is type-to-search with a fixed-height scrolling list, in the theme's primary.
// Pure UI: the list owns the state and passes it in.

import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { cssVar } from "../../theme/appColors";
import { fade, toneColor } from "./purchaseStyles";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import TimelapseOutlinedIcon from "@mui/icons-material/TimelapseOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";

import { ORDER_TONE, PAY_TONE } from "./PurchaseOrderDialog";

const SUPPLIER_LIST_HEIGHT = 280; // ~7 suppliers visible, the rest scroll

export { toneColor };

// Colours come from the same maps as the row chips, so a "Received" option and a
// "Received" chip can never disagree.
export const STATUS_OPTIONS = [
  { value: "all", label: "All orders", icon: AppsOutlinedIcon, tone: "primary" },
  { value: "draft", label: "Draft", icon: EditNoteOutlinedIcon, tone: ORDER_TONE?.draft },
  { value: "ordered", label: "Ordered", icon: LocalShippingOutlinedIcon, tone: ORDER_TONE?.ordered },
  { value: "received", label: "Received", icon: TaskAltIcon, tone: ORDER_TONE?.received },
  { value: "cancelled", label: "Cancelled", icon: CancelOutlinedIcon, tone: ORDER_TONE?.cancelled },
];

export const PAYMENT_OPTIONS = [
  { value: "all", label: "All payments", icon: AccountBalanceWalletOutlinedIcon, tone: "primary" },
  { value: "unpaid", label: "Unpaid", icon: MoneyOffIcon, tone: PAY_TONE?.unpaid },
  { value: "partial", label: "Partly paid", icon: TimelapseOutlinedIcon, tone: PAY_TONE?.partial },
  { value: "paid", label: "Paid", icon: PaidOutlinedIcon, tone: PAY_TONE?.paid },
];

/* Shared look for every filter box, so all of them line up and match. */
const inputSx = (color, active) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    bgcolor: active ? fade(color, 0.08) : "background.paper",
    transition: "background-color .15s",
    "& fieldset": { borderColor: active ? fade(color, 0.55) : undefined },
    "&:hover fieldset": { borderColor: active ? color : undefined },
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": active
    ? { color, fontWeight: 700 }
    : { fontWeight: 600 },
});

/* ---------------------------------------------------------------------------
   Status / Payment: a plain dropdown with an icon on every option
--------------------------------------------------------------------------- */
function FilterSelect({ label, value, onChange, options, width }) {
  const theme = useTheme();
  const current = options.find((o) => String(o.value) === String(value)) || options[0];
  const active = String(value) !== "all";
  const color = active ? toneColor(theme, current.tone) : theme.palette.text.secondary;
  const CurrentIcon = current.icon;

  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      sx={{ width, flexShrink: 0, ...inputSx(color, active) }}
      SelectProps={{
        renderValue: () => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <CurrentIcon sx={{ fontSize: 18, color, flexShrink: 0 }} />
            <Box
              component="span"
              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {current.label}
            </Box>
          </Box>
        ),
        MenuProps: {
          PaperProps: {
            sx: {
              mt: 0.75,
              borderRadius: 2.5,
              minWidth: 210,
              boxShadow: `0 10px 30px ${fade(cssVar("black"), 0.12)}`,
              "& .MuiList-root": { p: 0.75 },
            },
          },
        },
      }}
    >
      {options.map((o) => {
        const Icon = o.icon;
        const c = toneColor(theme, o.tone);
        const selected = String(o.value) === String(value);
        return (
          <MenuItem
            key={o.value}
            value={o.value}
            sx={{
              borderRadius: 1.5,
              py: 0.8,
              mb: 0.25,
              "&.Mui-selected, &.Mui-selected:hover": { bgcolor: fade(c, 0.1) },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.5,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: fade(c, 0.12),
                }}
              >
                <Icon sx={{ fontSize: 17, color: c }} />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={o.label}
              primaryTypographyProps={{ fontSize: 14, fontWeight: selected ? 700 : 500, noWrap: true }}
            />
          </MenuItem>
        );
      })}
    </TextField>
  );
}

/* The part of a name that matches what was typed, in bold primary. */
function Highlight({ text = "", query = "" }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <Box component="span" sx={{ color: "primary.main", fontWeight: 800 }}>
        {text.slice(i, i + q.length)}
      </Box>
      {text.slice(i + q.length)}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Supplier: type-to-search, fixed-height scrolling list, theme primary
--------------------------------------------------------------------------- */
function SupplierSelect({ value, onChange, suppliers, width }) {
  const theme = useTheme();
  const primary = toneColor(theme, "primary");
  const selected =
    value === "all" ? null : suppliers.find((s) => String(s.id) === String(value)) || null;
  const active = !!selected;

  return (
    <Autocomplete
      size="small"
      options={suppliers}
      value={selected}
      onChange={(_, s) => onChange?.(s ? String(s.id) : "all")}
      getOptionLabel={(s) => s?.supplier_name || ""}
      isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
      noOptionsText="No supplier matches"
      openOnFocus
      autoHighlight
      sx={{ width, flexShrink: 0 }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.75,
            borderRadius: 2.5,
            border: 1,
            borderColor: fade(primary, 0.15),
            boxShadow: `0 12px 32px ${fade(primary, 0.15)}`,

            // fixed-height list with its own scroller
            "& .MuiAutocomplete-listbox": {
              maxHeight: SUPPLIER_LIST_HEIGHT,
              p: 0.75,
              scrollbarWidth: "thin",
              scrollbarColor: `${fade(primary, 0.4)} transparent`,
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: fade(primary, 0.35),
                borderRadius: 3,
              },
            },
            "& .MuiAutocomplete-option": {
              borderRadius: 1.5,
              py: 0.75,
              px: 1,
              mb: 0.25,
              gap: 1.25,
            },
            "& .MuiAutocomplete-option.Mui-focused": { bgcolor: fade(primary, 0.08) },
            "& .MuiAutocomplete-option[aria-selected='true'], & .MuiAutocomplete-option[aria-selected='true'].Mui-focused":
              { bgcolor: fade(primary, 0.14) },
            "& .MuiAutocomplete-noOptions": { fontSize: 13.5, color: "text.secondary" },
          },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Supplier"
          placeholder={active ? "" : "All suppliers"}
          InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
          sx={{
            ...inputSx(primary, active),
            "& .MuiInputBase-input::placeholder": { color: "text.primary", opacity: 0.85 },
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                  <StorefrontOutlinedIcon
                    sx={{ fontSize: 18, color: active ? primary : "text.secondary" }}
                  />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, s, { selected: isSelected, inputValue }) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={s.id} {...rest}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                bgcolor: fade(primary, isSelected ? 0.2 : 0.1),
              }}
            >
              <StorefrontOutlinedIcon sx={{ fontSize: 16, color: primary }} />
            </Box>
            <Box
              component="span"
              title={s.supplier_name}
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                fontWeight: isSelected ? 700 : 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Highlight text={s.supplier_name} query={inputValue} />
            </Box>
            {isSelected && <CheckIcon sx={{ fontSize: 18, color: primary, flexShrink: 0 }} />}
          </Box>
        );
      }}
    />
  );
}

/* ---------------------------------------------------------------------------
   The row
--------------------------------------------------------------------------- */
export default function PurchaseOrderFilters({
  status = "all",
  onStatusChange,
  payment = "all",
  onPaymentChange,
  supplier = "all",
  onSupplierChange,
  suppliers = null, // pass the list to show the Supplier picker; null hides it
  branchPicker = null, // a node (the shared BranchPicker) — shown after the supplier
  branchActive = false, // a branch is picked → counts as a filter for "Clear"
  search = "",
  onSearchChange,
  onClear,
  searchPlaceholder = "Search PO number, supplier, invoice…",
}) {
  const theme = useTheme();
  const primary = toneColor(theme, "primary");
  const anyActive = status !== "all" || payment !== "all" || supplier !== "all" || !!search || branchActive;

  return (
    <Box
      sx={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        flexWrap: "wrap",
        px: { xs: 2, md: 2.5 },
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: fade(primary, 0.025),
      }}
    >
      <FilterSelect
        label="Status"
        value={status}
        onChange={onStatusChange}
        options={STATUS_OPTIONS}
        width={{ xs: "calc(50% - 5px)", sm: 175 }}
      />

      <FilterSelect
        label="Payment"
        value={payment}
        onChange={onPaymentChange}
        options={PAYMENT_OPTIONS}
        width={{ xs: "calc(50% - 5px)", sm: 175 }}
      />

      {suppliers && (
        <SupplierSelect
          value={supplier}
          onChange={onSupplierChange}
          suppliers={suppliers}
          width={{ xs: branchPicker ? "calc(50% - 5px)" : "100%", sm: 240 }}
        />
      )}

      {branchPicker && (
        <Box sx={{ width: { xs: suppliers ? "calc(50% - 5px)" : "100%", sm: "auto" }, display: "flex", "& > *": { flex: { xs: 1, sm: "0 0 auto" } } }}>
          {branchPicker}
        </Box>
      )}

      <TextField
        size="small"
        value={search}
        onChange={(e) => onSearchChange?.(e.target.value)}
        placeholder={searchPlaceholder}
        sx={{
          flex: 1,
          minWidth: { xs: "100%", sm: 220 },
          "& .MuiOutlinedInput-root": {
            borderRadius: 2.5,
            bgcolor: "background.paper",
            fontSize: 14,
            ...(search && { "& fieldset": { borderColor: fade(primary, 0.55) } }),
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: search ? "primary.main" : "text.secondary" }} />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => onSearchChange?.("")} aria-label="Clear search">
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {anyActive && onClear && (
        <Button
          size="small"
          onClick={onClear}
          startIcon={<FilterAltOffOutlinedIcon />}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            color: "text.secondary",
            flexShrink: 0,
            "&:hover": { color: "error.main", bgcolor: fade(toneColor(theme, "error"), 0.06) },
          }}
        >
          Clear
        </Button>
      )}
    </Box>
  );
}