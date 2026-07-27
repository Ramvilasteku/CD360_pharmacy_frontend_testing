import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";

import { Box, Typography, Skeleton } from "@mui/material";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

import { IPDFilterContext } from "./IPDFilterContext";

const API = process.env.REACT_APP_URL_IPD;

export default function IPDWardWiseOccupancy() {
  const { filters } = useContext(IPDFilterContext);

  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState([]);
  const [hiddenItems, setHiddenItems] = useState([]);

  const generateColors = (count) => {
    return Array.from({ length: count }, (_, index) => {
      const hue = (index * 137.508) % 360;
      return `hsl(${hue},70%,55%)`;
    });
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/api/ward-wise`, {
        params: filters,
        withCredentials: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (res.data?.success) {
        setAnalytics(res.data.analytics || []);
      } else {
        setAnalytics([]);
      }
    } catch (error) {
      console.error("Ward Occupancy Analytics Error:", error);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const colors = generateColors(analytics.length);

  const pieData = analytics
    .filter((item) => !hiddenItems.includes(item.ward_type))
    .map((item) => ({
      name: item.ward_type,
      value: Number(item.occupied_beds || 0),
    }));

  const handleLegendClick = (data) => {
    setHiddenItems((prev) =>
      prev.includes(data.value)
        ? prev.filter((item) => item !== data.value)
        : [...prev, data.value],
    );
  };

  const totalOccupiedBeds = analytics.reduce(
    (sum, item) => sum + Number(item.occupied_beds || 0),
    0,
  );

  return (
    <Box
      sx={{
        boxShadow: 3,
        p: 3,
        borderRadius: "32px",
      }}
    >
      {/* TITLE */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#3f6f7a",
          }}
        >
          Ward Wise Occupancy 
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          height: 350,
          gap: 3,
          flexWrap: {
            xs: "wrap",
            lg: "nowrap",
          },
        }}
      >
        {/* PIE CHART */}
        <Box
          sx={{
            width: {
              xs: "100%",
              lg: "40%",
            },
            pr: 2,
            borderRight: "solid 2px #3f6f7a",
          }}
        >
          {loading ? (
            <Skeleton variant="rounded" height={300} />
          ) : analytics.length > 0 ? (
            <Box
              sx={{
                flex: 1,
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <PieChart width={280} height={280}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={colors[index]} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value, name) => [value, name]}
                  labelFormatter={() => ""}
                />
              </PieChart>
            </Box>
          ) : (
            <Box
              sx={{
                height: "80%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                No Data Found
              </Typography>
            </Box>
          )}

          {/* TOTAL CARD */}
          <Box>
            {loading ? (
              <Skeleton
                variant="rounded"
                width="100%"
                height={60}
                sx={{
                  marginTop: 1,
                  borderRadius: 3,
                }}
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
                  Total Occupied Beds :
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: "20px",
                    color: "#16a34a",
                  }}
                >
                  {totalOccupiedBeds}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        {/* RIGHT SIDE LIST */}
        <Box
          sx={{
            width: {
              xs: "100%",
              lg: "65%",
            },
            height: 320,
            overflowY: "auto",
            pr: 1,

            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#cbd5e1",
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#f1f5f9",
            },
          }}
        >
          {loading
            ? [...Array(18)].map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={60}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                  }}
                />
              ))
            : analytics.map((ward, index) => (
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
                    my: 0.5,
                    border: "1px solid #e2e8f0",
                    transition: "0.2s",

                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        background: colors[index],
                      }}
                    />

                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "15px",
                        color: "#334155",
                      }}
                    >
                      {ward.ward_type} Occupied Beds :
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "20px",
                      color: colors[index],
                    }}
                  >
                    {ward.occupied_beds}
                  </Typography>
                </Box>
              ))}
        </Box>
      </Box>
    </Box>
  );
}
