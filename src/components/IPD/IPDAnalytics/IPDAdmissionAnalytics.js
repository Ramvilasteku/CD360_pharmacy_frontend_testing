import React, { useContext, useEffect, useState } from "react";
import axios from "axios";

import {
  Card,
  CardContent,
  Typography,
  Skeleton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Box,
} from "@mui/material";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { IPDFilterContext } from "./IPDFilterContext";

const API = process.env.REACT_APP_URL_IPD;

const IPDAdmissionAnalytics = () => {

    const { filters } = useContext(IPDFilterContext);
  
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    try {
      setLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await axios.get(`${API}/api/admissions-graph`, {
        params: filters,
        withCredentials: true,
      });

      setGraphData(res.data.graph_data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filters) return;

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

  const hasData = graphData.some((item) => Number(item.total_admissions) > 0);

  return (
    <Card
      sx={{
        boxShadow: 3,
        p: 2,
        height: 480,
        borderRadius: "32px",
      }}
    >
      <CardContent>
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
            IPD Admissions Analytics
          </Typography>
        </Box>

        {loading ? (
          <Skeleton
            variant="rectangular"
            height={380}
            sx={{ borderRadius: 2 }}
          />
        ) : !hasData ? (
          <Box
            sx={{
              height: 380,
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
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />

              {/* Bottom Axis - Date */}
              <XAxis
                dataKey="label"
                label={{
                  value: "Date",
                  position: "insideBottom",
                  offset: -5,
                }}
              />

              {/* Left Axis - Total Patients */}
              <YAxis
                label={{
                  value: "Total Patients",
                  angle: -90,
                  position: "insideLeft",
                }}
              />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="total_admissions"
                name="Total Patients"
                stroke="#3f6f7a"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default IPDAdmissionAnalytics;
