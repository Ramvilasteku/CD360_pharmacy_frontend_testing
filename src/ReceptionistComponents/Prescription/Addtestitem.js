import React, { useEffect, useState } from "react";
import { Box, Grid, TextField, Select, MenuItem, Button, Typography, Autocomplete } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import { COLORS } from "../Themes";
import { addInputSx } from "./Billconstants";

// Fetches from the SAME endpoint and field shape as AddTest.jsx:
// GET /api/tests -> { data: [{ id, test_name, test_type, description }] }
// Note: tests carry no price column, so Cost here is always manually
// entered by the biller — it is never prefilled.
export default function AddTestItem({ onAdd }) {
  const [allTests, setAllTests] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [selected, setSelected] = useState(null);
  const [cost, setCost] = useState("");

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_URL}/api/tests`, { withCredentials: true })
      .then((res) => setAllTests(res.data?.data || []))
      .catch((err) => console.error("Tests fetch error:", err));
  }, []);

  // const handleSelect = (name) => {
  //   setSelectedName(name);
  //   const t = allTests.find((x) => x.test_name === name);
  //   setSelected(t || null);
  // };

  const reset = () => {
    setSelected(null);
    setCost("");
  };
  const handleAdd = () => {
    if (!selected) return;
    onAdd({
      test_id: selected.id,
      test_name: selected.test_name,
      test_type: selected.test_type,
      description: selected.description,
      cost: Number(cost) || 0,
    });
    reset();
  };

  return (
    <Box sx={{ mt: 1, mb: 1.5 }}>
      {/*
        Responsive plan:
        xs (mobile)   -> dropdown full width on its own row, type label + cost
                         + button share the next row so nothing gets cramped
        sm (tablet)   -> dropdown + type label share a row, cost + Add below
        md (laptop)   -> everything fits one row
        lg (desktop)  -> same row, dropdown gets extra room since there's space
      */}
      <Grid container spacing={1.25} alignItems="center">
        <Grid
          item
          size={{
            xs: 12,
            sm: 7,
            md: 4,
            lg: 5,
          }}
        >
          {/* <Select
            displayEmpty fullWidth value={selectedName}
            onChange={(e) => handleSelect(e.target.value)}
            sx={addInputSx}
          >
            <MenuItem value="" sx={{ color: "#9ca3af" }}>Select test</MenuItem>
            {allTests.map((t) => (
              <MenuItem key={t.id} value={t.test_name}>{t.test_name}</MenuItem>
            ))}
          </Select> */}
          <Autocomplete
            options={allTests}
            value={selected}
            fullWidth
            getOptionLabel={(option) => option?.test_name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, value) => {
              setSelected(value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search Test..."
                sx={addInputSx}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography fontSize={14} fontWeight={600}>
                    {option.test_name}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {option.test_type}
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Grid>

        {/* {selected?.test_type && (
          <Grid item xs={12} sm={5} md="auto" lg="auto">
            <Typography variant="caption" sx={{ color: "#6b7280" }}>{selected.test_type}</Typography>
          </Grid>
        )} */}

        <Grid item xs={8} sm={7} md={3} lg={2.5}>
          <TextField
            type="number" placeholder="Cost (₹)" value={cost} fullWidth
            onChange={(e) => setCost(e.target.value)}
            sx={addInputSx} inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>

        <Grid item xs={4} sm={5} md="auto" lg="auto">
          <Button
            startIcon={<AddIcon />} onClick={handleAdd} disabled={!selected}
            fullWidth
            sx={{
              bgcolor: COLORS.primary, color: "#ffffff !important", textTransform: "none",
              fontSize: 12, height: 34, px: { xs: 1, sm: 2 },
              "&:hover": { bgcolor: COLORS.primary },
            }}
          >
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