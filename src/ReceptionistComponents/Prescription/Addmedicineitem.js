import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Chip,
  Stack,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import debounce from "lodash.debounce";
import { COLORS } from "../Themes";
import { addInputSx } from "./Billconstants";

const inputSx = {
  ...addInputSx,
  "& .MuiOutlinedInput-root": {
    height: 44,
    borderRadius: "8px",
  },
};

export default function AddMedicineItem({ onAdd }) {
  const [dbMeds, setDbMeds] = useState([]);
  const [selected, setSelected] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");

  const [loading, setLoading] = useState(false);

  const searchMedicines = async (search = "") => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/medicines/search`,
        {
          params: {
            search,
            page: 1,
            limit: 20,
          },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        setDbMeds(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchMedicines("");
  }, []);

  const debouncedSearch = useMemo(
    () => debounce(searchMedicines, 400),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const reset = () => {
    setSelected(null);
    setQuantity(1);
    setAmount("");
    setDuration("");
    setDbMeds([]);
  };

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
      duration,
      quantity: qty,
      amount: amt,
      cost: qty * amt,
    });

    reset();
  };

  return (
    <Box sx={{ mt: 1, mb: 1.5 }}>
      <Grid container spacing={1.25} alignItems="flex-end">
        <Grid item size={{
          xs: 12,
          sm: 12,
          md: 6,
          lg: 5,
          xl: 5,
        }}>
          <Typography
            sx={{
              color: "#6b7280",
              mb: 0.5,
              display: "block",
              fontSize: 12.5,
            }}
          >
            Medicine
          </Typography>

          <Autocomplete
            options={dbMeds}
            value={selected}
            loading={loading}
            fullWidth
            filterOptions={(x) => x}
            getOptionLabel={(option) => option?.medicine_name || ""}
            isOptionEqualToValue={(option, value) =>
              option.id === value.id
            }
            onChange={(event, value) => {
              setSelected(value);
              if (value) {
                setAmount(value.amount);
                setDuration(value.duration || "");
              } else {
                setAmount("");
                setDuration("");
              }
            }}
            onInputChange={(event, value, reason) => {
              if (reason === "input") {
                debouncedSearch(value);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search medicine..."
                sx={inputSx}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading && (
                        <CircularProgress
                          color="inherit"
                          size={18}
                        />
                      )}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography fontSize={14} fontWeight={600}>
                    {option.medicine_name}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {option.type || ""}{" "}
                    {option.strength
                      ? `${option.strength}${option.unit || ""}`
                      : ""}
                  </Typography>
                </Box>
              </li>
            )}
            noOptionsText="Type at least 2 letters"
          />
        </Grid>

        <Grid item xs={4} sm={3} md={2} lg={1.8}>
          <Typography
            sx={{
              color: "#6b7280",
              mb: 0.5,
              fontSize: 12.5,
            }}
          >
            Qty
          </Typography>

          <TextField
            fullWidth
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 1 }}
            sx={inputSx}
          />

        </Grid>

        <Grid item xs={5} sm={4} md={2.5} lg={2.2}>
          <Typography
            sx={{
              color: "#6b7280",
              mb: 0.5,
              fontSize: 12.5,
            }}
          >
            Unit Price (₹)
          </Typography>

          <TextField
            fullWidth
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{
              min: 0,
              step: 0.01,
            }}
            sx={inputSx}
          />

        </Grid>

        <Grid item xs={5} sm={4} md={2.5} lg={2.2}>
          <Typography
            sx={{
              color: "#6b7280",
              mb: 0.5,
              fontSize: 12.5,
            }}
          >
            Duration
          </Typography>

          <TextField
            fullWidth
            placeholder="e.g. 5 Days"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            sx={inputSx}
          />
        </Grid>

        <Grid item xs={3} sm={5} md={2.5} lg={2.5}>
          <Button
            fullWidth
            startIcon={<AddIcon />}
            disabled={!selected}
            onClick={handleAdd}
            sx={{
              height: 44,
              bgcolor: COLORS.primary,
              color: "#fff",
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
              px: {
                xs: 0.5,
                sm: 2,
              },
              "&:hover": {
                bgcolor: COLORS.primary,
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                bgcolor: "#e5e7eb",
                color: "#9ca3af",
              },
            }}
          >
            <Box
              component="span"
              sx={{
                display: {
                  xs: "none",
                  sm: "inline",
                },
              }}
            >
              Add
            </Box>
          </Button>
        </Grid>
      </Grid>

      {selected &&
        (selected.type ||
          selected.strength ||
          selected.duration) && (
          <Stack
            direction="row"
            spacing={0.75}
            flexWrap="wrap"
            sx={{ mt: 1 }}
          >
            {selected.type && (
              <Chip
                size="small"
                label={selected.type}
              />
            )}

            {selected.strength && (
              <Chip
                size="small"
                label={`${selected.strength}${selected.unit || ""}`}
              />
            )}

            {/* {selected.duration && (
              <Chip
                size="small"
                label={selected.duration}
              />
            )} */}
          </Stack>
        )}
    </Box>
  );
}
