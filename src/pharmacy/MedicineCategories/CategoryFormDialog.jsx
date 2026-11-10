// src/components/pharmacy/categories/CategoryFormDialog.jsx
//
// Add / edit a single category — same dialog, pre-filled on edit.
// Owned state only — the parent passes `initial` (null = create mode)
// and an `onSave(payload)` callback. The parent decides what to do
// with the payload (POST or PUT).

import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Avatar, Typography, IconButton, TextField, MenuItem,
  Alert, Button, CircularProgress,
} from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import CloseIcon from "@mui/icons-material/Close";

export default function CategoryFormDialog({
  open,
  onClose,
  onSave,
  initial,
  isMobile,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.category_name || "");
      setDescription(initial?.description || "");
      setStatus(initial?.status || "active");
      setErr("");
    }
  }, [open, initial]);

  const submit = async () => {
    setErr("");
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Category name is required");
      return;
    }
    if (trimmed.length > 255) {
      setErr("Name too long (max 255)");
      return;
    }

    const payload = {
      category_name: trimmed,
      description: description?.trim() || null,
    };
    if (initial?.id) payload.status = status;

    setSaving(true);
    try {
      await onSave(payload);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: "#0f766e", width: 32, height: 32 }}>
            <CategoryIcon fontSize="small" />
          </Avatar>
          <Typography fontWeight={700}>
            {initial?.id ? "Edit category" : "Add new category"}
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2} style={{ marginTop: "20px" }}>
          <TextField
            label="Category name"
            required
            autoFocus
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit();
            }}
            inputProps={{ maxLength: 255 }}
            helperText={`${name.length} / 255`}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. For bacterial infections, prescribed by physicians"
          />
          {initial?.id && (
            <TextField
              select
              label="Status"
              fullWidth
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          )}
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving}
          startIcon={saving && <CircularProgress size={16} color="inherit" />}
          sx={{
            bgcolor: "#0f766e",
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 2,
            px: 3,
            "&:hover": { bgcolor: "#0d5a54" },
          }}
        >
          {saving ? "Saving…" : initial?.id ? "Save changes" : "Create category"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
