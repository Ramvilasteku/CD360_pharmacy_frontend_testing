import React from "react";
import { Box, Skeleton, Paper } from "@mui/material";

const AdmissionSkeleton = ({ isMobile }) => {
  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Skeleton variant="text" width={250} height={40} />
        <Skeleton variant="text" width={150} />
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Skeleton height={50} />
        <Skeleton height={50} />
      </Paper>

      {/* Table */}
      <Paper sx={{ p: 3 }}>
        {[...Array(8)].map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={50}
            sx={{ mb: 1 }}
          />
        ))}
      </Paper>
    </Box>
  );
};

export default AdmissionSkeleton;