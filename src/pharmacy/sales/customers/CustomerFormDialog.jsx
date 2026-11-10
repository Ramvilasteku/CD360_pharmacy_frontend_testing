// src/pharmacy/sales/customers/CustomerFormDialog.jsx
//
// Add or edit a POS customer. One small dialog, used from two places:
//   • the POS customer box ("Add customer") — sales/create/CustomerSection.jsx
//   • the Customers screen — sales/customers/Customers.jsx
//
// Why a dialog and not a page: a counter customer is five short fields, and the pharmacist
// is mid-bill. Project convention is dialogs for small pharmacy forms, in-page for big ones.
//
// WHAT CHANGED ON 25 OCT
//   Before this, a "new" customer was never created on purpose. The POS let you type a name
//   and number, and routes/Pharmacy/pharmacySales.js silently INSERTed a customer row while
//   saving the bill. Typos became permanent records. Creating a customer is now an explicit
//   act, and this dialog is that act.
//
// API — routes/Pharmacy/pharmacyCustomer.js, mounted at /api/pharmacy/customers
//   POST   /post         { name, mobile, email?, gender?, age? }   needs pharmacy.customers.create
//   PUT    /update/:id   same body                                  needs pharmacy.customers.edit
//
// The server is the authority on validation; the checks here exist so the pharmacist is
// told before a round trip, not instead of it. Two server answers are handled specially:
//   409  the same name + mobile already exists. Not an error the user caused — it means
//        "this person is already on file", so the dialog offers to use that record instead
//        of making them retype anything.
//   403  permission removed since the screen loaded (usePermissionPolling refreshes every
//        60s, so this is reachable). Said plainly rather than as "failed".

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, MenuItem, Stack, TextField,
  Typography, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PhoneIcon from "@mui/icons-material/Phone";

const API = process.env.REACT_APP_URL;

