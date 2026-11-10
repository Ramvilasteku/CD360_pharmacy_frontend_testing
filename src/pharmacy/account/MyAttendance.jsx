// src/pharmacy/account/MyAttendance.jsx
//
// Attendance — for pharmacy staff (/pharmacy/attendance). Any role, own days only.
//
//   ┌ Today ───────────────────────────────────────────────┐
//   │ Friday, 23 Oct     Working since 9:14 AM · 3h 12m    │  [ Clock out ]
//   └──────────────────────────────────────────────────────┘
//   ┌ [📅 October 2026 ▾]     Days 18 · Present 15 · Half day 2 · Short 1 · 141h ┐
//   │ Date        Day   In       Out      Hours   Status    │  scrolls inside itself
//   └──────────────────────────────────────────────────────┘
//
//   GET  /api/pharmacy/account/get/attendance/today
//   GET  /api/pharmacy/account/getall/attendance?month=YYYY-MM
//   POST /api/pharmacy/account/post/clock-in
//   POST /api/pharmacy/account/post/clock-out
//
// Days are India dates, stamped by the server (same table and rules as the doctor and
// receptionist attendance): present at 6 h or more, half day at 4 h, short below that.
//
// The days are paged with the shared AppPager — 5 a page to start (5 / 10 / 20 / 31).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Popover, Skeleton, Snackbar, Typography, useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AppPager, { clampPage, pageSlice } from "../shared/AppPager";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const PAGE_SIZES = [5, 10, 20, 31]; // days per page (the shared AppPager)
const DEFAULT_PAGE_SIZE = 5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const API_BASE = process.env.REACT_APP_SITE_URL || "";
const API = `${API_BASE}/api/pharmacy/account`;
const http = axios.create({ withCredentials: true });

/* ------------------------------------------------------------------ */
/* Time helpers — everything in India time                              */
/* ------------------------------------------------------------------ */
const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const istNowMinutes = () => {
  const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }).split(":").map(Number);
  return h * 60 + m;
};
const toMinutes = (t) => {
  const [h, m] = String(t || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};
/* "09:14:00" → "9:14 AM" */
const clock = (t) => {
  const mins = toMinutes(t);
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
/* 3.2 → "3h 12m", minutes too */
const span = (hours) => {
  const total = Math.max(0, Math.round((Number(hours) || 0) * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};
const dayOf = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
/* ------------------------------------------------------------------ */
/* Status                                                               */
/* ------------------------------------------------------------------ */
const STATUS = {
  present: { label: "Present", tone: "success" },
  half_day: { label: "Half day", tone: "warning" },
  absent: { label: "Short", tone: "error" },
  working: { label: "Working", tone: "info" },
  open: { label: "No clock-out", tone: "warning" },
};
const statusOf = (row, today) => (row.clock_out ? row.status || "present" : row.date === today ? "working" : "open");

function StatusTag({ status }) {
  const s = STATUS[status] || STATUS.present;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.25,
        borderRadius: 1.5,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: (t) => t.palette[s.tone].dark,
        bgcolor: (t) => alpha(t.palette[s.tone].main, 0.12),
      }}
    >
      {s.label}
    </Box>
  );
}

/* ================================================================== */
export default function MyAttendance() {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));

  const [today, setToday] = useState(null); // today's row or null
  const [todayLoading, setTodayLoading] = useState(true);
  const [month, setMonth] = useState(() => istToday().slice(0, 7));
  const [list, setList] = useState({ rows: [], totals: null });
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // "in" | "out"
  const [confirmOut, setConfirmOut] = useState(false);
  const [toast, setToast] = useState(null); // { severity, text }
  const [, setTick] = useState(0); // re-render each minute for the running timer
  const [picker, setPicker] = useState(null); // the month button, while the picker is open
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  useEffect(() => setPage(1), [month]); // another month starts on its first page
  const [pickYear, setPickYear] = useState(() => Number(istToday().slice(0, 4)));

  const todayIso = istToday();
  const thisMonth = todayIso.slice(0, 7);

  const loadToday = useCallback(async () => {
    try {
      const r = await http.get(`${API}/get/attendance/today`);
      setToday(r.data?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't load today's attendance");
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const loadMonth = useCallback(async (ym) => {
    setListLoading(true);
    try {
      const r = await http.get(`${API}/getall/attendance`, { params: { month: ym } });
      setList({ rows: r.data?.data || [], totals: r.data?.totals || null });
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't load your attendance");
      setList({ rows: [], totals: null });
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);
  useEffect(() => {
    loadMonth(month);
  }, [loadMonth, month]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const working = !!today && !today.clock_out;
  const workedNow = working ? Math.max(0, istNowMinutes() - (toMinutes(today.clock_in) || 0)) / 60 : 0;

  const clockIn = async () => {
    setBusy("in");
    try {
      await http.post(`${API}/post/clock-in`);
      setToast({ severity: "success", text: "Clocked in — have a good day" });
      await Promise.all([loadToday(), month === thisMonth ? loadMonth(month) : null]);
    } catch (e) {
      setToast({ severity: "error", text: e?.response?.data?.message || "Couldn't clock you in" });
    } finally {
      setBusy(null);
    }
  };

  const clockOut = async () => {
    setConfirmOut(false);
    setBusy("out");
    try {
      const r = await http.post(`${API}/post/clock-out`);
      setToast({ severity: "success", text: `Clocked out — ${span(r.data?.total_hours)} today` });
      await Promise.all([loadToday(), month === thisMonth ? loadMonth(month) : null]);
    } catch (e) {
      setToast({ severity: "error", text: e?.response?.data?.message || "Couldn't clock you out" });
    } finally {
      setBusy(null);
    }
  };

  const totals = list.totals;
  const rows = useMemo(() => list.rows.map((r) => ({ ...r, st: statusOf(r, todayIso) })), [list.rows, todayIso]);
  const safePage = clampPage(page, rows.length, pageSize);
  const pageRows = pageSlice(rows, safePage, pageSize);
  const card = { bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 3 };
  const todayDate = dayOf(todayIso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
 <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>


      {error && (
        <Alert severity="warning" variant="outlined" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ---------------- today ---------------- */}
      <Box sx={{ ...card, p: { xs: 2, md: 2.5 }, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", letterSpacing: "0.04em" }}>TODAY · {todayDate.toUpperCase()}</Typography>
          {todayLoading ? (
            <Skeleton width={260} height={34} />
          ) : !today ? (
            <Typography sx={{ fontSize: 19, fontWeight: 800, mt: 0.25 }}>You haven't clocked in yet</Typography>
          ) : working ? (
            <Typography sx={{ fontSize: 19, fontWeight: 800, mt: 0.25 }}>
              Working since {clock(today.clock_in)}
              <Box component="span" sx={{ color: "primary.main" }}> · {span(workedNow)}</Box>
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 19, fontWeight: 800, mt: 0.25 }}>
              {clock(today.clock_in)} – {clock(today.clock_out)}
              <Box component="span" sx={{ color: "text.secondary", fontWeight: 600 }}> · {span(today.total_hours)}</Box>
            </Typography>
          )}
          {!todayLoading && today && !working && (
            <Box sx={{ mt: 0.5 }}>
              <StatusTag status={statusOf(today, todayIso)} />
            </Box>
          )}
        </Box>
        {!todayLoading &&
          (!today ? (
            <Button
              variant="contained"
              disableElevation
              size="large"
              onClick={clockIn}
              disabled={!!busy}
              startIcon={busy === "in" ? <CircularProgress size={18} color="inherit" /> : <LoginOutlinedIcon />}
              sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2.5, px: 3, width: { xs: "100%", sm: "auto" } }}
            >
              Clock in
            </Button>
          ) : working ? (
            <Button
              variant="outlined"
              color="error"
              size="large"
              onClick={() => setConfirmOut(true)}
              disabled={!!busy}
              startIcon={busy === "out" ? <CircularProgress size={18} color="inherit" /> : <LogoutOutlinedIcon />}
              sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2.5, px: 3, width: { xs: "100%", sm: "auto" } }}
            >
              Clock out
            </Button>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "success.main", fontWeight: 700, fontSize: 14 }}>
              <CheckCircleOutlineIcon /> Done for today
            </Box>
          ))}
      </Box>

      {/* ---------------- the month ---------------- */}
   <Box sx={{ ...card, display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minHeight: 0 }}>

        {/* month on the left (calendar picker), the month's totals on the right */}
        <Box
          sx={{
            px: { xs: 1.5, md: 2.5 },
            py: 1.25,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            columnGap: 2,
            rowGap: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              onClick={(e) => {
                setPickYear(Number(month.slice(0, 4)));
                setPicker(e.currentTarget);
              }}
              aria-haspopup="dialog"
              aria-label={`Month: ${monthLabel(month)}. Choose another month`}
              startIcon={<CalendarMonthOutlinedIcon />}
              endIcon={<ExpandMoreIcon sx={{ transition: "transform .2s", transform: picker ? "rotate(180deg)" : "none" }} />}
              sx={{
                textTransform: "none",
                fontSize: 15.5,
                fontWeight: 800,
                color: "text.primary",
                borderRadius: 2,
                px: 1.5,
                border: 1,
                borderColor: picker ? "primary.main" : "divider",
                "& .MuiButton-startIcon": { color: "primary.main" },
              }}
            >
              {monthLabel(month)}
            </Button>
            {month !== thisMonth && (
              <Button size="small" onClick={() => setMonth(thisMonth)} sx={{ textTransform: "none", fontWeight: 700 }}>
                This month
              </Button>
            )}
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box role="group" aria-label={`Totals for ${monthLabel(month)}`} sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: { xs: "flex-start", sm: "flex-end" }, width: { xs: "100%", sm: "auto" } }}>
            {[
              ["Days", totals?.days ?? 0, "text.primary"],
              ["Present", totals?.present ?? 0, "success.main"],
              ["Half day", totals?.half_day ?? 0, "warning.dark"],
              ["Short", totals?.absent ?? 0, "error.main"],
            ].map(([label, value, color]) => (
              <Box key={label} sx={{ display: "flex", alignItems: "baseline", gap: 0.75, px: 1.25, py: 0.6, borderRadius: 2, bgcolor: "action.hover" }}>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{label}</Typography>
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{listLoading ? "–" : value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* the month picker: a year, then its twelve months */}
        <Popover
          open={!!picker}
          anchorEl={picker}
          onClose={() => setPicker(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{ sx: { mt: 0.75, p: 1.5, borderRadius: 2.5, width: 288 } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <IconButton size="small" onClick={() => setPickYear((y) => y - 1)} aria-label="Previous year">
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{pickYear}</Typography>
            <IconButton size="small" onClick={() => setPickYear((y) => y + 1)} disabled={pickYear >= Number(thisMonth.slice(0, 4))} aria-label="Next year">
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75 }}>
            {MONTHS.map((name, i) => {
              const ym = `${pickYear}-${String(i + 1).padStart(2, "0")}`;
              const on = ym === month;
              const future = ym > thisMonth;
              return (
                <Button
                  key={name}
                  disabled={future}
                  variant={on ? "contained" : "text"}
                  disableElevation
                  onClick={() => {
                    setMonth(ym);
                    setPicker(null);
                  }}
                  sx={{
                    textTransform: "none",
                    fontWeight: on ? 800 : 600,
                    borderRadius: 2,
                    py: 0.9,
                    color: on ? undefined : ym === thisMonth ? "primary.main" : "text.primary",
                    border: !on && ym === thisMonth ? 1 : 0,
                    borderColor: "primary.main",
                  }}
                >
                  {name}
                </Button>
              );
            })}
          </Box>
        </Popover>

        {/* days — scroll inside this box, not the page */}
        <Box
          tabIndex={0}
          aria-label={`Attendance for ${monthLabel(month)}`}
          sx={{ height: { xs: "auto", md: "calc(100dvh - 330px)" }, minHeight: 160, overflowY: "auto", outline: "none" }}
        >
          {listLoading ? (
            <Box sx={{ p: 2 }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={40} />
              ))}
            </Box>
          ) : !rows.length ? (
            <Typography sx={{ p: 4, textAlign: "center", color: "text.secondary", fontSize: 14 }}>
              No attendance in {monthLabel(month)}.
            </Typography>
          ) : phone ? (
            pageRows.map((r) => (
              <Box key={r.id} sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                    {dayOf(r.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                    {r.date === todayIso ? " · Today" : ""}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {clock(r.clock_in)} – {r.clock_out ? clock(r.clock_out) : "…"} {r.clock_out ? `· ${span(r.total_hours)}` : ""}
                  </Typography>
                </Box>
                <StatusTag status={r.st} />
              </Box>
            ))
          ) : (
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, "& td, & th": { px: 2.5, py: 1.1, textAlign: "left", borderBottom: 1, borderColor: "divider", whiteSpace: "nowrap" } }}>
              <Box component="thead" sx={{ position: "sticky", top: 0, zIndex: 1, bgcolor: "background.paper", "& th": { fontSize: 12, fontWeight: 700, color: "text.secondary" } }}>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </Box>
              <Box component="tbody" sx={{ "& tr:hover td": { bgcolor: "action.hover" }, "& td": { fontVariantNumeric: "tabular-nums" } }}>
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <Box component="td" sx={{ fontWeight: 700 }}>
                      {dayOf(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      {r.date === todayIso && (
                        <Box component="span" sx={{ ml: 1, fontSize: 11.5, fontWeight: 700, color: "primary.main" }}>
                          Today
                        </Box>
                      )}
                    </Box>
                    <td>{dayOf(r.date).toLocaleDateString("en-IN", { weekday: "long" })}</td>
                    <td>{clock(r.clock_in)}</td>
                    <td>{r.clock_out ? clock(r.clock_out) : "—"}</td>
                    <td>{r.clock_out ? span(r.total_hours) : r.date === todayIso ? span(workedNow) : "—"}</td>
                    <td>
                      <StatusTag status={r.st} />
                    </td>
                  </tr>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* pager — under the days, like every other pharmacy list */}
        {!listLoading && rows.length > 0 && (
          <AppPager
            page={safePage}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            sx={{ px: { xs: 1.5, md: 2.5 }, borderTop: 1, borderColor: "divider" }}
          />
        )}
      </Box>

      {/* ---------------- clock out? ---------------- */}
      <Dialog open={confirmOut} onClose={() => setConfirmOut(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: 17, fontWeight: 800, pb: 0.5 }}>Clock out now?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>
            You've worked {span(workedNow)} today. Once you clock out, today can't be clocked into again.
            {workedNow < 6 ? ` Under 6 hours counts as ${workedNow < 4 ? "short" : "a half day"}.` : ""}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOut(false)} sx={{ textTransform: "none", fontWeight: 600 }}>
            Not yet
          </Button>
          <Button variant="contained" color="error" disableElevation onClick={clockOut} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
            Clock out
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={toast?.severity || "success"} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}