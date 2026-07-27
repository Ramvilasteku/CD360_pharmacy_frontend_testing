import { Box, Button, Modal, Skeleton, Typography } from "@mui/material";
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { IPDFilterContext } from "./IPDFilterContext";

const IPDRevenueAnalyticsDetail = ({
  open,
  setOpen,
  previewMode, // <-- This is now being used
}) => {
  const { filters } = useContext(IPDFilterContext);

  const [analytics, setAnalytics] = useState({});
  const [branchFilter, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState([]);
  const [hiddenItems, setHiddenItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await axios.get(
        `${process.env.REACT_APP_URL_IPD}/api/revenue`,
        {
          params: filters,
          withCredentials: true,
        },
      );
      setAnalytics(res.data.analytics || {});
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/get/ipdadmission`,
        {
          method: "GET",
          credentials: "include",
        },
      );
      const data = await response.json();
      if (response.ok) {
        const uniqueBranches = [
          ...new Set(
            data.data
              .filter((item) => item.branch_name)
              .map((item) => item.branch_name.trim().toLowerCase()),
          ),
        ].map((branch) =>
          branch
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
        );
        setBranches(uniqueBranches);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchBranches();
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

  const pieData = [
    {
      name: "Doctor Visits",
      value: Number(analytics?.doctor_visits_total || 0),
      color: "#3B82F6",
    },
    {
      name: "Lab Tests",
      value: Number(analytics?.lab_tests_total || 0),
      color: "#8B5CF6",
    },
    {
      name: "Procedures",
      value: Number(analytics?.procedures_total || 0),
      color: "#F97316",
    },
    {
      name: "Miscellaneous Charges",
      value: Number(analytics?.miscellaneous_total || 0),
      color: "#EAB308",
    },
    {
      name: "Nursing",
      value: Number(analytics?.nursing_total || 0),
      color: "#22C55E",
    },
    {
      name: "Bed Charges",
      value: Number(analytics?.bed_charges_total || 0),
      color: "#a68a5d",
    },
    {
      name: "Pharmacy",
      value: Number(analytics?.pharmacy_total || 0),
      color: "#EF4444",
    },
  ];

  const handleLegendClick = (data) => {
    setHiddenItems((prev) =>
      prev.includes(data.value)
        ? prev.filter((item) => item !== data.value)
        : [...prev, data.value],
    );
  };

  const filteredPieData = pieData.filter(
    (item) => !hiddenItems.includes(item.name),
  );

  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  // ==========================================
  // 1. EXTRACT THE UI CONTENT INTO A VARIABLE
  // ==========================================
  const chartContent = (
    <Box
      sx={{
        width: previewMode ? "100%" : "92%",
        // If in PDF print mode, let height adjust automatically so it doesn't get cut off
        height: previewMode ? "auto" : "93vh",
        maxWidth: "1200px",
        maxHeight: previewMode ? "none" : "94vh",
        overflowY: previewMode ? "visible" : "auto",
        background: "#f8fafc",
        margin: previewMode ? "0" : "30px auto",
        borderRadius: "28px",
        p: previewMode ? 1 : 4,
      }}
    >
      {/* MODAL HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography
          sx={{
            fontSize: "30px",
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Revenue Analytics
          {filters.branch_name && filters.branch_name !== "all" && (
            <span
              style={{
                color: "#3f6f7a",
                fontSize: "30px",
                marginLeft: "10px",
              }}
            >
              ({filters.branch_name})
            </span>
          )}
        </Typography>

        {/* Hide the Close Button if we are printing the PDF */}
        {!previewMode && (
          <Button
            onClick={() => setOpen(false)}
            sx={{ minWidth: "40px", fontSize: "20px", color: "#64748b" }}
          >
            ✕
          </Button>
        )}
      </Box>

      {/* PIE CHART SECTION */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          flexWrap: { xs: "wrap", md: "nowrap" },
        }}
      >
        {/* LEFT SIDE CHART */}
        <Box
          sx={{
            width: { xs: "100%", md: "70%" },
            height: 420,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <Skeleton variant="rounded" width="100%" height={420} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  innerRadius={80}
                  paddingAngle={0.5}
                >
                  {filteredPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) => `₹ ${Number(value).toLocaleString()}`}
                />
                <Legend
                  verticalAlign="bottom"
                  content={() => (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      {pieData.map((item) => {
                        const disabled = hiddenItems.includes(item.name);
                        return (
                          <div
                            key={item.name}
                            onClick={() =>
                              handleLegendClick({ value: item.name })
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                              opacity: disabled ? 0.4 : 1,
                              textDecorationLine: disabled
                                ? "line-through"
                                : "none",
                            }}
                          >
                            <span
                              style={{
                                width: 15,
                                height: 8,
                                borderRadius: "40%",
                                background: item.color,
                              }}
                            />
                            <span>{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Box>

        {/* RIGHT SIDE LEGENDS */}
        <Box
          sx={{
            width: { xs: "100%", md: "40%" },
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {loading
            ? [...Array(7)].map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={55}
                  sx={{ borderRadius: "18px" }}
                />
              ))
            : pieData.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#f8fafc",
                    borderRadius: "18px",
                    px: 2.5,
                    py: 1.6,
                    border: "1px solid #e2e8f0",
                    transition: "0.2s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                    },
                  }}
                >
                  {/* LEFT */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        background: item.color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    ></Box>

                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "15px",
                        color: "#334155",
                      }}
                    >
                      {item.name}{" "}
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: "16px",
                          color: item.color,
                        }}
                      >
                        ({" "}
                        {total === 0
                          ? 0
                          : ((item.value / total) * 100).toFixed(0)}
                        % )
                      </span>
                    </Typography>
                  </Box>

                  {/* VALUE */}
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "16px",
                      color: item.color,
                    }}
                  >
                    ₹ {item.value.toLocaleString()}
                  </Typography>
                </Box>
              ))}
        </Box>
      </Box>

      {/* BOTTOM SIDE LEGENDS */}
      <Box>
        {loading ? (
          <Skeleton
            variant="rounded"
            width={"100%"}
            height={60}
            sx={{ marginTop: 1, borderRadius: 3 }}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              bgcolor: "#ebf0f1",
              border: "1px solid #e2e8f0",
              borderRadius: "18px",
              mt: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "18px",
                color: "#334155",
              }}
            >
              Total Billed Amount
            </Typography>

            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "20px",
                color: "#16a34a",
              }}
            >
              ₹ {Number(analytics?.total_bill_amount || 0).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  // ==========================================
  // 2. CHECK IF WE ARE IN PRINT PREVIEW MODE
  // ==========================================

  // If we are printing the PDF, return JUST the charts without the Modal overlay!
  if (previewMode) {
    return chartContent;
  }

  // Otherwise, return it as a popup Modal for normal dashboard viewing
  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      {chartContent}
    </Modal>
  );
};

export default IPDRevenueAnalyticsDetail;
