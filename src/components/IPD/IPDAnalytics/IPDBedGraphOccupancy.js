import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, Typography, Skeleton, Box } from "@mui/material";
// 1. IMPORT THE CONTEXT
import { IPDFilterContext } from "./IPDFilterContext";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API = process.env.REACT_APP_URL_IPD;

const IPDBedGraphOccupancy = () => {
  const { filters } = useContext(IPDFilterContext);
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [graphType, setGraphType] = useState("daily");

  const formatDate = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      .toISOString()
      .split("T")[0];
  };

  const fillMissingDates = (startDate, endDate, apiData) => {
    const dataMap = new Map();

    apiData.forEach((item) => {
      dataMap.set(item.label, {
        occupied_beds: Number(item.occupied_beds) || 0,
        total_beds: Number(item.total_beds) || 0,
        available_beds: Number(item.available_beds) || 0,
      });
    });

    const result = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const key = formatDate(new Date(current));
      const row = dataMap.get(key);

      result.push({
        label: key,
        occupied_beds: row?.occupied_beds || 0,
        total_beds: row?.total_beds || 0,
        available_beds: row?.available_beds || 0,
      });

      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }

    return result;
  };

  const fetchGraph = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}/api/bed-occupancy-graph`, {
        params: filters,
        withCredentials: true,
      });

      const apiData = res?.data?.graph_data || [];

      // ======================
      // DAILY FILTERS (Day-Wise)
      // ======================
      // ✅ Removed "custom" from this array
      if (["currentmonth", "7days", "1month"].includes(filters.filter_type)) {
        let start;
        let end;
        const now = new Date();

        if (filters.filter_type === "currentmonth") {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          start.setHours(0, 0, 0, 0);

          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          end.setHours(23, 59, 59, 999);
        } else if (filters.filter_type === "7days") {
          start = new Date(now);
          start.setDate(now.getDate() - 7);
          start.setHours(0, 0, 0, 0);

          end = new Date(now);
          end.setHours(23, 59, 59, 999);
        } else if (filters.filter_type === "1month") {
          start = new Date(now);
          start.setMonth(now.getMonth() - 1);
          start.setHours(0, 0, 0, 0);

          end = new Date(now);
          end.setHours(23, 59, 59, 999);
        }

        const finalData = fillMissingDates(start, end, apiData);
        setGraphData(finalData);
      }
      // ======================
      // WEEK & MONTH FILTERS ("custom" is now handled here directly)
      // ======================
      else {
        setGraphData(apiData);
      }
    } catch (error) {
      console.log("Bed Occupancy Graph Error", error);
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
    fetchGraph();
  }, [
    filters?.branch_name,
    filters?.filter_type,
    filters?.start_date,
    filters?.end_date,
  ]);

  const formatXAxis = (value) => {
    if (!value) return "";

    // Monthly Graph
    if (graphType === "monthly") {
      const date = new Date(`${value}-01`);

      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }

    // Daily Graph
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };
  return (
    <Card
      sx={{
        boxShadow: 3,
        borderRadius: "24px",
        height: 500,
      }}
    >
      <CardContent>
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#3f6f7a",
            mb: 2,
          }}
        >
          Bed Occupancy Analytics
        </Typography>

        {loading ? (
          <Skeleton
            variant="rectangular"
            height={400}
            sx={{
              borderRadius: 2,
            }}
          />
        ) : graphData.length === 0 ? (
          <Box
            sx={{
              height: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No Data Available
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="label"
                tickFormatter={formatXAxis}
                tick={{
                  fontSize: 11,
                }}
              />

              <YAxis
                allowDecimals={false}
                label={{
                  value: "Occupied Beds",
                  angle: -90,
                  position: "insideLeft",
                }}
              />

              <Tooltip
                labelFormatter={formatXAxis}
                formatter={(value) => [value, "Occupied Beds"]}
              />

              <Line
                type="monotone"
                dataKey="occupied_beds"
                stroke="#3f6f7a"
                strokeWidth={4}
                dot={{
                  r: 4,
                }}
                activeDot={{
                  r: 7,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default IPDBedGraphOccupancy;
