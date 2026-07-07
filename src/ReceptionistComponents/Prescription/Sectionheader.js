import React from "react";
import { Stack, Typography, IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { COLORS } from "../Themes";

// Title + running subtotal + a "remove all rows in this section" button.
export default function Sectionheader({ title, subtotal, onDeleteSection }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
      <Typography fontWeight={600} color={COLORS.primary}>{title}</Typography>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography fontSize={13} color="text.secondary">Subtotal: ₹{subtotal.toFixed(2)}</Typography>
        <Tooltip title={`Remove all ${title.toLowerCase()}`}>
          <IconButton size="small" onClick={onDeleteSection} sx={{ color: "#e53935" }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}