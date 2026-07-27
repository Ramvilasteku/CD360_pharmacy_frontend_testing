import React, { useContext, useEffect, useState } from "react";
import axios from "axios";

import { Card, CardContent, Typography, Skeleton, Box } from "@mui/material";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
} from "recharts";
import { IPDFilterContext } from "./IPDFilterContext";

const API = process.env.REACT_APP_URL_IPD;

export const IPDBedBarOverview = () => {
  const { filters } = useContext(IPDFilterContext);

  const [loading, setLoading] = useState(true);

  const [analytics, setAnalytics] = useState({
    total_beds: 0,
    occupied_beds: 0,
    available_beds: 0,
    occupancy_rate: 0,
  });

  const [chartData, setChartData] = useState([]);

  const fetchOverview = async () => {
    try {
      setLoading(true);

      // Demo delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await axios.get(`${API}/api/overview`, {
        params: {
          branch_name: filters?.branch_name || "all",
        },
        withCredentials: true,
      });

      const data = res.data.analytics;

      setAnalytics(data);

      setChartData([
        {
          name: "Total Beds",
          value: Number(data.total_beds || 0),
          color: "#3f6f7a",
        },
        {
          name: "Occupied Beds",
          value: Number(data.occupied_beds || 0),
          color: "#ef4444",
        },
        {
          name: "Available Beds",
          value: Number(data.available_beds || 0),
          color: "#22c55e",
        },
      ]);
    } catch (error) {
      console.log("Bed Overview Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasData = chartData.some((item) => item.value > 0);

  useEffect(() => {
    fetchOverview();
  }, [filters?.branch_name]);

  return (
    <Card
      sx={{
        borderRadius: "32px",
        boxShadow: 3,
        p: 2,
        height: 435,
      }}
    >
      <CardContent>
        {/* HEADER */}
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#3f6f7a",
            mb: 1,
          }}
        >
          Current Month Bed Status
        </Typography>

        {/* CHART */}
        {loading ? (
          <Skeleton
            variant="rounded"
            width="100%"
            height={285}
            sx={{ borderRadius: "20px" }}
          />
        ) : !hasData ? (
          <Box
            sx={{
              height: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
              }}
            >
              No Data Available
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 20,
              }}
              barCategoryGap="5%"
            >
              <XAxis
                dataKey="name"
                axisLine={true}
                tickLine={false}
                interval={0}
                tick={({ x, y, payload, index }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={15}
                      textAnchor="middle"
                      fill={chartData[index]?.color}
                      fontSize={16}
                      fontWeight={700}
                    >
                      {payload.value.split(" ").map((word, i) => (
                        <tspan key={i} x="0" dy={i === 0 ? 0 : 14}>
                          {word}
                        </tspan>
                      ))}
                    </text>
                  </g>
                )}
              />

              <YAxis hide />

              <Tooltip />

              <Bar dataKey="value" radius={[12, 12, 0, 0]} maxBarSize={120}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}

                <LabelList
                  dataKey="value"
                  position="top"
                  style={{
                    fontWeight: 700,
                    fontSize: 20,
                  }}
                />

                <LabelList
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={700}
                  dataKey="name"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* OCCUPANCY RATE */}
        {/* <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: "18px",
            bgcolor: "#ebf0f1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            Occupancy Rate
          </Typography>

          {loading ? (
            <Skeleton width={80} />
          ) : (
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.3rem",
                color: "#3f6f7a",
              }}
            >
              {analytics.occupancy_rate}%
            </Typography>
          )}
        </Box> */}
      </CardContent>
    </Card>
  );
};

export default IPDBedBarOverview;
