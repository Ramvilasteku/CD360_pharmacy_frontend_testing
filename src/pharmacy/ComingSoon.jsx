import { Box, Paper, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";

export default function ComingSoon({ title = "Coming soon" }) {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
        <ConstructionIcon sx={{ fontSize: 64, color: "#E5A73A", mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#3f6f7a", mb: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">
          This page is under development. Check back soon.
        </Typography>
      </Paper>
    </Box>
  );
}