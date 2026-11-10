// src/pharmacy/inventory/AssignBranchDialog.js
//
// Give a branch to stock that has none yet (batches from before the pharmacy used branches).
// Admin of a multi-branch pharmacy only — the caller hides it otherwise.
//
//   one batch     PATCH /api/pharmacy/batches/update/branch/:id        { branch }
//   all of them   PATCH /api/pharmacy/batches/update/branch-unassigned { branch }
//
// Only batches with NO branch can be assigned; stock that already sits in a branch moves with a
// transfer instead. Nothing else about the batch changes.

import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography,
} from "@mui/material";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import { BATCHES_API, apiMessage, buttonSx, http } from "./inventoryShared";
import { cssVar, fade } from "../../theme/appColors";

/**
 *   batch     the batch to assign (single), or null for "all unassigned"
 *   count     how many batches have no branch (all-unassigned mode)
 *   branch    the branch already chosen (all-unassigned mode: picked in the banner)
 *   branches  the pharmacy's branches
 */
export default function AssignBranchDialog({ open, batch, count = 0, branch: preset = "", branches = [], onClose, onSaved }) {
  const [branch, setBranch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const all = !batch;

  useEffect(() => {
    if (!open) return;
    setBranch(preset || "");
    setError("");
    setSaving(false);
  }, [open, preset]);

  const save = async () => {
    if (!branch) {
      setError("Choose the branch.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const r = all
        ? await http.patch(`${BATCHES_API}/update/branch-unassigned`, { branch })
        : await http.patch(`${BATCHES_API}/update/branch/${batch.id}`, { branch });
      onSaved(r.data?.message || "Branch assigned");
    } catch (e) {
      setError(apiMessage(e, "The branch wasn't assigned. Please try again."));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth aria-labelledby="assign-title" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle id="assign-title" sx={{ display: "flex", alignItems: "center", gap: 1.25, pb: 1 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", flexShrink: 0, color: cssVar("primary"), bgcolor: fade(cssVar("primary"), 0.1) }}>
          <StoreOutlinedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            {all ? `Assign ${count} ${count === 1 ? "batch" : "batches"} to ${branch || "a branch"}?` : "Assign a branch"}
          </Typography>
          {!all && (
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
              {batch.medicine_name} · batch {batch.batch_number}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: "8px !important" }}>
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", mb: 2 }}>
          {all
            ? "Every batch that has no branch yet goes to this branch, where it can then be sold, adjusted and transferred."
            : "Choose the branch whose shelf this batch is on. It can then be sold and adjusted there."}{" "}
          Stock that already belongs to a branch moves with a transfer.
        </Typography>
        {!all && (
          <TextField
            select
            fullWidth
            size="small"
            label="Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            InputProps={{ sx: { borderRadius: 2 } }}
          >
            {branches.map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </TextField>
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
          onClick={save}
          disabled={saving || !branch}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ ...buttonSx, px: 2.5 }}
        >
          {all ? "Assign all" : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}