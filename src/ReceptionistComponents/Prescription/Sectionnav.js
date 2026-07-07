import React from "react";
import { Stack, Box } from "@mui/material";
import { COLORS } from "../Themes";
import { SECTION_META } from "./Billconstants";

// Sidebar nav for switching between the three bill sections, with a badge
// showing how many rows each section currently has.
export default function Sectionnav({ active, onChange, counts }) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 190 }}>
      {Object.entries(SECTION_META).map(([key, meta]) => (
        <Box
          key={key}
          onClick={() => onChange(key)}
          sx={{
            display: "flex", alignItems: "center", gap: 1.2,
            px: 1.5, py: 1.1, borderRadius: 2, cursor: "pointer",
            bgcolor: active === key ? "#eff4ff" : "transparent",
            color: active === key ? COLORS.primary : "#475569",
            fontWeight: active === key ? 600 : 500,
            fontSize: 14,
            transition: "background 0.15s",
            "&:hover": { bgcolor: "#f5f7fa" },
          }}
        >
          <span style={{ fontSize: 16 }}>{meta.icon}</span>
          <span style={{ flex: 1 }}>{meta.label}</span>
          {counts[key] > 0 && (
            <Box
              sx={{
                bgcolor: COLORS.primary, color: "#fff", fontSize: 11, fontWeight: 700,
                minWidth: 20, height: 20, borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center", px: 0.6,
              }}
            >
              {counts[key]}
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}