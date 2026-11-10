import React, { useEffect, useState } from "react";
import { Box, Grid, TextField, Select, MenuItem, Button, Typography, Chip, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import { COLORS } from "../Themes";
import { addInputSx } from "./Billconstants";

const inputSx = {
  ...addInputSx,
  "& .MuiOutlinedInput-root": { height: 44, borderRadius: "8px" },
};

// Fetches from the SAME endpoint and field shape as AddMedicine.jsx:
// GET /api/medicines -> { success, data: [{ id, medicine_name, type, strength,
//   unit, duration, ... }] }
// Note: medicines carry no price column, so Unit Price is always manually
// entered by the biller — it is never prefilled.
//
// No popup — everything happens in this single inline row.
export default function AddMedicineItem({ onAdd }) {
  const [dbMeds, setDbMeds] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_URL}/api/medicines`, { withCredentials: true })
      .then((res) => { if (res.data.success) setDbMeds(res.data.data || []); })
      .catch((err) => console.error("Medicines fetch error:", err));
  }, []);

  const handleSelect = (id) => {
    setSelectedId(id);
    const m = dbMeds.find((x) => x.id === Number(id));
    setSelected(m || null);
  };

  const reset = () => { setSelectedId(""); setSelected(null); setQuantity(1); setAmount(""); };

  const handleAdd = () => {
    if (!selected) return;
    const qty = Number(quantity) || 1;
    const amt = Number(amount) || 0;
    onAdd({
      medicine_id: selected.id,
      medicine_name: selected.medicine_name,
      type: selected.type,
      strength: selected.strength,
      unit: selected.unit,
      duration: selected.duration,
      quantity: qty,
      amount: amt,
      cost: qty * amt,
    });
    reset();
  };

  return (
    <Box sx={{ mt: 1, mb: 1.5 }}>
      {/*
        Responsive plan:
        xs (mobile)   -> Medicine full width; Qty, Unit price, Add share the next row
        sm (tablet)   -> Medicine gets more room, Qty/Price narrower, Add on its own row end
        md (laptop)   -> all four fields sit comfortably on one row
        lg (desktop)  -> same row, extra width goes to the Medicine dropdown
      */}
      <Grid container spacing={1.25} alignItems="flex-end">
        <Grid item xs={12} sm={12} md={5} lg={5.5}>
          <Typography sx={{ color: "#6b7280", mb: 0.5, display: "block", fontSize: 12.5 }}>Medicine</Typography>
          <Select
            displayEmpty fullWidth value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            sx={{ ...inputSx, "& .MuiSelect-select": { display: "flex", alignItems: "center" } }}
          >
            <MenuItem value="" sx={{ color: "#9ca3af" }}>Select medicine</MenuItem>
            {dbMeds.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.medicine_name}</MenuItem>
            ))}
          </Select>
        </Grid>

        <Grid item xs={4} sm={3} md={2} lg={1.8}>
          <Typography sx={{ color: "#6b7280", mb: 0.5, display: "block", fontSize: 12.5 }}>Qty</Typography>
          <TextField
            fullWidth type="number" value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 1 }} sx={inputSx}
          />
        </Grid>

        <Grid item xs={5} sm={4} md={2.5} lg={2.2}>
          <Typography sx={{ color: "#6b7280", mb: 0.5, display: "block", fontSize: 12.5 }}>Unit price (₹)</Typography>
          <TextField
            fullWidth type="number" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }} sx={inputSx}
          />
        </Grid>

        <Grid item xs={3} sm={5} md={2.5} lg={2.5}>
          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={!selected}
            sx={{
              height: 44, bgcolor: COLORS.primary, color: "#fff !important",
              borderRadius: "8px", textTransform: "none", fontWeight: 600, boxShadow: "none",
              px: { xs: 0.5, sm: 2 },
              "&:hover": { bgcolor: COLORS.primary, boxShadow: "none" },
              "&.Mui-disabled": { bgcolor: "#e5e7eb", color: "#9ca3af !important" },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Add</Box>
          </Button>
        </Grid>
      </Grid>

      {selected && (selected.type || selected.strength || selected.duration) && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
          {selected.type && <Chip size="small" label={selected.type} />}
          {selected.strength && <Chip size="small" label={`${selected.strength}${selected.unit || ""}`} />}
          {selected.duration && <Chip size="small" label={selected.duration} />}
        </Stack>
      )}
    </Box>
  );
}