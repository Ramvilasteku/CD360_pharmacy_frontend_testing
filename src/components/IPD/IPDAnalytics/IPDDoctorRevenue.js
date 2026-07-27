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
  Cell,
  LabelList,
} from "recharts";

import { IPDFilterContext } from "./IPDFilterContext";

const API = process.env.REACT_APP_URL_IPD;

const IPDDoctorRevenueAnalytics = () => {
  const { filters } = useContext(IPDFilterContext);

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  const fetchDoctorRevenue = async () => {
    try {
      setLoading(true);

      console.log("Filters:", filters);

      const [response] = await Promise.all([
        axios.get(`${API}/api/doctor-wise/revenue`, {
          params: filters,
          withCredentials: true,
        }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);

      const doctors = response?.data?.data || [];

      const formatted = doctors.map((doctor, index) => ({
        rank: `#${index + 1}`,
        doctor_name: doctor.doctor_name,
        revenue: Number(doctor.revenue),
        patients: doctor.total_patients,
      }));

      setChartData(formatted);
    } catch (error) {
      console.error(error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorRevenue();
  }, [filters]);

  return (
    <Card
      sx={{
        borderRadius: "32px",
        boxShadow: 3,
        height: 500,
        p: 2,
      }}
    >
      <CardContent>
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#3f6f7a",
            mb: 2,
          }}
        >
          Doctor Wise Revenue
        </Typography>

        {loading ? (
          <Box sx={{ mt: 5, height: 350 }}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Box
                key={item}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  my: 2.5,
                }}
              >
                <Skeleton
                  variant="text"
                  width={40}
                  height={30}
                  sx={{ mr: 2 }}
                />

                <Skeleton
                  variant="rounded"
                  width={`${90 - item * 8}%`}
                  height={35}
                  sx={{
                    borderRadius: "10px",
                  }}
                />
              </Box>
            ))}
          </Box>
        ) : chartData.length === 0 ? (
          <Box
            sx={{
              height: 350,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No Data Available
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              height: 400,
              overflowY: "auto",
              pr: 1,
            }}
          >
            <ResponsiveContainer
              width="99%"
              height={Math.max(chartData.length * 95, 380)}
            >
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{
                  top: 5,
                  right: 70,
                  left: 0,
                  bottom: 5,
                }}
              >
                <XAxis hide type="number" />

                <YAxis
                  dataKey="rank"
                  type="category"
                  width={80}
                  tick={({ x, y, payload }) => {
                    const rank = payload.value;

                    let textColor = "#3f6f7a";
                    let bgColor = "transparent";

                    if (rank === "#1") {
                      textColor = "#fff";
                      bgColor = "#fc5e1a";
                    } else if (rank === "#2") {
                      textColor = "#fff";
                      bgColor = "#00CFFF";
                    } else if (rank === "#3") {
                      textColor = "#fff";
                      bgColor = "#885726";
                    }

                    const isTop3 = ["#1", "#2", "#3"].includes(rank);

                    return (
                      <g transform={`translate(${x - 40}, ${y - 12})`}>
                        {isTop3 && (
                          <rect width={43} height={34} rx={12} fill={bgColor} />
                        )}

                        <text
                          x={20}
                          y={22}
                          textAnchor="middle"
                          fill={textColor}
                          fontSize={16}
                          fontWeight={800}
                        >
                          {rank}
                        </text>
                      </g>
                    );
                  }}
                />

                <Tooltip
                  formatter={(value, name) => {
                    if (name === "revenue") {
                      return [
                        `₹${Number(value).toLocaleString("en-IN")}`,
                        "Revenue",
                      ];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => {
                    const doctor = chartData.find((d) => d.rank === label);

                    return `${doctor?.doctor_name} • Patients: ${doctor?.patients}`;
                  }}
                />

                <Bar
                  fill="#3f6f7a"
                  dataKey="revenue"
                  radius={[0, 12, 12, 0]}
                  barSize={35}
                >
                  {/* Doctor Name Inside Bar */}
                  <LabelList
                    dataKey="doctor_name"
                    position="insideLeft"
                    fill="#fff"
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  />

                  {/* Revenue at End */}
                  <LabelList
                    dataKey="revenue"
                    position="right"
                    formatter={(value) => {
                      if (value >= 10000000)
                        return `₹${(value / 10000000).toFixed(1)}Cr`;

                      if (value >= 100000)
                        return `₹${(value / 100000).toFixed(1)}L`;

                      return `₹${value.toLocaleString("en-IN")}`;
                    }}
                    style={{
                      fontWeight: 700,
                      fill: "#333",
                      fontSize: 14,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default IPDDoctorRevenueAnalytics;
