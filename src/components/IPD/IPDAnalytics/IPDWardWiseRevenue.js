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

export default function IPDWardWiseRevenue() {
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

      console.log("Sending Filters =>", filters);

      const res = await axios.get(`${API}/api/ward-revenue`, {
        params: filters,
        withCredentials: true,
      });

      // Default 1.5 second delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("API RESPONSE =>", res.data);

      if (res.data?.success) {
        setAnalytics(res.data.data || []);
      } else {
        setAnalytics([]);
      }
    } catch (error) {
      console.error("Ward Revenue Error:", error);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const colors = generateColors(analytics.length);

  const handleLegendClick = (data) => {
    setHiddenItems((prev) =>
      prev.includes(data.value)
        ? prev.filter((item) => item !== data.value)
        : [...prev, data.value],
    );
  };

  const filteredPieData = analytics.filter(
    (item) => !hiddenItems.includes(item.name),
  );

  const totalRevenue = analytics.reduce(
    (sum, item) => sum + Number(item.revenue || 0),
    0,
  );

  return (
    <Box
      sx={{
        boxShadow: 3,
        p: 3,
        height: 500,
        borderRadius: "32px",
      }}
    >
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
          Ward Wise Revenue
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          height: 400,
          gap: 1,
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
              lg: "50%",
            },
            pr: 1,
            borderRight: "solid #3f6f7a 3px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "stretch",
          }}
        >
          {loading ? (
            <Skeleton variant="rounded" height={420} />
          ) : analytics.length > 0 ? (
            <ResponsiveContainer>
              <PieChart width={280} height={280}>
                <Pie
                  data={analytics}
                  dataKey="revenue"
                  nameKey="ward_type_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={70}
                >
                  {analytics.map((_, index) => (
                    <Cell key={index} fill={colors[index]} />
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
                      {analytics.map((item) => {
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
          ) : (
            <Box
              sx={{
                height: "100%",
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

          <Box>
            {loading ? (
              <Skeleton
                variant="rounded"
                width={"100%"}
                height={60}
                sx={{
                  marginTop: 1,
                  borderRadius: 3,
                }}
              />
            ) : analytics.length > 0 ? (
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
                <>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    Total Ward Revenue :
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "16px",
                      color: "#16a34a",
                    }}
                  >
                    ₹ {totalRevenue.toLocaleString()}
                  </Typography>
                </>
              </Box>
            ) : (
              <></>
            )}
          </Box>
        </Box>

        {/* WARD LIST */}
        <Box
          sx={{
            width: {
              xs: "100%",
              lg: "50%",
            },

            height: 400, // same height as chart section
            overflowY: "auto",
            // pl: 3,

            // Optional scrollbar styling
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
                  {/* LEFT */}
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
                        background: `${colors[index]}`,
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
                      {ward.ward_type_name}

                      {/*{" "}
                      <span style={{ color: "#5b5b5b" }}>
                        {" "}
                        ( Total Patients:{" "}
                        <span style={{ color: colors[index] }}>
                          {" "}
                          {ward.total_patients}{" "}
                        </span>{" "}
                        )
                      </span> */}
                    </Typography>
                  </Box>

                  {/* VALUE */}
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "16px",
                      color: colors[index],
                    }}
                  >
                    ₹ {Number(ward.revenue).toLocaleString()}
                  </Typography>
                </Box>
              ))}
        </Box>
      </Box>
    </Box>
  );
}
