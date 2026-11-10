// src/pharmacy/inventory/AdjustStockDialog.js
//
// Write off or correct the stock of ONE batch — a small popup.
//
//   POST /api/pharmacy/stock-adjustments/post
//     { medicine_id, batch_id, adjustment_type: 'decrease'|'increase', quantity,
//       unit: 'strip'|'tablet', reason, notes, branch }
//   The server moves the batch and writes the stock ledger in one go (409 when the batch
//   holds less than you take out).
//
// Damaged / expired / lost can only take stock OUT; a count or a correction can go either way.
// Needs pharmacy.stock.create (the caller hides the button otherwise).

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  InputAdornment, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { ADJUST_API, apiMessage, buttonSx, http, nums } from "./inventoryShared";
import { describeStock, plural } from "../shared/pharmacyUnits";
import { cssVar, fade, toneInk } from "../../theme/appColors";

const REASONS = [
  { value: "damaged", label: "Damaged", out: true },
  { value: "expired", label: "Expired", out: true },
  { value: "lost", label: "Lost / missing", out: true },
  { value: "physical_count", label: "Physical count" },
  { value: "correction", label: "Correction" },
  { value: "other", label: "Other" },
];

export default function AdjustStockDialog({ open, batch, branch, onClose, onSaved }) {
  const upp = Math.max(1, Number(batch?.units_per_pack) || 1);
  const word = batch?.pack_word || (upp > 1 ? "strip" : "pack");
  const available = Number(batch?.quantity_available) || 0;

  const [direction, setDirection] = useState("decrease");
  const [unit, setUnit] = useState("strip");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("damaged");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open || !batch) return;
    const expired = batch.stock_status === "expired";
    setDirection("decrease");
    setUnit(upp > 1 && (expired ? available % upp === 0 : available >= upp) ? "strip" : "tablet");
    setQty(expired && available > 0 ? String(upp > 1 && available % upp === 0 ? available / upp : available) : "");
    setReason(expired ? "expired" : "damaged");
    setNotes("");
    setError("");
    setTried(false);
    setSaving(false);
  }, [open, batch, upp, available]);

  const n = Number(qty);
  const valid = qty !== "" && Number.isInteger(n) && n >= 1;
  const tablets = valid ? (unit === "strip" ? n * upp : n) : 0;
  const after = direction === "decrease" ? available - tablets : available + tablets;
  const tooMany = direction === "decrease" && tablets > available;
  const reasons = useMemo(() => REASONS.filter((r) => direction === "decrease" || !r.out), [direction]);

  if (!batch) return null;

  const unitWord = unit === "strip" ? word : "tablet";
  const qtyError = tried && !valid ? "Enter a whole number" : tooMany ? `Only ${describeStock(available, upp, word)} in this batch` : "";

  const submit = async () => {
    setTried(true);
    setError("");
    if (!valid || tooMany) return;
    setSaving(true);
    try {
      const r = await http.post(ADJUST_API, {
        medicine_id: batch.medicine_id,
        batch_id: batch.id,
        adjustment_type: direction,
        quantity: n,
        unit: upp > 1 ? unit : "tablet",
        reason,
        notes: notes.trim() || undefined,
        branch: batch.branch || branch || undefined,
      });
      onSaved(r.data?.message || "Stock updated", r.data?.data);
    } catch (e) {
      setError(apiMessage(e, "The stock wasn't changed. Please try again."));
      setSaving(false);
    }
  };

  const takeAll = () => {
    if (upp > 1 && available % upp === 0) {
      setUnit("strip");
      setQty(String(available / upp));
    } else {
      setUnit("tablet");
      setQty(String(available));
    }
  };

  const outTone = direction === "decrease" ? "error" : "success";

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth aria-labelledby="adj-title" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle id="adj-title" sx={{ pb: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{direction === "decrease" ? "Write off stock" : "Add stock"}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
          {batch.medicine_name} · batch {batch.batch_number}
          {batch.branch ? ` · ${batch.branch}` : ""}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 1.5, py: 1, mb: 2, borderRadius: 2, bgcolor: fade(cssVar("primary"), 0.05) }}>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>In this batch</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, ...nums }}>
            {describeStock(available, upp, word)}
            {upp > 1 && <Box component="span" sx={{ fontWeight: 500, color: "text.secondary", ml: 0.75, fontSize: 12.5 }}>({available} tablets)</Box>}
          </Typography>
        </Box>

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={direction}
          onChange={(_, v) => {
            if (!v) return;
            setDirection(v);
            if (v === "increase" && REASONS.find((r) => r.value === reason)?.out) setReason("physical_count");
          }}
          sx={{ mb: 2, "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, gap: 0.75 } }}
        >
          <ToggleButton value="decrease" color="error">
            <RemoveCircleOutlineIcon fontSize="small" /> Take out
          </ToggleButton>
          <ToggleButton value="increase" color="success">
            <AddCircleOutlineIcon fontSize="small" /> Add back
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: "grid", gridTemplateColumns: upp > 1 ? "1fr auto" : "1fr", gap: 1, alignItems: "start" }}>
          <TextField
            size="small"
            label="Quantity"
            value={qty}
            autoFocus
            onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 7))}
            error={Boolean(qtyError)}
            helperText={qtyError || (valid && unit === "strip" && upp > 1 ? `${tablets} tablets` : " ")}
            inputProps={{ inputMode: "numeric", "aria-label": "Quantity" }}
            InputProps={{
              sx: { borderRadius: 2 },
              endAdornment: upp <= 1 ? <InputAdornment position="end">{plural(word, n || 2)}</InputAdornment> : undefined,
            }}
          />
          {upp > 1 && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={unit}
              onChange={(_, v) => v && setUnit(v)}
              aria-label="Unit"
              sx={{ height: 40, "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, px: 1.5 } }}
            >
              <ToggleButton value="strip">{plural(word, 2)}</ToggleButton>
              <ToggleButton value="tablet">tablets</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>
        {direction === "decrease" && available > 0 && (
          <Button size="small" onClick={takeAll} sx={{ ...buttonSx, mt: -1, mb: 1, px: 0.5, minWidth: 0 }}>
            Write off all {describeStock(available, upp, word)}
          </Button>
        )}

        <TextField
          select
          fullWidth
          size="small"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mt: 1 }}
          InputProps={{ sx: { borderRadius: 2 } }}
        >
          {reasons.map((r) => (
            <MenuItem key={r.value} value={r.value}>
              {r.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          size="small"
          label="Note (optional)"
          placeholder="e.g. strips crushed in the delivery box"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          sx={{ mt: 2 }}
          InputProps={{ sx: { borderRadius: 2 } }}
        />

        {valid && !tooMany && (
          <Typography sx={{ mt: 2, fontSize: 13, color: toneInk(outTone), fontWeight: 600 }}>
            {direction === "decrease" ? "Takes out" : "Adds"} {n} {plural(unitWord, n)} · leaves {describeStock(after, upp, word)}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving} sx={buttonSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          color={direction === "decrease" ? "error" : "success"}
          onClick={submit}
          disabled={saving || (tried && (!valid || tooMany))}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ ...buttonSx, px: 2.5 }}
        >
          {direction === "decrease" ? "Write off" : "Add stock"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}