import React, { useEffect, useState } from "react";
import { Box, Grid, TextField, Select, MenuItem, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import { COLORS } from "../Themes";
import { addInputSx } from "./Billconstants";

// Fetches from the SAME endpoint and field shape as AddConsultation.jsx:
// GET /api/consultation-types -> { success, data: [{ id, name, description, cost }] }
// The DB already provides a cost, so it's prefilled but stays editable —
// billing may need to override a consultation's list price for a one-off case.
export default function AddConsultationItem({ onAdd }) {
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [cost, setCost] = useState("");

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_URL}/api/consultation-types`, { withCredentials: true })
      .then((res) => { if (res.data.success) setOptions(res.data.data || []); })
      .catch((err) => console.error("Consultation types fetch error:", err));
  }, []);

  const handleSelect = (id) => {
    setSelectedId(id);
    const c = options.find((x) => x.id === Number(id));
    setSelected(c || null);
    setCost(c ? c.cost : "");
  };

  const reset = () => { setSelectedId(""); setSelected(null); setCost(""); };

  const handleAdd = () => {
    if (!selected) return;
    onAdd({
      consultation_id: selected.id,
      name: selected.name,
      description: selected.description,
      cost: Number(cost) || 0,
    });
    reset();
  };

  return (
    <Box sx={{ mt: 1, mb: 1.5 }}>
      {/*
        Responsive plan:
        xs (mobile)   -> everything stacks full-width, one control per row
        sm (tablet)   -> dropdown + cost share a row, Add drops to its own full-width row
        md (laptop)   -> all three sit on one row, dropdown gets the most space
        lg (desktop)  -> same as md, just with a touch more breathing room on the dropdown
      */}
      <Grid container spacing={1.25} alignItems="stretch">
        <Grid item xs={12} sm={7} md={6} lg={7}>
          <Select
            displayEmpty
            fullWidth
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            sx={{
              ...addInputSx,
              "& .MuiSelect-select": {
                display: "flex",
                alignItems: "center",
                height: "40px",
                boxSizing: "border-box",
              },
            }}
          >
            <MenuItem value="" sx={{ color: "#9ca3af" }}>
              Select consultation
            </MenuItem>
            {options.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name} — ₹{c.cost}
              </MenuItem>
            ))}
          </Select>
        </Grid>

        <Grid item xs={8} sm={3} md={3} lg={3}>
          <TextField
            type="number"
            placeholder="Cost (₹)"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ ...addInputSx, "& .MuiOutlinedInput-root": { height: 40 } }}
          />
        </Grid>

        <Grid item xs={4} sm={2} md={3} lg={2}>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={!selected}
            fullWidth
            sx={{
              bgcolor: COLORS.primary,
              color: "#fff !important",
              textTransform: "none",
              fontSize: 12,
              height: 40,
              px: { xs: 1, md: 2 },
              "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.5 } },
              "&:hover": { bgcolor: COLORS.primary },
            }}
          >
            {/* Icon-only on the smallest screens so the button never wraps/truncates */}
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Add</Box>
          </Button>
        </Grid>
      </Grid>

      {selected?.description && (
        <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mt: 0.5 }}>
          {selected.description}
        </Typography>
      )}
    </Box>
  );
}