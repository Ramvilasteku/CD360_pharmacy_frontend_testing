import React, { useEffect, useState } from "react";
import { Stack, TextField, Button, Autocomplete } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import { COLORS } from "../Themes";
import { addInputSx } from "./Billconstants";

// ── Per-item-type config ──────────────────────────────────────────────
// endpoint   : where to fetch the options list from
// nameField  : the property on each option that holds its display name
//              (this MUST match the `nameKey` prop you pass to
//              EditableCostTable for that section, e.g. "name",
//              "medicine_name", "test_name")
// costField  : the property on each option that holds its price/cost.
//              ⚠ ADJUST THESE to match your actual API response shape —
//              they're placeholders based on the consultation-types
//              endpoint's "cost" field.
const ITEM_CONFIG = {
  consultation: {
    endpoint: "/api/consultation-types",
    nameField: "name",
    costField: "cost",
  },
  medicine: {
    endpoint: "/api/medicines",
    nameField: "medicine_name",
    costField: "price", // assumption — rename if your medicines table uses a different column
  },
  test: {
    endpoint: "/api/tests",
    nameField: "test_name",
    costField: "cost", // assumption — rename if your tests table uses a different column
  },
};

// Manual add of a consultation / medicine / test line item onto the bill,
// now sourced from the database instead of free-typed. Renders a
// searchable dropdown (Autocomplete) of DB records; selecting one
// auto-fills cost/unit-price, which stays editable before adding.
export default function Additemform({ itemType, nameLabel, onAdd }) {
  const config = ITEM_CONFIG[itemType];
  const isMedicine = itemType === "medicine";

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [qty, setQty]       = useState(1);
  const [amount, setAmount] = useState("");
  const [cost, setCost]     = useState("");

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${process.env.REACT_APP_URL}${config.endpoint}`, { withCredentials: true })
      .then((res) => {
        const data = res.data?.data ?? res.data ?? [];
        setOptions(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error(`${itemType} options fetch error:`, err))
      .finally(() => setLoading(false));
  }, [itemType]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setSelected(null); setQty(1); setAmount(""); setCost(""); };

  const handleSelect = (_, option) => {
    setSelected(option);
    if (!option) { setAmount(""); setCost(""); return; }
    const prefill = option[config.costField] ?? "";
    if (isMedicine) setAmount(prefill);
    else setCost(prefill);
  };

  const handleAdd = () => {
    if (!selected) return;
    const name = selected[config.nameField];

    if (isMedicine) {
      const q = Number(qty) || 1;
      const a = Number(amount) || 0;
      onAdd({
        medicine_id: selected.id,
        medicine_name: name,
        quantity: q,
        amount: a,
        cost: q * a,
      });
    } else {
      onAdd({
        [`${itemType}_id`]: selected.id,
        [config.nameField]: name,
        cost: Number(cost) || 0,
      });
    }
    reset();
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1, mb: 1.5 }}>
      <Autocomplete
        options={options}
        loading={loading}
        value={selected}
        getOptionLabel={(o) => o?.[config.nameField] || ""}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        onChange={handleSelect}
        sx={{ ...addInputSx, minWidth: 220 }}
        renderInput={(params) => (
          <TextField {...params} placeholder={nameLabel} sx={addInputSx} />
        )}
      />

      {isMedicine ? (
        <>
          <TextField
            type="number" placeholder="Qty" value={qty}
            onChange={(e) => setQty(e.target.value)}
            sx={{ ...addInputSx, width: 80 }}
            inputProps={{ min: 1 }}
          />
          <TextField
            type="number" placeholder="Unit Price" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ ...addInputSx, width: 110 }}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </>
      ) : (
        <TextField
          type="number" placeholder="Cost (₹)" value={cost}
          onChange={(e) => setCost(e.target.value)}
          sx={{ ...addInputSx, width: 110 }}
          inputProps={{ min: 0, step: 0.01 }}
        />
      )}

      <Button
        startIcon={<AddIcon />}
        onClick={handleAdd}
        disabled={!selected}
        sx={{
          bgcolor: COLORS.primary, color: "#fff", textTransform: "none",
          fontSize: 12, height: 34, px: 2, "&:hover": { bgcolor: COLORS.primary },
        }}
      >
        Add
      </Button>
    </Stack>
  );
}