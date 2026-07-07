import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DeleteIcon        from "@mui/icons-material/Delete";
import EditIcon          from "@mui/icons-material/Edit";
import CheckIcon         from "@mui/icons-material/Check";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import axios from "axios";
import { COLORS } from "./Themes";

const BILL_STATUSES = ["Pending", "Paid", "Overdue", "Cancelled"];

const STATUS_COLOR = {
  Pending:   { bg: "#fff8e1", color: "#f57f17", border: "#ffe082" },
  Paid:      { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  Overdue:   { bg: "#fce4ec", color: "#c62828", border: "#ef9a9a" },
  Cancelled: { bg: "#f3f3f3", color: "#757575", border: "#bdbdbd" },
};

/* ─────────────────────────────────────────────────────────────────
   INLINE EDITABLE ROW LIST
   Used for consultations, medicines, and tests inside EditBillModal
───────────────────────────────────────────────────────────────── */
function EditableRowList({ items, nameKey, isMedicine, onDelete, onEditSave, onDeleteSection, sectionTitle }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft,    setEditDraft]    = useState({});

  const startEdit = (i, row) => {
    setEditingIndex(i);
    setEditDraft({ cost: row.cost, quantity: row.quantity, amount: row.unit_price ?? row.amount });
  };

  const cancelEdit = () => { setEditingIndex(null); setEditDraft({}); };

  const saveEdit = (i) => { onEditSave(i, editDraft); setEditingIndex(null); setEditDraft({}); };

  return (
    <Box>
      {/* Section header with delete-all */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography fontWeight={600} mb={0}>{sectionTitle}</Typography>
        <Tooltip title={`Remove all ${sectionTitle.toLowerCase()}`}>
          <IconButton size="small" onClick={onDeleteSection} sx={{ color: "#e53935" }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack spacing={1}>
        {items.map((item, i) => {
          const isEditing = editingIndex === i;
          const displayName = nameKey === "medicine"
            ? `${item.name || item.medicine_name || ""}${item.duration ? ` (${item.duration})` : ""}`
            : (item[nameKey] || item.name || "—");

          return (
            <Box
              key={i}
              sx={{
                border: "1px solid",
                borderColor: isEditing ? COLORS.primary : "#e0e0e0",
                borderRadius: 1.5,
                p: 1,
                bgcolor: isEditing ? "#fffde7" : "#fff",
              }}
            >
              {/* Name row */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={isEditing ? 1 : 0}>
                <Typography fontSize={13} fontWeight={500}>{displayName}</Typography>

                {/* Action buttons */}
                {isEditing ? (
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Save">
                      <IconButton size="small" onClick={() => saveEdit(i)} sx={{ color: "green" }}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <IconButton size="small" onClick={cancelEdit} sx={{ color: "#888" }}>
                        <CloseOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => startEdit(i, item)} sx={{ color: COLORS.primary }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onDelete(i)} sx={{ color: "#e53935" }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>

              {/* Edit fields row */}
              {isEditing && (
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {isMedicine && (
                    <>
                      <TextField
                        label="Qty"
                        type="number"
                        size="small"
                        value={editDraft.quantity ?? ""}
                        onChange={(e) => {
                          const qty = Number(e.target.value);
                          const amt = Number(editDraft.amount || 0);
                          setEditDraft(d => ({ ...d, quantity: qty, cost: qty * amt }));
                        }}
                        inputProps={{ min: 1 }}
                        sx={{ width: 80 }}
                      />
                      <TextField
                        label="Unit Price"
                        type="number"
                        size="small"
                        value={editDraft.amount ?? ""}
                        onChange={(e) => {
                          const amt = Number(e.target.value);
                          const qty = Number(editDraft.quantity || 1);
                          setEditDraft(d => ({ ...d, amount: amt, cost: qty * amt }));
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: 100 }}
                      />
                    </>
                  )}
                  <TextField
                    label="Cost (₹)"
                    type="number"
                    size="small"
                    value={editDraft.cost ?? ""}
                    onChange={(e) => setEditDraft(d => ({ ...d, cost: Number(e.target.value) }))}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ width: 110 }}
                  />
                </Stack>
              )}

              {/* Display row (not editing) */}
              {!isEditing && (
                <Stack direction="row" spacing={2} mt={0.3}>
                  {isMedicine && (
                    <>
                      <Typography variant="caption" color="text.secondary">
                        Qty: <strong>{item.quantity}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Unit: <strong>₹{Number(item.unit_price ?? item.amount ?? 0).toFixed(2)}</strong>
                      </Typography>
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Cost: <strong>₹{Number(item.cost || 0).toFixed(2)}</strong>
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
const EditBillModal = ({ open, bill, onClose, onUpdated }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [consultations, setConsultations] = useState([]);
  const [medicines,     setMedicines]     = useState([]);
  const [tests,         setTests]         = useState([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [notes,         setNotes]         = useState("");
  const [billStatus,    setBillStatus]    = useState("Pending");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  /* ── Load bill data ── */
  useEffect(() => {
    if (!bill) return;
    const breakdown = bill.bill_breakdown_json || {};
    setConsultations(breakdown.consultations || []);
    setMedicines(breakdown.medicines         || []);
    setTests(breakdown.tests                 || []);
    setDiscountPercentage(Number(bill.discount_percentage || 0));
    setTaxPercentage(Number(bill.tax_percentage || 0));
    setNotes(bill.notes                      || "");
    setBillStatus(bill.bill_status           || "Pending");
    setError("");
  }, [bill]);

  /* ── Helpers ── */
  const deleteRow     = (setter, index) => setter(prev => prev.filter((_, i) => i !== index));
  const deleteSection = (setter)        => setter([]);

  const editSaveRow = (setter, index, draft, isMed) =>
    setter(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (isMed) {
          const qty = Number(draft.quantity ?? item.quantity ?? 1);
          const amt = Number(draft.amount   ?? item.unit_price ?? item.amount ?? 0);
          return { ...item, quantity: qty, unit_price: amt, amount: amt, cost: qty * amt };
        }
        return { ...item, cost: Number(draft.cost ?? item.cost) };
      })
    );

  /* ── Totals ── */
  const consultationTotal = consultations.reduce((s, c) => s + Number(c.cost || 0), 0);
  const medicineTotal     = medicines.reduce((s, m)     => s + Number(m.cost || 0), 0);
  const testTotal         = tests.reduce((s, t)         => s + Number(t.cost || 0), 0);
  const subtotal = consultationTotal + medicineTotal + testTotal;

  const discountAmount =
  (subtotal * discountPercentage) / 100;

  const taxableAmount =
  subtotal - discountAmount;

  const taxAmount =
  (taxableAmount * taxPercentage) / 100;

  const totalAmount =
  taxableAmount + taxAmount;

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      await axios.put(
        `${process.env.REACT_APP_URL}/bill/bills/${bill.bill_id}`,
        {
          subtotal: subtotal.toFixed(2),

          discount_percentage: discountPercentage,

          tax_percentage: taxPercentage,

          notes,

          bill_status:billStatus,

          bill_breakdown_json: {
              consultations,
              medicines,
              tests,
          },
        },
        { withCredentials: true }
      );
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Bill update failed:", err);
      setError(err?.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!bill) return null;

  const sc = STATUS_COLOR[billStatus] || STATUS_COLOR.Pending;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>

      {/* ── HEADER ── */}
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", pb: 1.5 }}>
        <Typography fontWeight={700} fontSize={17}>
          Edit Bill&nbsp;<span style={{ color: "#888", fontWeight: 400 }}>#{bill.bill_id}</span>
        </Typography>
        <Chip
          label={billStatus}
          size="small"
          sx={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 600, fontSize: 12 }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.5}>

          {/* STATUS */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              textTransform="uppercase" letterSpacing={0.8} display="block" mb={0.5}>
              Bill Status
            </Typography>
            <TextField
              select size="small" value={billStatus}
              onChange={(e) => setBillStatus(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: sc.bg, borderRadius: 2,
                  "& fieldset": { borderColor: sc.border },
                  "&:hover fieldset": { borderColor: sc.color },
                },
                "& .MuiSelect-select": { color: sc.color, fontWeight: 600 },
                width: 200,
              }}
            >
              {BILL_STATUSES.map(status => (
                <MenuItem key={status} value={status}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATUS_COLOR[status]?.color || "#888" }} />
                    {status}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* CONSULTATIONS */}
          {consultations.length > 0 && (
            <EditableRowList
              items={consultations}
              nameKey="name"
              sectionTitle="Consultations"
              onDelete={(i)          => deleteRow(setConsultations, i)}
              onDeleteSection={()    => deleteSection(setConsultations)}
              onEditSave={(i, draft) => editSaveRow(setConsultations, i, draft, false)}
            />
          )}

          {/* MEDICINES */}
          {medicines.length > 0 && (
            <EditableRowList
              items={medicines}
              nameKey="medicine"
              sectionTitle="Medicines"
              isMedicine
              onDelete={(i)          => deleteRow(setMedicines, i)}
              onDeleteSection={()    => deleteSection(setMedicines)}
              onEditSave={(i, draft) => editSaveRow(setMedicines, i, draft, true)}
            />
          )}

          {/* TESTS */}
          {tests.length > 0 && (
            <EditableRowList
              items={tests}
              nameKey="name"
              sectionTitle="Tests"
              onDelete={(i)          => deleteRow(setTests, i)}
              onDeleteSection={()    => deleteSection(setTests)}
              onEditSave={(i, draft) => editSaveRow(setTests, i, draft, false)}
            />
          )}

          {/* TOTALS */}
          <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Subtotal</Typography>
              <Typography fontWeight={500}>Rs. {subtotal.toFixed(2)}</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>

                  <TextField
                    label="Discount (%)"
                    type="number"
                    size="small"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: 140 }}
                  />

                  <TextField
                    label="GST (%)"
                    type="number"
                    size="small"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(Number(e.target.value))}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: 140 }}
                  />

                </Stack>
            <Box sx={{ borderTop: "1px solid #ddd", pt: 1, mt: 0.5 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={700}>Total</Typography>
                <Typography fontWeight={700} color={COLORS.primary}>Rs. {totalAmount.toFixed(2)}</Typography>
              </Stack>
            </Box>
          </Box>

          {/* NOTES */}
          <TextField
            label="Notes" multiline rows={2}
            value={notes} onChange={(e) => setNotes(e.target.value)}
            fullWidth size="small"
          />

          {error && <Typography color="error" fontSize={13}>⚠ {error}</Typography>}

        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained" onClick={handleSubmit} disabled={saving}
          sx={{ bgcolor: COLORS.primary, "&:hover": { bgcolor: COLORS.primaryDark ?? COLORS.primary } }}
        >
          {saving ? "Saving…" : "Update Bill"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditBillModal;