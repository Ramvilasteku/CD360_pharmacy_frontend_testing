import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Divider,
  Skeleton,
} from "@mui/material";
import api from "./services/api"; // adjust path if needed
 
 
export default function DoctorsScheduleCard() {
  const [loading, setLoading] = useState(true);
 
  const [doctorStats, setDoctorStats] = useState({
    availableDoctors: 0,
    onLeaveDoctors: 0,
  });
 
  const [appointmentStats, setAppointmentStats] = useState({
    totalAppointments: 0,
  });
 
  /* ===============================
     FETCH DOCTOR SCHEDULE SUMMARY
     Backend → /doctor/schedule-summary
  =============================== */
 const fetchDoctorSchedule = async () => {
  try {
    const res = await api.get("/api/doctor/schedule-summary");
 
    if (res.data?.success) {
      setDoctorStats({
        availableDoctors: res.data.availableDoctors ?? 0,
        onLeaveDoctors: res.data.onLeaveDoctors ?? 0,
      });
    }
  } catch (error) {
    console.error("Doctor schedule fetch error:", error);
 
    setDoctorStats({
      availableDoctors: 0,
      onLeaveDoctors: 0,
    });
  }
};
 
  /* ===============================
     FETCH TOTAL APPOINTMENTS COUNT
     Backend → /appointment/appointments/count
  =============================== */
  const fetchAppointmentsCount = async () => {
  try {
    const res = await api.get("/appointment/appointments/count");
 
    if (res.data?.success) {
      setAppointmentStats({
        totalAppointments: res.data.totalAppointments ?? 0,
      });
    }
  } catch (error) {
    console.error("Appointment count fetch error:", error);
 
    setAppointmentStats({
      totalAppointments: 0,
    });
  }
};
 
  /* ===============================
     LOAD ALL DATA
  =============================== */
 useEffect(() => {
  const loadData = async () => {
    setLoading(true);
 
    await Promise.all([
      fetchDoctorSchedule(),
      fetchAppointmentsCount(),
    ]);
 
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
 
  loadData();
}, []);
 
  return (
    <Card
      sx={{
        bgcolor: "#01636B",
        borderRadius: 4,
        color: "white",
        width: "100%",
        height: 170,
      }}
    >
      <CardContent sx={{ p: 1, textAlign: "center" }}>
        {/* TITLE */}
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", mb: 1 }}>
          Doctors Schedule
        </Typography>
 
        <Divider
          sx={{
            bgcolor: "rgba(255,255,255,0.4)",
            height: 2,
            width: "70%",
            mx: "auto",
            mb: 1,
          }}
        />
 
        {/* AVAILABLE / ON LEAVE */}
        <Grid container spacing={1} justifyContent="space-evenly">
          <Grid item xs={6}>
            <Typography sx={{ fontSize: "0.8rem", opacity: 0.9 }}>
              Available
            </Typography>
            <Typography sx={{ fontSize: "1.4rem", fontWeight: 700 }}>
              {loading ? (
                <Skeleton
                  variant="text"
                  width={40}
                  height={35}
                  sx={{ bgcolor: "rgba(255,255,255,0.25)", mx: "auto" }}
                />
              ) : (
                doctorStats.availableDoctors
              )}
            </Typography>
          </Grid>
 
          <Grid item xs={6}>
            <Typography sx={{ fontSize: "0.8rem", opacity: 0.9 }}>
              On Leave
            </Typography>
           <Typography sx={{ fontSize: "1.4rem", fontWeight: 700 }}>
              {loading ? (
                <Skeleton
                  variant="text"
                  width={40}
                  height={35}
                  sx={{ bgcolor: "rgba(255,255,255,0.25)", mx: "auto" }}
                />
              ) : (
                doctorStats.onLeaveDoctors
              )}
            </Typography>
          </Grid>
        </Grid>
 
        {/* TOTAL APPOINTMENTS */}
        <Box sx={{ mt: 0 }}>
          <Typography sx={{ fontSize: "1.6rem", fontWeight: 700 }}>
            {loading ? (
              <Skeleton
                variant="text"
                width={60}
                height={40}
                sx={{ bgcolor: "rgba(255,255,255,0.25)", mx: "auto" }}
              />
            ) : (
              appointmentStats.totalAppointments
            )}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", opacity: 0.85 }}>
            Total Appointments
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}