// DoctorSchedule.jsx
import React, { useState, useEffect } from "react";
import "../Styles/AppointmentDoctorsSchedule.css";
import api from "./services/api";
import { Skeleton } from "@mui/material";
 
const DoctorSchedule = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [dates, setDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState("");
 
  // Filters
  const [week, setWeek] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [weeks, setWeeks] = useState([]);
 
  // Mobile popup
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
 
 
 // useEffect to update weeks and dates
useEffect(() => {
  const generatedWeeks = generateWeeksForMonth(month, year);
  setWeeks(generatedWeeks);
 
  // Ensure selected week exists in this month
  const currentWeek = generatedWeeks.find((w) => w.value === week) || generatedWeeks[0];
  if (!currentWeek) return;
  if (currentWeek.value !== week) setWeek(currentWeek.value);
 
  // Set dates to only the selected week
  setDates(getDatesForWeek(currentWeek));
 
  // Fetch schedule
  fetchSchedule();
}, [month, year, week]);
 
 
 
// Get all dates of the current month ONLY
const getAllDatesOfMonth = (month, year) => {
  const dates = [];
  const totalDays = new Date(year, month, 0).getDate(); // last day of month
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    dates.push(date.toISOString().split("T")[0]); // YYYY-MM-DD
  }
  return dates;
};
 
