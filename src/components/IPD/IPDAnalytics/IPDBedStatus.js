import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  Card,
  CardContent,
  Typography,
  Skeleton,
  Box,
  Stack,
} from "@mui/material";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const API = process.env.REACT_APP_URL_IPD;

export const IPDBedStatus = ({
  filters = {
    filter_type: "currentmonth",
    branch_name: "all",
    start_date: "",
    end_date: "",
  },
}) => {
  const [loading, setLoading] = useState(true);

  const [chartData, setChartData] = useState([]);

  const [occupiedPercentage, setOccupiedPercentage] = useState(0);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await axios.get(`${API}/api/status-distribution`, {
        params: {
          branch_name: filters?.branch_name,
          filter_type: filters?.filter_type,
          start_date: filters?.start_date,
          end_date: filters?.end_date,
        },
        withCredentials: true,
      });

      const data = res.data.chart_data || [];

      const formatted = data.map((item) => ({
        name: item.label === "occupied" ? "Occupied Beds" : "Available Beds",
        value: item.total,
        percentage: item.percentage,
        color: item.label === "occupied" ? "#ef4444" : "#22c55e",
      }));

      setChartData(formatted);

      const occupied = formatted.find((x) => x.name === "Occupied");

      setOccupiedPercentage(occupied?.percentage || 0);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const hasData = chartData.some((item) => Number(item.value) > 0);

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  return (
    <Card
      sx={{
        borderRadius: "32px",
        boxShadow: 3,
        px: 1,
        height: "100%",
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
          Bed Status Distribution
        </Typography>

        {/* CHART */}

        {loading ? (
          <Skeleton
            variant="rounded"
            width="100%"
            height={370}
            sx={{ borderRadius: "20px" }}
          />
        ) : !hasData ? (
          <Box
            sx={{
              height: 350,
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
          <Box sx={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={0}
                  outerRadius={100}
                  paddingAngle={0.1}
                  label={({ percentage }) => `${percentage}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>

                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* LEGENDS */}

        {!loading && (
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 1 }}
          >
            {chartData.map((item) => (
              <Box
                key={item.name}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: item.color,
                  }}
                />

                <Typography fontSize={13} fontWeight={600}>
                  {item.name}
                </Typography>
              </Box>
            ))}
          </Stack>
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
            Occupied Bed Rate
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
              {occupiedPercentage}%
            </Typography>
          )}
        </Box> */}
      </CardContent>
    </Card>
  );
};

export default IPDBedStatus;



