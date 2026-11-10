// src/pharmacy/account/MyProfile.jsx
//
// My profile — for pharmacy staff (/pharmacy/profile). Any role, own record only.
//
//   GET /api/pharmacy/account/get/profile
//   PUT /api/pharmacy/account/update/profile     name, email, mobile, qualification, address
//   PUT /api/pharmacy/account/update/password    current + new password
//   POST /api/pharmacy/account/update/photo      new profile photo (PNG / JPG, up to 2 MB)
//   DELETE /api/pharmacy/account/delete/photo    remove it
//
// Uses the full width: the details card on the left, the password card beside it
// (stacked on a phone).

import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  Alert, Avatar, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, Skeleton, Snackbar,
  TextField, Tooltip, Typography,
} from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { roleLabel } from "../shell/shellNav";

const API_BASE = process.env.REACT_APP_SITE_URL || "";
const API = `${API_BASE}/api/pharmacy/account`;
const http = axios.create({ withCredentials: true });

const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = String(d).slice(0, 10).split("-").map(Number);
  if (!y) return "—";
  return new Date(y, m - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
// ?v= busts the browser cache: a new photo keeps the same file name (profile.jpg)
const photoUrl = (p, v) => (!p ? null : /^(https?:|data:)/i.test(p) ? p : `${process.env.REACT_APP_URL || API_BASE}/Images/${p}${v ? `?v=${v}` : ""}`);
const PHOTO_MAX = 2 * 1024 * 1024;

/* One label + value in the details grid. */
function Field({ label, value, wide }) {
  return (
    <Box sx={{ gridColumn: wide ? "1 / -1" : undefined, minWidth: 0 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "text.secondary", letterSpacing: "0.04em" }}>{label.toUpperCase()}</Typography>
      <Typography sx={{ fontSize: 14.5, fontWeight: 600, mt: 0.25, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{value || "—"}</Typography>
    </Box>
  );
}

/* A password box with a show / hide eye. */
function PasswordField({ label, value, onChange, disabled, autoComplete, error, helperText }) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      label={label}
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      autoComplete={autoComplete}
      error={error}
      helperText={helperText}
      fullWidth
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow((v) => !v)} aria-label={show ? `Hide ${label}` : `Show ${label}`} edge="end">
              {show ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

/* Change password: current, new, confirm. */
function PasswordCard({ card, onDone }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const rules = [
    [f.next.length >= 8, "At least 8 characters"],
    [/[A-Za-z]/.test(f.next) && /\d/.test(f.next), "Letters and at least one number"],
  ];
  const mismatch = !!f.confirm && f.confirm !== f.next;
  const ready = f.current && rules.every(([ok]) => ok) && f.confirm === f.next;

  const close = () => {
    setOpen(false);
    setF({ current: "", next: "", confirm: "" });
    setErr(null);
  };
  const save = async () => {
    if (!ready) return;
    setBusy(true);
    setErr(null);
    try {
      await http.put(`${API}/update/password`, { current_password: f.current, new_password: f.next });
      close();
      onDone("Password changed — use the new one next time you sign in");
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't change your password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ ...card, p: { xs: 2, md: 2.5 }, alignSelf: "start" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, display: "grid", placeItems: "center", flexShrink: 0, color: "primary.main", bgcolor: (t) => `color-mix(in srgb, ${t.palette.primary.main} 12%, transparent)` }}>
          <LockOutlinedIcon />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>Password</Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>The password you sign in with</Typography>
        </Box>
      </Box>

      {!open ? (
        <Button variant="outlined" startIcon={<LockResetOutlinedIcon />} onClick={() => setOpen(true)} fullWidth sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
          Change password
        </Button>
      ) : (
        <Box component="form" onSubmit={(e) => { e.preventDefault(); save(); }} sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>
          <PasswordField label="Current password" value={f.current} onChange={(v) => setF({ ...f, current: v })} disabled={busy} autoComplete="current-password" />
          <PasswordField label="New password" value={f.next} onChange={(v) => setF({ ...f, next: v })} disabled={busy} autoComplete="new-password" />
          <Box sx={{ mt: -0.75 }}>
            {rules.map(([ok, text]) => (
              <Typography key={text} sx={{ fontSize: 12, color: ok ? "success.main" : "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
                {ok ? "✓" : "•"} {text}
              </Typography>
            ))}
          </Box>
          <PasswordField
            label="Confirm new password"
            value={f.confirm}
            onChange={(v) => setF({ ...f, confirm: v })}
            disabled={busy}
            autoComplete="new-password"
            error={mismatch}
            helperText={mismatch ? "Doesn't match the new password" : " "}
          />
          {err && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
              {err}
            </Alert>
          )}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={close} disabled={busy} sx={{ textTransform: "none", fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={!ready || busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              Update password
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function MyProfile() {
  const roles = useSelector((s) => s.auth?.roles);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null); // editing when set
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);
  const [photoBroken, setPhotoBroken] = useState(false);
  const [photoVer, setPhotoVer] = useState(0); // bumped after an upload so the new picture shows
  const [photoMenu, setPhotoMenu] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const fileRef = useRef(null);

  const uploadPhoto = async (file) => {
    if (!file) return;
    setPhotoError(null);
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setPhotoError("Use a PNG or JPG photo");
      return;
    }
    if (file.size > PHOTO_MAX) {
      setPhotoError("The photo is over 2 MB — choose a smaller one");
      return;
    }
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const r = await http.post(`${API}/update/photo`, fd);
      setProfile((p) => r.data?.data || p);
      setPhotoBroken(false);
      setPhotoVer(Date.now());
      setToast("Photo updated");
    } catch (e) {
      setPhotoError(e?.response?.data?.message || "Couldn't upload the photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoMenu(null);
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const r = await http.delete(`${API}/delete/photo`);
      setProfile((p) => r.data?.data || { ...p, profile_photo: null });
      setToast("Photo removed");
    } catch (e) {
      setPhotoError(e?.response?.data?.message || "Couldn't remove the photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await http.get(`${API}/get/profile`);
      setProfile(r.data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = () => {
    setSaveError(null);
    setForm({
      name: profile.name || "",
      email: profile.email || "",
      mobile: profile.mobile || "",
      qualification: profile.qualification || "",
      address: profile.address || "",
    });
  };

  const save = async () => {
    if (!form.name.trim()) {
      setSaveError("Name can't be empty");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setSaveError("Enter a valid email");
      return;
    }
    if (!/^\+?\d{10,13}$/.test(form.mobile.replace(/[\s-]/g, ""))) {
      setSaveError("Enter a valid mobile number (10 digits)");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const r = await http.put(`${API}/update/profile`, form);
      setProfile(r.data?.data || { ...profile, ...form });
      setForm(null);
      setToast("Profile saved");
      try {
        localStorage.setItem("userName", (r.data?.data?.name || form.name).trim());
      } catch (_) {
        /* the top bar picks it up on the next sign-in */
      }
    } catch (e) {
      setSaveError(e?.response?.data?.message || "Couldn't save your profile");
    } finally {
      setSaving(false);
    }
  };

  const card = { bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 3, overflow: "hidden" };

  if (loading) {
    return (
      <Box sx={{ width: "100%" }}>
        <Box sx={{ ...card, p: 3 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Skeleton variant="circular" width={72} height={72} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="40%" height={30} />
              <Skeleton width="25%" />
            </Box>
          </Box>
          <Skeleton variant="rounded" height={160} sx={{ mt: 3 }} />
        </Box>
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ width: "100%" }}>
        <Alert severity="warning" variant="outlined" action={<Button onClick={load} sx={{ textTransform: "none" }}>Try again</Button>} sx={{ borderRadius: 2 }}>
          {error || "Your profile wasn't found"}
        </Alert>
      </Box>
    );
  }

  const photo = !photoBroken ? photoUrl(profile.profile_photo, photoVer) : null;
  const role = roleLabel(profile.role, roles);

  return (
    <Box sx={{ width: "100%", display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 380px" }, gap: 2, alignItems: "start" }}>
      <Box sx={card}>
        {/* ---------- who ---------- */}
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: { xs: 2, md: 2.5 },
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            bgcolor: (t) => `color-mix(in srgb, ${t.palette.primary.main} 7%, ${t.palette.background.paper})`,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {/* the photo, with a camera button to change it */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={photo || undefined}
              imgProps={{ onError: () => setPhotoBroken(true) }}
              sx={{ width: 84, height: 84, fontSize: 32, fontWeight: 800, bgcolor: "primary.main", border: 3, borderColor: "background.paper", opacity: photoBusy ? 0.5 : 1 }}
            >
              {String(profile.name || "?").charAt(0).toUpperCase()}
            </Avatar>
            {photoBusy && <CircularProgress size={28} sx={{ position: "absolute", top: 28, left: 28 }} />}
            <Tooltip title={profile.profile_photo ? "Change photo" : "Add a photo"}>
              <IconButton
                size="small"
                aria-label={profile.profile_photo ? "Change photo" : "Add a photo"}
                disabled={photoBusy}
                onClick={(e) => (profile.profile_photo ? setPhotoMenu(e.currentTarget) : fileRef.current?.click())}
                sx={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 30,
                  height: 30,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  border: 2,
                  borderColor: "background.paper",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                <PhotoCameraOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(e) => {
                uploadPhoto(e.target.files?.[0]);
                e.target.value = ""; // the same file can be picked again
              }}
            />
            <Menu anchorEl={photoMenu} open={!!photoMenu} onClose={() => setPhotoMenu(null)} PaperProps={{ sx: { borderRadius: 2, minWidth: 190 } }}>
              <MenuItem
                onClick={() => {
                  setPhotoMenu(null);
                  fileRef.current?.click();
                }}
                sx={{ fontSize: 14 }}
              >
                <ListItemIcon>
                  <FileUploadOutlinedIcon fontSize="small" />
                </ListItemIcon>
                Upload a new photo
              </MenuItem>
              <MenuItem onClick={removePhoto} sx={{ fontSize: 14, color: "error.main" }}>
                <ListItemIcon>
                  <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
                </ListItemIcon>
                Remove photo
              </MenuItem>
            </Menu>
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: { xs: 19, md: 22 }, fontWeight: 800, lineHeight: 1.2 }} noWrap title={profile.name}>
              {profile.name}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: "text.secondary", mt: 0.25 }} noWrap>
              {role}
              {profile.branch ? ` · ${profile.branch}` : ""}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }} noWrap>
              Staff ID {profile.id} · Joined {fmtDate(profile.date_of_joining)}
            </Typography>
            {photoError ? (
              <Typography sx={{ fontSize: 12, color: "error.main", mt: 0.25, fontWeight: 600 }}>{photoError}</Typography>
            ) : (
              <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 0.25 }}>Photo: PNG or JPG, up to 2 MB</Typography>
            )}
          </Box>
          {!form && (
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={startEdit} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, flexShrink: 0 }}>
              Edit
            </Button>
          )}
        </Box>

        {/* ---------- details / edit ---------- */}
        {form ? (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={saving} required inputProps={{ maxLength: 100 }} />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={saving} required inputProps={{ maxLength: 150 }} />
              <TextField label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} disabled={saving} required inputProps={{ maxLength: 15, inputMode: "tel" }} />
              <TextField label="Qualification" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} disabled={saving} placeholder="e.g. B.Pharm" inputProps={{ maxLength: 150 }} />
              <TextField
                label="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={saving}
                multiline
                minRows={2}
                inputProps={{ maxLength: 500 }}
                sx={{ gridColumn: "1 / -1" }}
              />
            </Box>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1.5 }}>
              You sign in with your email, and the sign-in code is sent to your mobile — keep both current.
            </Typography>
            {saveError && (
              <Alert severity="error" variant="outlined" sx={{ mt: 1.5, borderRadius: 2 }}>
                {saveError}
              </Alert>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
              <Button onClick={() => setForm(null)} disabled={saving} sx={{ textTransform: "none", fontWeight: 600 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                disableElevation
                onClick={save}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
              >
                Save changes
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 3, rowGap: 2.25 }}>
            <Field label="Email" value={profile.email} />
            <Field label="Mobile" value={profile.mobile} />
            <Field label="Role" value={role} />
            <Field label="Branch" value={profile.branch} />
            <Field label="Qualification" value={profile.qualification} />
            <Field label="Joined on" value={fmtDate(profile.date_of_joining)} />
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Divider sx={{ mb: 2.25 }} />
              <Field label="Address" value={profile.address} wide />
            </Box>
          </Box>
        )}
      </Box>

      <PasswordCard card={card} onDone={setToast} />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}