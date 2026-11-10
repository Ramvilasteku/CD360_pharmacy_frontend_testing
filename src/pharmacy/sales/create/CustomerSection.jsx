// src/components/pharmacy/sales/create/CustomerSection.jsx
// Senior UX v2 — guided mobile-first flow for a pharmacy counter.
//
// Flow (what the pharmacist sees):
//   STEP 1 — ONLY the mobile input is visible
//   STEP 2 — Pharmacist types 2+ digits → matching patients drop down
//            • Tap one → fields appear PRE-FILLED (existing)
//            • Or tap "+ Add as new" / finish 10 digits → fields appear EMPTY (new)
//   STEP 3 — Other fields (name, email, gender, age) appear only after step 2
//            resolves one way or the other. No field clutter before that.
//
// Props: ({ customer, setCustomer, canAddCustomer })
//
// 25 OCT 2026 — "new patient" no longer means "a customer record will appear"
//   It used to. Typing a name and number here was enough: routes/Pharmacy/pharmacySales.js
//   INSERTed a customer row while saving the bill, and the POS reported "✓ New patient
//   added". Every mistyped number became a permanent half-right record that nobody chose
//   to create. That silent create is gone from the server.
//
//   So "new" here now means exactly one thing: this bill carries a name and number but is
//   NOT tied to a customer record — a walk-in. The sale still prints and is still
//   searchable by that name or number. Nothing is saved to the customer list.
//
//   To actually keep the customer, the pharmacist presses "Save to customers", which
//   creates the record there and then (POST /api/pharmacy/customers/post) and attaches it
//   to the bill. Deliberate act, de-duplicated server-side, permission-gated on
//   pharmacy.customers.create — if they lack it the button is not shown, and the bill still
//   goes through as a walk-in.

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import {
  Paper, Box, MenuItem, TextField, Typography, Stack, Chip,
  IconButton, CircularProgress, Popper, Grow, ClickAwayListener,
  List, ListItemButton, ListItemText, Divider, InputAdornment,
  Avatar, Button, Fade, Zoom, Collapse, Tooltip, Alert,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonIcon from "@mui/icons-material/Person";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import WcIcon from "@mui/icons-material/Wc";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CustomerFormDialog from "../customers/CustomerFormDialog";

const API = process.env.REACT_APP_URL;

// Shared brand tokens (match the pharmacy module)
const BRAND = {
  teal: "#0f766e",
  tealLight: "#14b8a6",
  tealSoft: "#f0fdfa",
  success: "#10b981",
  successSoft: "#ecfdf5",
  warning: "#f59e0b",
  warningSoft: "#fef3c7",
  danger: "#ef4444",
  slate: "#64748b",
  bg: "#f8fafc",
};

export default function CustomerSection({ customer, setCustomer, canAddCustomer = false }) {
  const theme = useTheme();

  // The Add/Save-customer dialog. Opened from the dropdown footer and from the new-patient
  // callout; both land on the same dialog so there is one way to create a customer.
  const [addOpen, setAddOpen] = useState(false);

  // ─── Search state ───
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);
  const anchorRef = useRef(null);

  // ─── UI mode ───
  //   "idle"      : only mobile visible, no decision yet
  //   "existing"  : an existing patient was picked (fields pre-filled)
  //   "new"       : user confirmed/started a new patient (fields empty)
  const [mode, setMode] = useState(
    customer.id ? "existing" : (customer.name ? "new" : "idle")
  );

  // ─── Edit toggle for existing patient (collapsed by default) ───
  const [editingExisting, setEditingExisting] = useState(false);

  // ─── Derived ───
  const digits = (customer.mobile || "").replace(/\D/g, "");
  const digitsCount = digits.length;
  const isPhoneValid = digitsCount >= 10 && digitsCount <= 15;

  // ─── Debounced mobile search ───
  useEffect(() => {
    // While we're in existing/new mode, don't re-search unless mobile is cleared
    if (mode === "existing") { setOpen(false); return; }
    if (digitsCount < 2) {
      setSuggestions([]); setOpen(false); setSearchedOnce(false);
      return;
    }

    let active = true;
    setLoading(true);
   const timer = setTimeout(async () => {
  try {
    const res = await axios.get(
      `${API}/api/pharmacy/customers/get/moblie-no/${encodeURIComponent(digits)}`,
      { withCredentials: true }
    );
    if (!active) return;
    const results = res.data?.data || [];
    setSuggestions(results);
    // Always open while in idle so the user sees the dropdown
    // (even with 0 results — they'll see "add as new")
    if (mode === "idle") setOpen(true);
    setSearchedOnce(true);
  } catch {
    if (active) {
      setSuggestions([]);
      if (mode === "idle") setOpen(true);
    }
  } finally {
    if (active) setLoading(false);
  }
}, 300);

    return () => { active = false; clearTimeout(timer); };
  }, [digits, digitsCount, mode]);

  // ─── Pick an existing customer ───
  const pickCustomer = (c) => {
    setCustomer({
      id: c.id,
      name: c.name || "",
      mobile: c.mobile || "",
      email: c.email || "",
      gender: c.gender || "",
      age: c.age || "",
      isNew: false,
    });
    setMode("existing");
    setOpen(false);
    setSuggestions([]);
    setEditingExisting(false);
  };

  // ─── Confirm as NEW patient (reveal empty fields) ───
  const continueAsNew = () => {
    // Keep whatever digits are typed, clear everything else
    setCustomer({
      id: null,
      name: "",
      mobile: digits,
      email: "",
      gender: "",
      age: "",
      isNew: true,
    });
    setMode("new");
    setOpen(false);
    setSuggestions([]);
  };

  // ─── A customer was created (or an existing duplicate adopted) in the dialog ───
  // It now has a real id, so the bill is tied to a record rather than being a walk-in.
  // Same shape as pickCustomer() so the rest of this component cannot tell them apart.
  const handleCustomerSaved = (saved) => {
    if (!saved) return;
    setCustomer({
      id: saved.id,
      name: saved.name || "",
      mobile: saved.mobile || "",
      email: saved.email || "",
      gender: saved.gender || "",
      age: saved.age === null || saved.age === undefined ? "" : saved.age,
      isNew: false,
    });
    setMode("existing");
    setOpen(false);
    setSuggestions([]);
    setEditingExisting(false);
  };

  // ─── Clear and start fresh ───
  const clearAll = () => {
    setCustomer({
      id: null, name: "", mobile: "", email: "",
      gender: "", age: "", isNew: false,
    });
    setSuggestions([]);
    setOpen(false);
    setMode("idle");
    setEditingExisting(false);
    setSearchedOnce(false);
  };

  // ─── Handle mobile typing (digits only) ───
  const handleMobileChange = (val) => {
    const d = val.replace(/\D/g, "").slice(0, 15);
    // If editing a saved customer's mobile → unlock and search again
    if (mode === "existing" && d !== customer.mobile.replace(/\D/g, "")) {
      setCustomer({
        id: null, name: "", mobile: d, email: "",
        gender: "", age: "", isNew: false,
      });
      setMode("idle");
      setEditingExisting(false);
      return;
    }
    // If we were in "new" mode and user wiped the mobile → go back to idle
    if (mode === "new" && d.length < 2) {
      setCustomer({
        id: null, name: "", mobile: d, email: "",
        gender: "", age: "", isNew: false,
      });
      setMode("idle");
      return;
    }
    setCustomer({ ...customer, mobile: d, isNew: mode === "new" });
  };

  const handleFieldChange = (field, value) => {
    setCustomer({ ...customer, [field]: value });
  };

  // ─── Status chip (header right) ───
  const statusChip = useMemo(() => {
    if (mode === "existing") {
      return (
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
          label="Existing patient"
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: BRAND.successSoft,
            color: BRAND.success,
            border: `1px solid ${alpha(BRAND.success, 0.3)}`,
            "& .MuiChip-icon": { color: BRAND.success },
          }}
        />
      );
    }
    if (mode === "new") {
      return (
        <Chip
          icon={<PersonAddAlt1Icon sx={{ fontSize: 16 }} />}
          label="New patient"
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: BRAND.warningSoft,
            color: "#B47900",
            border: `1px solid ${alpha(BRAND.warning, 0.3)}`,
            "& .MuiChip-icon": { color: "#B47900" },
          }}
        />
      );
    }
    return null;
  }, [mode]);

  const subtitleText = {
    idle: "Enter mobile number to search or add a patient",
    existing: "Dispensing for a returning patient",
    new: "Fill in the new patient's details",
  }[mode];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: `1px solid ${
          mode === "existing" ? alpha(BRAND.success, 0.3)
          : mode === "new" ? alpha(BRAND.warning, 0.3)
          : alpha(BRAND.teal, 0.15)
        }`,
        bgcolor: "#fff",
        transition: "all .25s",
        boxShadow: mode === "existing"
          ? `0 4px 16px ${alpha(BRAND.success, 0.1)}`
          : mode === "new"
            ? `0 4px 16px ${alpha(BRAND.warning, 0.08)}`
            : `0 2px 8px ${alpha(BRAND.teal, 0.04)}`,
      }}
    >
      {/* ─── HEADER ─── */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: "10px",
              bgcolor: alpha(BRAND.teal, 0.1), color: BRAND.teal,
              display: "grid", placeItems: "center",
            }}
          >
            <PersonIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16, lineHeight: 1.2 }}>
              Patient
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitleText}
            </Typography>
          </Box>
        </Stack>
        {statusChip}
      </Stack>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STATE: EXISTING — hero gradient card                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mode === "existing" && (
        <Zoom in timeout={300}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              background: `linear-gradient(135deg, ${BRAND.teal} 0%, ${BRAND.tealLight} 100%)`,
              color: "#fff",
              mb: editingExisting ? 2 : 0,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
                <Avatar
                  sx={{
                    width: { xs: 56, sm: 64 },
                    height: { xs: 56, sm: 64 },
                    bgcolor: "rgba(255,255,255,0.25)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: { xs: 22, sm: 26 },
                    border: "2px solid rgba(255,255,255,0.3)",
                    flexShrink: 0,
                  }}
                >
                  {customer.name?.[0]?.toUpperCase() || "?"}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.9, fontWeight: 600, letterSpacing: 0.4 }}
                  >
                    DISPENSING FOR
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{
                      lineHeight: 1.2,
                      fontSize: { xs: 18, sm: 22 },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {customer.name || "—"}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ mt: 0.5, flexWrap: "wrap", opacity: 0.95 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <PhoneIcon sx={{ fontSize: 14 }} />
                      <Typography variant="body2" fontWeight={600}>
                        {customer.mobile}
                      </Typography>
                    </Stack>
                    {customer.age && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <CakeOutlinedIcon sx={{ fontSize: 14 }} />
                        <Typography variant="body2">{customer.age}y</Typography>
                      </Stack>
                    )}
                    {customer.gender && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <WcIcon sx={{ fontSize: 14 }} />
                        <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                          {customer.gender}
                        </Typography>
                      </Stack>
                    )}
                    {customer.email && (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{ minWidth: 0 }}
                      >
                        <EmailOutlinedIcon sx={{ fontSize: 14 }} />
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 180,
                          }}
                        >
                          {customer.email}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignSelf: { xs: "stretch", sm: "auto" },
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <Tooltip title="Edit this patient's details">
                  <Button
                    onClick={() => setEditingExisting((e) => !e)}
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.5)",
                      textTransform: "none",
                      borderRadius: 2,
                      flex: { xs: 1, sm: "none" },
                      "&:hover": {
                        borderColor: "#fff",
                        bgcolor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    {editingExisting ? "Done" : "Edit"}
                  </Button>
                </Tooltip>
                <Tooltip title="Not this patient? Clear and search again">
                  <Button
                    onClick={clearAll}
                    size="small"
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.5)",
                      textTransform: "none",
                      borderRadius: 2,
                      flex: { xs: 1, sm: "none" },
                      "&:hover": {
                        borderColor: "#fff",
                        bgcolor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    Not them?
                  </Button>
                </Tooltip>
              </Stack>
            </Stack>
          </Paper>
        </Zoom>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STATE: IDLE or NEW — mobile input stays visible always      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mode !== "existing" && (
        <Box ref={anchorRef} sx={{ position: "relative", mb: 2 }}>
          <TextField
            label="Mobile number"
            required
            value={customer.mobile}
            onChange={(e) => handleMobileChange(e.target.value)}
            onFocus={() => {
              if (mode === "idle" && suggestions.length > 0) setOpen(true);
              if (mode === "idle" && digitsCount >= 2 && searchedOnce) setOpen(true);
            }}
            fullWidth
            autoComplete="off"
            autoFocus={mode === "idle" && digitsCount === 0}
            placeholder="Type patient's mobile number…"
            inputProps={{ inputMode: "numeric", maxLength: 15 }}
            InputProps={{
              sx: {
                borderRadius: 2.5,
                fontSize: 17,
                fontWeight: 600,
                "& input": { py: 1.5, letterSpacing: 0.5 },
              },
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon
                    sx={{
                      color: digitsCount > 0 ? BRAND.teal : "action.active",
                      fontSize: 22,
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {loading ? (
                    <CircularProgress size={18} sx={{ color: BRAND.teal }} />
                  ) : digitsCount > 0 ? (
                    <IconButton
                      size="small"
                      onClick={clearAll}
                      sx={{ color: "text.secondary" }}
                      aria-label="clear"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </InputAdornment>
              ),
            }}
          />

          {/* Live feedback below the input */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ mt: 1, minHeight: 20 }}
          >
            {digitsCount === 0 ? (
              <>
                <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  Type <strong>2 digits</strong> to see existing patients
                </Typography>
              </>
            ) : digitsCount === 1 ? (
              <Typography variant="caption" color="text.secondary">
                One more digit to start searching…
              </Typography>
            ) : digitsCount < 10 ? (
              <>
                <SearchIcon sx={{ fontSize: 14, color: BRAND.teal }} />
                <Typography variant="caption" sx={{ color: BRAND.teal, fontWeight: 600 }}>
                  Searching {digitsCount} / 10 digits
                </Typography>
              </>
            ) : (
              <>
                <CheckCircleIcon sx={{ fontSize: 14, color: BRAND.success }} />
                <Typography variant="caption" sx={{ color: BRAND.success, fontWeight: 600 }}>
                  Valid mobile
                </Typography>
              </>
            )}
          </Stack>

          {/* ─── Suggestions dropdown ─── */}
          <Popper
            open={open && mode === "idle" && digitsCount >= 2}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            transition
            style={{ zIndex: 1300, width: anchorRef.current?.offsetWidth }}
          >
            {({ TransitionProps }) => (
              <Grow {...TransitionProps} style={{ transformOrigin: "top" }}>
                <Paper
                  elevation={12}
                  sx={{
                    mt: 1,
                    maxHeight: 400,
                    overflow: "auto",
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <ClickAwayListener onClickAway={() => setOpen(false)}>
                    <Box>
                      {/* Header */}
                      <Box
                        sx={{
                          px: 2,
                          py: 1,
                          bgcolor: BRAND.tealSoft,
                          borderBottom: 1,
                          borderColor: alpha(BRAND.teal, 0.1),
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <SearchIcon fontSize="small" sx={{ color: BRAND.teal }} />
                        <Typography
                          variant="caption"
                          sx={{ color: BRAND.teal, fontWeight: 700 }}
                        >
                          {loading
                            ? "Searching…"
                            : suggestions.length > 0
                              ? `${suggestions.length} patient${suggestions.length !== 1 ? "s" : ""} found`
                              : "No patient matches this number"}
                        </Typography>
                      </Box>

                      {/* Suggestion rows */}
                      {suggestions.length > 0 && (
                        <List dense disablePadding>
                          {suggestions.map((c, idx) => (
                            <React.Fragment key={c.id}>
                              <ListItemButton
                                onClick={() => pickCustomer(c)}
                                sx={{
                                  py: 1.5,
                                  px: 2,
                                  "&:hover": { bgcolor: BRAND.tealSoft },
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    mr: 1.75,
                                    bgcolor: alpha(BRAND.teal, 0.12),
                                    color: BRAND.teal,
                                    fontSize: 15,
                                    fontWeight: 700,
                                  }}
                                >
                                  {c.name?.[0]?.toUpperCase() || "?"}
                                </Avatar>
                                <ListItemText
                                  primary={
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={1}
                                      flexWrap="wrap"
                                    >
                                      <Typography variant="body2" fontWeight={700}>
                                        {c.name}
                                      </Typography>
                                      {c.gender && (
                                        <Chip
                                          label={c.gender}
                                          size="small"
                                          sx={{
                                            height: 18,
                                            fontSize: 10,
                                            textTransform: "capitalize",
                                            bgcolor: alpha("#000", 0.06),
                                          }}
                                        />
                                      )}
                                    </Stack>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="text.secondary">
                                      {c.mobile}
                                      {c.age && ` · ${c.age}y`}
                                      {c.email && ` · ${c.email}`}
                                    </Typography>
                                  }
                                />
                                <ArrowForwardIcon sx={{ color: BRAND.teal, fontSize: 18 }} />
                              </ListItemButton>
                              {idx < suggestions.length - 1 && (
                                <Divider component="li" />
                              )}
                            </React.Fragment>
                          ))}
                        </List>
                      )}

                      {/* Empty state inside dropdown */}
                      {!loading && suggestions.length === 0 && digitsCount >= 2 && (
                        <Box
                          sx={{
                            px: 2,
                            py: 3,
                            textAlign: "center",
                            bgcolor: alpha(BRAND.bg, 0.5),
                          }}
                        >
                          <PersonAddAlt1Icon
                            sx={{ fontSize: 32, color: "text.disabled", mb: 0.5 }}
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ mb: 0.5 }}
                          >
                            No match for "{digits}"
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            This looks like a brand-new patient
                          </Typography>
                        </Box>
                      )}

                      {/* Footer actions.
                          Two separate things, which used to be one:
                            "Bill as walk-in"   → type the details on this bill only
                            "Add customer"      → create the record now, then bill it
                          The second is the only path that writes a customer row, and it
                          only appears with pharmacy.customers.create. */}
                      <Box
                        sx={{
                          px: 2,
                          py: 1.5,
                          bgcolor: alpha(BRAND.warning, 0.08),
                          borderTop: "1px solid",
                          borderColor: alpha(BRAND.warning, 0.2),
                        }}
                      >
                        <Stack spacing={1}>
                          {canAddCustomer && (
                            <Button
                              fullWidth
                              variant="contained"
                              startIcon={<PersonAddAlt1Icon />}
                              onClick={() => { setOpen(false); setAddOpen(true); }}
                              disabled={!isPhoneValid}
                              sx={{
                                bgcolor: BRAND.teal,
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 700,
                                borderRadius: 2,
                                "&:hover": { bgcolor: "#0d5a54" },
                                "&.Mui-disabled": {
                                  bgcolor: alpha(BRAND.teal, 0.3),
                                  color: "#fff",
                                },
                              }}
                            >
                              {isPhoneValid
                                ? `Add ${digits} as a customer`
                                : `Add customer (need ${10 - digitsCount} more digit${10 - digitsCount !== 1 ? "s" : ""})`}
                            </Button>
                          )}

                          <Button
                            fullWidth
                            variant={canAddCustomer ? "outlined" : "contained"}
                            startIcon={<ArrowForwardIcon />}
                            onClick={continueAsNew}
                            disabled={!isPhoneValid}
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              borderRadius: 2,
                              ...(canAddCustomer
                                ? { borderColor: BRAND.warning, color: "#92400e" }
                                : {
                                    bgcolor: BRAND.warning,
                                    color: "#fff",
                                    "&:hover": { bgcolor: "#d97706" },
                                    "&.Mui-disabled": { bgcolor: alpha(BRAND.warning, 0.3), color: "#fff" },
                                  }),
                            }}
                          >
                            Bill as walk-in
                          </Button>

                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
                            A walk-in prints on the bill but isn't saved to your customer list.
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NEW-PATIENT CALLOUT (above the fields)                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Collapse in={mode === "new"}>
        <Alert
          severity="warning"
          icon={<PersonAddAlt1Icon />}
          action={
            <Stack direction="row" spacing={0.5} alignItems="center">
              {/* Second chance to keep the customer: they came down the walk-in path, typed
                  the details, and may now want them saved. Same dialog as the dropdown —
                  prefilled from what is already on the bill, so nothing is retyped. */}
              {canAddCustomer && (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={() => setAddOpen(true)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Save to customers
                </Button>
              )}
              <Button
                size="small"
                color="inherit"
                onClick={clearAll}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Cancel
              </Button>
            </Stack>
          }
          sx={{
            borderRadius: 2,
            mb: 2,
            bgcolor: BRAND.warningSoft,
            border: `1px solid ${alpha(BRAND.warning, 0.3)}`,
            "& .MuiAlert-icon": { color: "#B47900" },
            "& .MuiAlert-message": { color: "#92400e", fontWeight: 600 },
          }}
        >
          Walk-in bill — these details print on the bill but aren't saved to your customer list
        </Alert>
      </Collapse>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* OTHER FIELDS                                                 */}
      {/* Shown only in "existing" (editing) or "new" mode.           */}
      {/* In "idle" they stay HIDDEN — this is the key UX principle.  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Collapse in={mode === "new" || (mode === "existing" && editingExisting)}>
        <Stack spacing={2}>
          {/* Name — primary required */}
          <TextField
            label="Patient name"
            required
            value={customer.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            fullWidth
            size="medium"
            placeholder="e.g. Priya Sharma"
            autoFocus={mode === "new"}
            InputProps={{
              sx: { borderRadius: 2 },
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Secondary fields in a responsive grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Email (optional)"
              type="email"
              value={customer.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              fullWidth
              size="small"
              placeholder="priya@email.com"
              InputProps={{
                sx: { borderRadius: 2 },
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr",
                gap: 1.5,
              }}
            >
              <TextField
                select
                label="Gender"
                value={customer.gender}
                onChange={(e) => handleFieldChange("gender", e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  sx: { borderRadius: 2 },
                  startAdornment: (
                    <InputAdornment position="start">
                      <WcIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>

              <TextField
                label="Age"
                type="number"
                value={customer.age}
                onChange={(e) => handleFieldChange("age", e.target.value)}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 150 }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  startAdornment: (
                    <InputAdornment position="start">
                      <CakeOutlinedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>
        </Stack>
      </Collapse>

      {/* Small hint when idle (no fields visible) */}
      {mode === "idle" && digitsCount < 2 && (
        <Fade in timeout={400}>
          <Box
            sx={{
              mt: 1.5,
              p: 1.75,
              borderRadius: 2,
              bgcolor: alpha(BRAND.teal, 0.04),
              border: `1px dashed ${alpha(BRAND.teal, 0.2)}`,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <KeyboardArrowDownIcon sx={{ color: BRAND.teal, fontSize: 20 }} />
            <Typography variant="caption" sx={{ color: BRAND.teal, fontWeight: 600 }}>
              Patient details will appear here once you pick an existing patient
              or add a new one
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Collapsed hint for existing patients */}
      {mode === "existing" && !editingExisting && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5, textAlign: "center" }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 13, verticalAlign: "middle", mr: 0.5 }} />
          Need to update their details? Tap <strong>Edit</strong> above.
        </Typography>
      )}

      {/* The one place a customer record gets created from the counter. Prefilled with
          whatever is already on the bill, so reaching it from either entry point (the
          dropdown footer or the walk-in callout) costs no retyping. */}
      <CustomerFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initialMobile={customer.mobile || digits}
        customer={
          // Not an edit — this is always a create. But the dialog prefills from `customer`
          // when given one, and here we want the name/age/email the counter already typed
          // carried across. Passing it WITHOUT an id keeps the dialog in create mode.
          customer.name || customer.email || customer.gender || customer.age
            ? { ...customer, id: undefined }
            : null
        }
        onSaved={handleCustomerSaved}
      />
    </Paper>
  );
}