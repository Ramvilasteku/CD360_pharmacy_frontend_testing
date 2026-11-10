// src/pharmacy/transfer/TransferList.js
//
// The list of transfers: Incoming / Outgoing / All, a status filter, search, and (admin only) a
// branch filter. In-transit transfers always come first. Rows scroll inside the list; the shared
// <AppPager> stays at the bottom. Clicking a row opens it.
//
// Staff only ever see transfers from or to their own branch (the server enforces it).

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import MoveToInboxOutlinedIcon from "@mui/icons-material/MoveToInboxOutlined";

import { cssVar, fade } from "../../theme/appColors";
import {
  BranchTag,
  EmptyState,
  STATUS,
  StatusPill,
  api,
  apiMessage,
  buttonSx,
  colHeadSx,
  fmtDateTime,
  num,
  thinScroll,
} from "./transferShared";
import AppPager from "../shared/AppPager";

const PAGE_SIZES = [5, 10, 20, 50, 100]; // orders per page

const STATUS_FILTERS = [
  { value: "any", label: "Any status" },
  ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })),
];

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** "Kukatpally → Ameerpet", with the user's own branch emphasised. */
function Route({ from, to, myBranch }) {
  const mine = (b) => myBranch && String(b).toLowerCase() === String(myBranch).toLowerCase();
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
      <BranchTag strong={mine(from)}>{from}</BranchTag>
      <ArrowForwardIcon sx={{ fontSize: 15, color: "text.secondary", flexShrink: 0 }} />
      <BranchTag strong={mine(to)}>{to}</BranchTag>
    </Stack>
  );
}

