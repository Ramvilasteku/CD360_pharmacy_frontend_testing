// src/pharmacy/inventory/LocationDialog.js
//
// "Where is this batch?" — a small popup to move one batch to another shelf.
//
//   PATCH /api/pharmacy/batches/update/location/:id   { storage_location }
//   (empty → the batch uses the medicine's default shelf again)
//
// Needs pharmacy.medicines.edit (the caller hides the button otherwise).

import React, { useEffect, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, TextField, Typography,
} from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { BATCHES_API, apiMessage, buttonSx, http } from "./inventoryShared";
import { cssVar, fade } from "../../theme/appColors";

const MAX = 100;

export default function LocationDialog({ open, batch, suggestions = [], onClose, onSaved }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && batch) {
      setValue(batch.storage_location || "");
      setError("");
      setSaving(false);
    }
  }, [open, batch]);

  if (!batch) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  const unchanged = trimmed === (batch.storage_location || "");
  const tooLong = trimmed.length > MAX;
  const fallback = batch.medicine_location;

  const save = async (next = trimmed) => {
    setSaving(true);
    setError("");
    try {
      const r = await http.patch(`${BATCHES_API}/update/location/${batch.id}`, { storage_location: next || null });
      onSaved(r.data.data, r.data.message);
    } catch (e) {
      setError(apiMessage(e, "The location wasn't saved. Please try again."));
      setSaving(false);
    }
  };

  const options = [...new Set(suggestions.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="xs"
      fullWidth
      aria-labelledby="loc-dialog-title"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle id="loc-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1.25, pb: 1 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", flexShrink: 0, color: cssVar("primary"), bgcolor: fade(cssVar("primary"), 0.1) }}>
          <PlaceOutlinedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }} noWrap>
            Shelf for batch {batch.batch_number}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
            {batch.medicine_name}
            {batch.branch ? ` · ${batch.branch}` : ""}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: "8px !important" }}>
        <Autocomplete
          freeSolo
          options={options}
          inputValue={value}
          onInputChange={(_, v) => setValue(v)}
          disableClearable
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              size="small"
              label="Location"
              placeholder="Rack B / Shelf 3"
              error={tooLong}
              helperText={tooLong ? `At most ${MAX} characters` : fallback ? `Leave empty to use the medicine's shelf (${fallback})` : "Rack, shelf, drawer or fridge"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !unchanged && !tooLong && !saving) {
                  e.preventDefault();
                  save();
                }
              }}
              InputProps={{ ...params.InputProps, sx: { borderRadius: 2 } }}
            />
          )}
        />
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
          onClick={() => save()}
          disabled={saving || unchanged || tooLong}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ ...buttonSx, px: 2.5 }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}