// Generate weeks for the month only (1-7, 8-14, etc.)
const generateWeeksForMonth = (month, year) => {
  const weeks = [];
  const allDates = getAllDatesOfMonth(month, year);
  let weekNum = 1;
 
  for (let i = 0; i < allDates.length; i += 7) {
    const weekDates = allDates.slice(i, i + 7);
    weeks.push({
      value: weekNum,
      label: `Week ${weekNum}`,
      startDate: weekDates[0],
      endDate: weekDates[weekDates.length - 1],
    });
    weekNum++;
  }
 
  return weeks;
};
 
 
// Get dates for selected week
const getDatesForWeek = (weekObj) => {
  if (!weekObj) return [];
  const start = new Date(weekObj.startDate + "T00:00:00");
  const end = new Date(weekObj.endDate + "T00:00:00");
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};
  /* ===========================
     🔁 EFFECTS
     =========================== */
 
 
 
  // Generate dates + fetch schedule whenever week/month/year changes
 
  /* ===========================
     📡 API CALLS
     =========================== */
 
 const fetchSchedule = async () => {
  setLoading(true);
 
  try {
    const res = await api.get(
      `/schedule/schedule?week=${week}&month=${month}&year=${year}`
    );
 
    if (res.data.success) {
      const data = res.data.data;
 
      setBranch(data.branch || "");
      setDoctors(data.doctors || []);
      setTimeSlots(data.timeSlots || []);
 
      if (data.doctors?.length > 0 && !selectedDoctor) {
        setSelectedDoctor(data.doctors[0].id);
      }
    }
  } catch (error) {
    console.error("Error fetching schedule:", error);
 
    setDoctors([]);
    setTimeSlots([]);
  } finally {
    setLoading(false);
  }
};
 
 
  const fetchSlotDetails = async (slotId) => {
    try {
      const res = await api.get(
        `/schedule/schedule/slot-details/${slotId}`
      );
 
      if (res.data.success) {
        setSelectedSlotDetails(res.data.data);
        setShowMobilePopup(true);
      }
    } catch (error) {
      console.error("Error fetching slot details:", error);
    }
  };
 
  /* ===========================
     🛠️ FORMATTERS
     =========================== */
 
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return { day: days[date.getDay()], dateNum: date.getDate() };
  };
 
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${String(hour12).padStart(2, "0")}:${minutes} ${ampm}`;
  };
 
  /* ===========================
     🧩 SLOT HELPERS
     =========================== */
 
  const getAllTimes = () => {
    const times = new Set();
    timeSlots.forEach((slot) => {
      if (slot.slotTimeFrom) times.add(slot.slotTimeFrom);
    });
    return Array.from(times).sort();
  };
 
  const getSlot = (doctorId, date, time) => {
    return timeSlots.find(
      (slot) =>
        slot.staffId === doctorId &&
        slot.slotDate === date &&
        slot.slotTimeFrom === time
    );
  };
 
  const renderSlotCard = (slot) => {
    if (!slot) {
      return <div className="slot-card no-slot">No Slot</div>;
    }
 
    if (!slot.hasAppointment) {
      return <div className="slot-card available">Available</div>;
    }
 
    const statusColors = {
      pending: "status-pending",
      assigned: "status-assigned",
      approved: "status-approved",
      completed: "status-completed",
      cancelled: "status-cancelled",
      delayed: "status-delayed",
    };
 
    const statusClass = statusColors[slot.appointmentStatus] || "";
 
    return (
      <div
        className={`slot-card booked ${statusClass}`}
        onClick={() => fetchSlotDetails(slot.slotId)}
      >
        <div className="slot-client-name">
          {slot.clientName || "No Name"}
        </div>
 
        <div className="slot-time">
          {formatTime(slot.slotTimeFrom)} to{" "}
          {formatTime(slot.slotTimeTo)}
        </div>
 
        <div className="slot-action">
          {slot.purpose || "Consultation"}
        </div>
 
        <div className={`slot-status ${statusClass}`}>
          {slot.appointmentStatus}
        </div>
      </div>
    );
  };
 
  /* ===========================
     📱 MOBILE POPUP
     =========================== */
 
  const renderMobilePopup = () => {
    if (!showMobilePopup || !selectedSlotDetails) return null;
 
    return (
      <div
        className="mobile-popup-overlay"
        onClick={() => setShowMobilePopup(false)}
      >
        <div
          className="mobile-popup"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="popup-header">
            <h3>Appointment Details</h3>
            <button
              className="close-btn"
              onClick={() => setShowMobilePopup(false)}
            >
              ×
            </button>
          </div>
 
          <div className="popup-content">
            <div className="detail-section">
              <h4>Doctor Information</h4>
              <p>
                <strong>Name:</strong>{" "}
                {selectedSlotDetails.doctorName}
              </p>
              <p>
                <strong>Specialization:</strong>{" "}
                {selectedSlotDetails.doctorQualification}
              </p>
            </div>
 
            <div className="detail-section">
              <h4>Appointment Time</h4>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(
                  selectedSlotDetails.slotDate
                ).toLocaleDateString()}
              </p>
              <p>
                <strong>Time:</strong>{" "}
                {formatTime(
                  selectedSlotDetails.slotTimeFrom
                )}{" "}
                -{" "}
                {formatTime(
                  selectedSlotDetails.slotTimeTo
                )}
              </p>
            </div>
 
            {selectedSlotDetails.clientName && (
              <div className="detail-section">
                <h4>Patient Information</h4>
                <p>
                  <strong>Name:</strong>{" "}
                  {selectedSlotDetails.clientName}
                </p>
                <p>
                  <strong>Mobile:</strong>{" "}
                  {selectedSlotDetails.clientMobile}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {selectedSlotDetails.clientEmail}
                </p>
                {selectedSlotDetails.clientGender && (
                  <p>
                    <strong>Gender:</strong>{" "}
                    {selectedSlotDetails.clientGender}
                  </p>
                )}
                {selectedSlotDetails.clientBloodGroup && (
                  <p>
                    <strong>Blood Group:</strong>{" "}
                    {selectedSlotDetails.clientBloodGroup}
                  </p>
                )}
                {selectedSlotDetails.purpose && (
                  <p>
                    <strong>Purpose:</strong>{" "}
                    {selectedSlotDetails.purpose}
                  </p>
                )}
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`status-badge ${selectedSlotDetails.appointmentStatus}`}
                  >
                    {selectedSlotDetails.appointmentStatus}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
 
  const times = getAllTimes();
 
  if (loading) {
  return (
    <div className="schedule-container">
      {/* Left Sidebar Skeleton */}
      <div className="doctors-sidebar">
        <Skeleton
          variant="text"
          width={150}
          height={40}
          sx={{ mb: 2 }}
        />
 
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <Skeleton
              variant="rectangular"
              height={70}
              sx={{ borderRadius: 2 }}
            />
          </div>
        ))}
      </div>
 
      {/* Main Content Skeleton */}
      <div className="schedule-main">
        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          <Skeleton variant="rectangular" width={120} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
          <Skeleton variant="rectangular" width={120} height={40} />
        </div>
 
        {/* Schedule Table Skeleton */}
        <Skeleton
          variant="rectangular"
          height={60}
          sx={{ borderRadius: 1, mb: 1 }}
        />
 
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <Skeleton
            key={row}
            variant="rectangular"
            height={70}
            sx={{ borderRadius: 1, mb: 1 }}
          />
        ))}
      </div>
    </div>
  );
}
 
  return (
    <div className="schedule-container">
      {/* Left Sidebar - Doctors List */}
      <div className="doctors-sidebar">
        <h2 className="sidebar-title">Choose Doctor</h2>
        <div className="doctors-list">
          {doctors.length === 0 ? (
            <div className="no-doctors">
              No doctors found in this branch
            </div>
          ) : (
            doctors.map((doctor) => (
              <div
                key={doctor.id}
                className={`doctor-card ${
                  selectedDoctor === doctor.id ? "selected" : ""
                }`}
                onClick={() => setSelectedDoctor(doctor.id)}
              >
                <div className="doctor-avatar">
                  {doctor.profile_photo ? (
                    <img
                      src={`${process.env.REACT_APP_SITE_URL}/Images/${doctor.profile_photo}`}
                      alt={doctor.name}
                      className="doctor-avatar-img"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {doctor.name
                        ?.substring(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
 
                <div className="doctor-info">
                  <h3 className="doctor-name">
                    {doctor.name}
                  </h3>
                  <p className="doctor-specialization">
                    {doctor.qualification || "Specialist"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
 
      {/* Main Schedule Area */}
      <div className="schedule-main">
        {/* Filters */}
        <div className="schedule-filters">
          <div className="filter-group">
            <label>Week</label>
          <select value={week} onChange={(e) => setWeek(parseInt(e.target.value))}>
  {weeks.map((w) => (
    <option key={w.value} value={w.value}>
      {w.label}
    </option>
  ))}
</select>
 
          </div>
 
          <div className="filter-group">
            <label>Month</label>
            <select
              value={month}
              onChange={(e) =>
                setMonth(parseInt(e.target.value))
              }
            >
              {[
                { value: 1, label: "January" },
                { value: 2, label: "February" },
                { value: 3, label: "March" },
                { value: 4, label: "April" },
                { value: 5, label: "May" },
                { value: 6, label: "June" },
                { value: 7, label: "July" },
                { value: 8, label: "August" },
                { value: 9, label: "September" },
                { value: 10, label: "October" },
                { value: 11, label: "November" },
                { value: 12, label: "December" },
              ].map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
 
          <div className="filter-group">
            <label>Year</label>
            <select
              value={year}
              onChange={(e) =>
                setYear(parseInt(e.target.value))
              }
            >
              {Array.from({ length: 5 }, (_, i) =>
                new Date().getFullYear() - 2 + i
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
 
        {/* Schedule Table */}
        {dates.length === 0 || times.length === 0 ? (
          <div className="no-data">
            No schedule data available for this week
          </div>
        ) : (
          <div className="schedule-table-wrapper">
            <table className="schedule-table">
              <thead
                style={{
                  backgroundColor: "#01636B",
                  color: "white",
                }}
              >
                <tr>
                  <th
                    className="time-column"
                    style={{
                      backgroundColor: "#01636B",
                      color: "white",
                    }}
                  >
                    Time
                  </th>
                  {dates.map((date) => {
                    const { day, dateNum } = formatDate(date);
                    return (
                      <th key={date}>
                        <div className="date-header">
                          <span className="day-name">
                            {day} {dateNum}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {times.map((time) => (
                  <tr key={time}>
                    <td className="time-cell">
                      {formatTime(time)}
                    </td>
                    {dates.map((date) => {
                      const slot = getSlot(
                        selectedDoctor,
                        date,
                        time
                      );
                      return (
                        <td
                          key={`${date}-${time}`}
                          className="slot-cell"
                        >
                          {renderSlotCard(slot)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
      {/* Mobile Popup */}
      {renderMobilePopup()}
    </div>
  );
};
 
export default DoctorSchedule;