export default function TransferList({ info, reloadKey, onOpen, onPendingChange, canSend, onNew }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const isAdmin = !!info?.is_admin;

  const [direction, setDirection] = useState("all");
  const [status, setStatus] = useState("any");
  const [branch, setBranch] = useState("all"); // admin only
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const q = useDebounced(search.trim(), 300);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const reqId = useRef(0);

  // Incoming / Outgoing mean something only when there is one branch to be relative to
  const scoped = !isAdmin || branch !== "all";

  useEffect(() => setPage(1), [direction, status, branch, q, pageSize]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    api
      .list({
        direction: scoped ? direction : "all",
        status: status !== "any" ? status : undefined,
        branch: isAdmin && branch !== "all" ? branch : undefined,
        search: q || undefined,
        page,
        limit: pageSize,
      })
      .then((r) => {
        if (id !== reqId.current) return;
        setRows(r.data || []);
        setTotal(r.pagination?.total || 0);
        setPending(r.pending_to_accept || 0);
      })
      .catch((e) => id === reqId.current && setError(apiMessage(e, "Could not load transfers.")))
      .finally(() => id === reqId.current && setLoading(false));
  }, [direction, status, branch, q, page, pageSize, scoped, isAdmin, reloadKey, retry]);

  useEffect(() => {
    if (onPendingChange) onPendingChange(pending);
  }, [pending, onPendingChange]);

  const filtered = status !== "any" || !!q || (scoped && direction !== "all") || branch !== "all";
  const branchOptions = useMemo(() => info?.source_branches || [], [info]);

  /* ---------------- toolbar ---------------- */
  const toolbar = (
    <Box sx={{ flexShrink: 0, px: { xs: 1.5, md: 2.5 }, pt: 1, pb: 1.25, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
      {scoped && (
        <Tabs
          value={direction}
          onChange={(_, v) => setDirection(v)}
          variant={phone ? "fullWidth" : "standard"}
          sx={{ minHeight: 40, mb: 1, "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600, fontSize: 14 } }}
        >
          <Tab value="all" label="All" />
          <Tab
            value="incoming"
            label={
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <span>Incoming</span>
                {pending > 0 && (
                  <Box
                    component="span"
                    aria-label={`${pending} waiting`}
                    sx={{ minWidth: 20, height: 20, px: 0.6, borderRadius: 10, display: "inline-grid", placeItems: "center", fontSize: 11.5, fontWeight: 700, color: cssVar("white"), bgcolor: cssVar("warning") }}
                  >
                    {pending > 99 ? "99+" : pending}
                  </Box>
                )}
              </Stack>
            }
          />
          <Tab value="outgoing" label="Outgoing" />
        </Tabs>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          placeholder="Search transfer no., branch or sender"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 0, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper" } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Clear search" onClick={() => setSearch("")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Stack direction="row" spacing={1}>
          {isAdmin && (
            <TextField
              select
              size="small"
              label="Branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              sx={{ flex: 1, minWidth: { sm: 170 }, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            >
              <MenuItem value="all">All branches</MenuItem>
              {branchOptions.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ flex: 1, minWidth: { sm: 150 }, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          >
            {STATUS_FILTERS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>
    </Box>
  );

  /* ---------------- rows ---------------- */
  // the branch to emphasise in each row: your own, or (admin) the one filtered on
  const myBranch = isAdmin ? (branch !== "all" ? branch : null) : info?.my_branch;
  const waitingForMe = (t) => t.status === "in_transit" && t.can_accept;

  const desktopTable = (
    <Table stickyHeader size="small" sx={{ minWidth: 760 }}>
      <TableHead>
        <TableRow>
          {["Transfer", "From → To", "Items", "Sent", "Status", ""].map((h, i) => (
            <TableCell key={h || i} sx={{ ...colHeadSx, py: 1.1 }} align={i === 2 ? "right" : "left"}>
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((t) => (
          <TableRow
            key={t.transfer_number}
            hover
            onClick={() => onOpen(t.transfer_number)}
            sx={{
              cursor: "pointer",
              bgcolor: waitingForMe(t) ? fade(cssVar("warning"), 0.05) : undefined,
              "& td": { borderColor: "divider" },
            }}
          >
            <TableCell sx={{ py: 1.25 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{t.transfer_number}</Typography>
              {!isAdmin && (
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{t.direction === "incoming" ? "Incoming" : "Outgoing"}</Typography>
              )}
            </TableCell>
            <TableCell sx={{ maxWidth: 320 }}>
              <Route from={t.from_branch} to={t.to_branch} myBranch={myBranch} />
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{num(t.total_units)} tablets</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {t.line_count} {t.line_count === 1 ? "batch" : "batches"}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography sx={{ fontSize: 13.5 }}>{fmtDateTime(t.sent_at)}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
                by {t.sent_by_name || "—"}
              </Typography>
            </TableCell>
            <TableCell>
              <StatusPill status={t.status} />
            </TableCell>
            <TableCell align="right" sx={{ pr: 2 }}>
              {waitingForMe(t) ? (
                <Button size="small" variant="contained" disableElevation sx={buttonSx} onClick={(e) => { e.stopPropagation(); onOpen(t.transfer_number); }}>
                  Review
                </Button>
              ) : (
                <ChevronRightIcon sx={{ color: "text.secondary", verticalAlign: "middle" }} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const phoneCards = (
    <Stack spacing={1} sx={{ p: 1.5 }}>
      {rows.map((t) => (
        <Box
          key={t.transfer_number}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(t.transfer_number)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(t.transfer_number)}
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            border: 1,
            borderColor: waitingForMe(t) ? fade(cssVar("warning"), 0.5) : "divider",
            cursor: "pointer",
            "&:active": { bgcolor: fade(cssVar("primary"), 0.04) },
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{t.transfer_number}</Typography>
            <StatusPill status={t.status} size="sm" />
          </Stack>
          <Box sx={{ mt: 1 }}>
            <Route from={t.from_branch} to={t.to_branch} myBranch={myBranch} />
          </Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1, color: "text.secondary", fontSize: 12.5 }}>
            <span>
              {num(t.total_units)} tablets · {t.line_count} {t.line_count === 1 ? "batch" : "batches"}
            </span>
            <span>{fmtDateTime(t.sent_at)}</span>
          </Stack>
          {waitingForMe(t) && (
            <Typography sx={{ mt: 1, fontSize: 12.5, fontWeight: 600, color: cssVar("warning") }}>Waiting for you to accept</Typography>
          )}
        </Box>
      ))}
    </Stack>
  );

  const skeleton = (
    <Stack spacing={1} sx={{ p: 2 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={phone ? 92 : 48} />
      ))}
    </Stack>
  );

  let body;
  if (loading && !rows.length) body = skeleton;
  else if (error) {
    body = (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }} action={<Button color="inherit" size="small" onClick={() => setRetry((n) => n + 1)}>Retry</Button>}>
          {error}
        </Alert>
      </Box>
    );
  } else if (!rows.length) {
    body = filtered ? (
      <EmptyState icon={<SearchIcon />} title="No transfers match">
        Try another status or search.
      </EmptyState>
    ) : (
      <EmptyState
        icon={direction === "incoming" ? <MoveToInboxOutlinedIcon /> : <SyncAltIcon />}
        title="No transfers yet"
        action={
          canSend && onNew ? (
            <Button variant="contained" disableElevation onClick={onNew} sx={buttonSx}>
              Send stock to a branch
            </Button>
          ) : null
        }
      >
        Stock you send to another branch, or that another branch sends you, shows up here.
      </EmptyState>
    );
  } else body = phone ? phoneCards : desktopTable;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {toolbar}

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", opacity: loading && rows.length ? 0.6 : 1, transition: "opacity .15s", ...thinScroll }}>
        {body}
      </Box>

      {total > 0 && (
        <AppPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={setPageSize}
          disabled={loading}
        />
      )}
    </Box>
  );
}