// IPDAnalytics.jsx
import React, { useEffect, useState, useContext } from "react";
import { IPDFilterContext } from "./IPDFilterContext";
import axios from "axios";
import { Box, Typography, Skeleton } from "@mui/material";

import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import IPDAdmissionAnalytics from "./IPDAdmissionAnalytics";
import { IPDBedBarOverview } from "./IPDBedBarOverview";
import IPDWardWiseRevenue from "./IPDWardWiseRevenue";
import IPDBedGraphOccupancy from "./IPDBedGraphOccupancy";
import IPDRevenueAnalyticsDetail from "./IPDRevenueAnalyticsDetail";
import IPDWardWiseOccupancy from "./IPDWardWiseOccupancy";
import IPDDoctorRevenueAnalytics from "./IPDDoctorRevenue";

export default function IPDAnalytics() {
  // 1. PULL ANALYTICS FROM CONTEXT INSTEAD OF USESTATE
  const { filters, analytics, setAnalytics } = useContext(IPDFilterContext);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchbedCharges = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL_IPD}/api/getall/bed-charges"`,
        { params: filters, withCredentials: true },
      );

      console.log(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  fetchbedCharges();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await axios.get(
        `${process.env.REACT_APP_URL_IPD}/api/revenue`,
        { params: filters, withCredentials: true },
      );

      // 2. THIS NOW SAVES GLOBALLY TO CONTEXT
      setAnalytics(res.data.analytics || {});
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      filters.filter_type === "custom" &&
      (!filters.start_date || !filters.end_date)
    ) {
      return;
    }
    fetchAnalytics();
  }, [
    filters.branch_name,
    filters.filter_type,
    filters.start_date,
    filters.end_date,
  ]);

  return (
    <>
      <Box
        sx={{
          p: 2,
          borderRadius: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 3,
          my: 1,
          bgcolor: "#ebf0f1",
        }}
      >
        <Box>
          <Typography
            sx={{ fontSize: "2rem", fontWeight: 800, color: "#3f6f7a" }}
          >
            <LocalHospitalIcon sx={{ fontSize: "4rem", fontWeight: 800 }} />{" "}
            Total Hospital Revenue
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 1,
          }}
        >
          {loading ? (
            <Skeleton variant="text" width={250} height={70} />
          ) : (
            <Typography
              sx={{
                fontSize: { xs: "2.5rem", md: "3rem" },
                fontWeight: "bold",
                color: "#22C55E",
              }}
            >
              ₹ {Number(analytics?.total_bill_amount || 0).toLocaleString()}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box
              onClick={() => setOpen(true)}
              sx={{
                textTransform: "none",
                fontSize: "1em",
                px: 2,
                py: 0.5,
                color: "#3f6f7a",
                borderRadius: 5,
                textDecorationLine: "underline",
                fontWeight: 700,
                ":hover": {
                  cursor: "pointer",
                  bgcolor: "rgba(63, 111, 122, 0.1)",
                },
              }}
            >
              View Detail Revenue
            </Box>
          </Box>
        </Box>
      </Box>
      <IPDRevenueAnalyticsDetail
        open={open}
        setOpen={setOpen}
        filters={filters}
      />
      <Box
        sx={{
          my: 2,
        }}
      >
        <IPDAdmissionAnalytics />
      </Box>

      <Box
        sx={{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center"

        }}
      >
          <Box sx={{ flex: "0 0 41%"  }}>
          <IPDDoctorRevenueAnalytics />
        </Box>

         <Box sx={{flex: "0 0 58%" }}>
          <IPDWardWiseRevenue />
        </Box>
      </Box>

      <Box
        sx={{
          my: 2,
        }}
      >
        <IPDBedGraphOccupancy />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Box sx={{ flex: "0 0 68%" }}>
          <IPDWardWiseOccupancy />
        </Box>

        <Box sx={{ flex: "0 0 31%" }}>
          <IPDBedBarOverview />
        </Box>
      </Box>
    </>
  );
}