const GENDERS = [
  { value: "", label: "Not said" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const EMPTY = { name: "", mobile: "", email: "", gender: "", age: "" };

const digitsOf = (v) => String(v || "").replace(/\D/g, "");

/**
 * Mirrors validateOptionalFields() plus the required-field checks in
 * routes/Pharmacy/pharmacyCustomer.js. Kept in step with it deliberately — a rule that is
 * stricter here than on the server blocks a legitimate save, and a rule that is looser
 * just moves the message later.
 */
function validate(form) {
  const e = {};
  const name = form.name.trim();
  const digits = digitsOf(form.mobile);

  if (!name) e.name = "Name is required";
  else if (name.length > 150) e.name = "Too long (max 150)";

  if (!digits) e.mobile = "Mobile is required";
  else if (digits.length < 10) e.mobile = "Needs at least 10 digits";
  else if (form.mobile.trim().length > 15) e.mobile = "Too long (max 15)";

  if (form.email.trim() && form.email.trim().length > 150) e.email = "Too long (max 150)";

  if (form.age !== "" && form.age !== null) {
    const n = Number(form.age);
    if (!Number.isInteger(n) || n < 0 || n > 255) e.age = "0–255";
  }

  return e;
}

export default function CustomerFormDialog({
  open,
  onClose,
  /** null/undefined → add. A customer object → edit that customer. */
  customer = null,
  /** Called with the saved customer row from the server. */
  onSaved,
  /** Prefill for the add case — the digits already typed at the counter. */
  initialMobile = "",
}) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const editing = !!(customer && customer.id);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  // Set when the server answers 409: { id, message }. Lets the user adopt the existing
  // record rather than being told "already exists" and left to work it out.
  const [duplicate, setDuplicate] = useState(null);

  // Reset every time the dialog opens, so a cancelled edit never bleeds into the next one.
  //
  // `customer` is read for its field values whether or not it has an id. With an id this is
  // an edit; WITHOUT one it is a create that carries across what the pharmacist already
  // typed on the bill (POS CustomerSection passes { ...customer, id: undefined }). Getting
  // this wrong means they retype the name they just entered, which is exactly the friction
  // the old silent-create was hiding.
  useEffect(() => {
    if (!open) return;
    const src = customer || {};
    setForm({
      name: src.name || "",
      mobile: digitsOf(src.mobile) || digitsOf(initialMobile),
      email: src.email || "",
      gender: src.gender || "",
      age: src.age === null || src.age === undefined || src.age === "" ? "" : String(src.age),
    });
    setErrors({});
    setServerError("");
    setDuplicate(null);
    setSaving(false);
  }, [open, editing, customer, initialMobile]);

  const set = (field) => (event) => {
    const value = event.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    // Clear only this field's error as they fix it; leave the rest shown.
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
    setServerError("");
    setDuplicate(null);
  };

  const submit = async () => {
    const found = validate(form);
    if (Object.keys(found).some((k) => found[k])) {
      setErrors(found);
      return;
    }

    setSaving(true);
    setServerError("");
    setDuplicate(null);

    const body = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || null,
      gender: form.gender || null,
      age: form.age === "" ? null : Number(form.age),
    };

    try {
      const url = editing
        ? `${API}/api/pharmacy/customers/update/${customer.id}`
        : `${API}/api/pharmacy/customers/post`;
      const res = editing
        ? await axios.put(url, body, { withCredentials: true })
        : await axios.post(url, body, { withCredentials: true });

      const saved = res.data?.data;
      onSaved?.(saved, { created: !editing });
      onClose?.();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 409 && data?.existing_id) {
        setDuplicate({ id: data.existing_id, message: data.message });
      } else if (status === 403) {
        setServerError(
          editing
            ? "You don't have permission to edit customers. Ask your admin for pharmacy.customers.edit."
            : "You don't have permission to add customers. Ask your admin for pharmacy.customers.create."
        );
      } else {
        setServerError(data?.message || "Could not save. Check your connection and try again.");
      }
      setSaving(false);
    }
  };

  // Enter saves from any single-line field; Escape is MUI's default close.
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !saving) {
      e.preventDefault();
      submit();
    }
  };

  const useExisting = () => {
    // Hand the parent the record that already exists. The POS then selects that customer
    // for the bill, which is what the pharmacist was trying to achieve anyway.
    onSaved?.({ ...form, id: duplicate.id, mobile: form.mobile.trim(), name: form.name.trim() },
              { created: false, adopted: true });
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isPhone}
      PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: "flex", alignItems: "center", gap: 1.25,
          borderBottom: 1, borderColor: "divider", pr: 1,
        }}
      >
        {editing ? <EditOutlinedIcon color="primary" /> : <PersonAddAlt1Icon color="primary" />}
        <Typography component="span" sx={{ fontWeight: 700, flex: 1, fontSize: 18 }}>
          {editing ? "Edit customer" : "Add customer"}
        </Typography>
        <IconButton onClick={onClose} disabled={saving} size="small" aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2} onKeyDown={onKeyDown}>
          {!editing && (
            <Typography variant="body2" color="text.secondary">
              This saves the customer to your customer list straight away, so the next bill
              finds them by phone number.
            </Typography>
          )}

          {duplicate && (
            <Alert
              severity="info"
              action={
                <Button size="small" onClick={useExisting} sx={{ fontWeight: 700 }}>
                  Use it
                </Button>
              }
            >
              {duplicate.message || "This customer is already on file."}
            </Alert>
          )}

          {serverError && <Alert severity="error">{serverError}</Alert>}

          <TextField
            label="Mobile"
            value={form.mobile}
            onChange={set("mobile")}
            error={!!errors.mobile}
            helperText={errors.mobile || " "}
            required
            autoFocus={!editing && !initialMobile}
            inputProps={{ inputMode: "tel", maxLength: 15 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            fullWidth
          />

          <TextField
            label="Full name"
            value={form.name}
            onChange={set("name")}
            error={!!errors.name}
            helperText={errors.name || " "}
            required
            autoFocus={!editing && !!initialMobile}
            inputProps={{ maxLength: 150 }}
            fullWidth
          />

          <Stack direction="row" spacing={1.5}>
            <TextField
              select
              label="Gender"
              value={form.gender}
              onChange={set("gender")}
              sx={{ flex: 1 }}
            >
              {GENDERS.map((g) => (
                <MenuItem key={g.value || "none"} value={g.value}>{g.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Age"
              value={form.age}
              onChange={set("age")}
              error={!!errors.age}
              helperText={errors.age || " "}
              inputProps={{ inputMode: "numeric", maxLength: 3 }}
              sx={{ width: 110 }}
            />
          </Stack>

          <TextField
            label="Email (optional)"
            value={form.email}
            onChange={set("email")}
            error={!!errors.email}
            helperText={errors.email || " "}
            inputProps={{ inputMode: "email", maxLength: 150 }}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, minWidth: 140 }}
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Add customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}