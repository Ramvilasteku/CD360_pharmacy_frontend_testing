// src/pharmacy/transfer/NewTransfer.js
//
// Send stock to another branch. Opens inline (Back arrow returns to the list; it asks before
// throwing away lines you added).
//
//   From   staff: always their own branch (fixed, the server enforces it).
//          admin: chooses any branch that has staff or stock.
//   To     any OTHER branch of the same admin. The user's own branch is never offered —
//          two people in the same branch can't transfer to each other.
//   Lines  pick batches from the "from" branch's stock (active, not expired, quantity > 0) and
//          type how many STRIPS and loose TABLETS to send (a bottle / tube: how many packs) —
//          never more than the batch has. Strips are the batch's own (its units_per_pack).
//
// On send the stock leaves the "from" branch at once and shows as in transit; the receiving
// branch adds it to their stock when they accept. Needs pharmacy.purchase_transfer.create.
//
// Paging: both lists — the stock to pick from and the lines to send — show 5 rows a page by
// default (5 / 10 / 20, the shared AppPager under each list). Adding a batch jumps the "to send"
// list to the page holding it, and pressing Send with a problem jumps to the first bad line.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";

import { cssVar, fade, toneInk } from "../../theme/appColors";
import {
  BranchTag,
  ConfirmDialog,
  EmptyState,
  api,
  apiMessage,
  buttonSx,
  expiresSoon,
  fmtExpiry,
  num,
  packOf,
  qtyWords,
  thinScroll,
} from "./transferShared";
import { plural } from "../shared/pharmacyUnits";
import AppPager, { clampPage, pageSlice } from "../shared/AppPager";

const STOCK_LIMIT = 50;
const PAGE_SIZES = [5, 10, 20];
const DEFAULT_PAGE_SIZE = 5;
const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Tablets a line sends: strips × the batch's tablets per strip + loose tablets. */
const tabletsOf = (line) => {
  const { upp } = packOf(line);
  return (Number(line.strips) || 0) * upp + (upp > 1 ? Number(line.loose) || 0 : 0);
};

/** Problem with one line's quantity, or "" when it is fine. */
const qtyProblem = (line) => {
  const { upp } = packOf(line);
  const total = tabletsOf(line);
  if (String(line.strips ?? "").trim() === "" && String(line.loose ?? "").trim() === "") return "Enter a quantity";
  if (total < 1) return "Enter a quantity above 0";
  if (upp > 1 && Number(line.loose) >= upp) return `Loose tablets must be under ${upp} — that's a full strip`;
  if (total > line.quantity_available) return `Only ${qtyWords(line.quantity_available, line)} in this batch`;
  return "";
};

export default function NewTransfer({ info, onBack, onSent }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const isAdmin = !!info?.is_admin;

  /* ---------- branches ---------- */
  const [from, setFrom] = useState(isAdmin ? "" : info?.my_branch || "");
  const toOptions = useMemo(() => (info?.destination_branches || []).filter((b) => !same(b, from)), [info, from]);
  const [to, setTo] = useState("");
  useEffect(() => {
    if (to && !toOptions.some((b) => same(b, to))) setTo("");
    else if (!to && toOptions.length === 1 && from) setTo(toOptions[0]);
  }, [toOptions, to, from]);

  /* ---------- stock of the "from" branch ---------- */
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 300);
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState("");
  const [stockKey, setStockKey] = useState(0);
  const reqId = useRef(0);
  const [stockPage, setStockPage] = useState(1);
  const [stockSize, setStockSize] = useState(DEFAULT_PAGE_SIZE);
  useEffect(() => setStockPage(1), [from, q]); // a new search or branch starts on page 1

  useEffect(() => {
    if (!from) {
      setStock([]);
      return;
    }
    const id = ++reqId.current;
    setStockLoading(true);
    setStockError("");
    api
      .stock({ branch: isAdmin ? from : undefined, search: q || undefined, limit: STOCK_LIMIT })
      .then((d) => id === reqId.current && setStock(d.items || []))
      .catch((e) => id === reqId.current && setStockError(apiMessage(e, "Could not load stock.")))
      .finally(() => id === reqId.current && setStockLoading(false));
  }, [from, q, isAdmin, stockKey]);

  /* ---------- the lines to send ---------- */
  const [lines, setLines] = useState([]); // stock row + { qty, serverError }
  const [remarks, setRemarks] = useState("");
  const [touched, setTouched] = useState(false);
  const [mobileTab, setMobileTab] = useState("pick");
  const [cartPage, setCartPage] = useState(1);
  const [cartSize, setCartSize] = useState(DEFAULT_PAGE_SIZE);
  const pageOfLine = (index) => Math.floor(index / cartSize) + 1; // 0-based index → 1-based page
  const qtyRefs = useRef({});
  const focusNext = useRef(null);

  const inCart = useMemo(() => new Set(lines.map((l) => l.batch_id)), [lines]);

  const addLine = (row) => {
    if (inCart.has(row.batch_id)) {
      if (phone) setMobileTab("cart");
      setCartPage(pageOfLine(lines.findIndex((l) => l.batch_id === row.batch_id)));
      focusNext.current = row.batch_id;
      return;
    }
    setLines((ls) => [...ls, { ...row, strips: "", loose: "", serverError: "" }]);
    setCartPage(pageOfLine(lines.length)); // the new line is last — show its page
    if (!phone) focusNext.current = row.batch_id;
  };
  useEffect(() => {
    const id = focusNext.current;
    if (id && qtyRefs.current[id]) {
      qtyRefs.current[id].focus();
      focusNext.current = null;
    }
  });

  const setQty = (batchId, field, value) =>
    setLines((ls) => ls.map((l) => (l.batch_id === batchId ? { ...l, [field]: String(value).replace(/[^\d]/g, "").slice(0, 7), serverError: "" } : l)));
  const sendAll = (l) => {
    const { upp } = packOf(l);
    setLines((ls) =>
      ls.map((x) =>
        x.batch_id === l.batch_id
          ? { ...x, strips: String(Math.floor(l.quantity_available / upp)), loose: upp > 1 ? String(l.quantity_available % upp) : "", serverError: "" }
          : x
      )
    );
  };
  const removeLine = (batchId) => setLines((ls) => ls.filter((l) => l.batch_id !== batchId));

  const totalUnits = lines.reduce((s, l) => s + (qtyProblem(l) ? 0 : tabletsOf(l)), 0);
  const problems = lines.filter((l) => qtyProblem(l) || l.serverError).length;
  const ready = !!from && !!to && lines.length > 0 && problems === 0;
  const dirty = lines.length > 0 || remarks.trim() !== "";

  /* ---------- admin: changing "from" clears the lines ---------- */
  const [pendingFrom, setPendingFrom] = useState(null);
  const changeFrom = (b) => {
    if (same(b, from)) return;
    if (lines.length) setPendingFrom(b);
    else {
      setFrom(b);
      setSearch("");
    }
  };

  /* ---------- leave / send ---------- */
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const back = () => (dirty ? setConfirmLeave(true) : onBack());

  const trySend = () => {
    setTouched(true);
    setSendError("");
    if (!ready) {
      if (phone && lines.length) setMobileTab("cart");
      const bad = lines.findIndex((l) => qtyProblem(l) || l.serverError);
      if (bad >= 0) setCartPage(pageOfLine(bad));
      return;
    }
    setConfirmSend(true);
  };

  const send = async () => {
    setSending(true);
    setSendError("");
    try {
      const r = await api.send({
        from_branch: isAdmin ? from : undefined,
        to_branch: to,
        remarks: remarks.trim() || undefined,
        items: lines.map((l) => ({ batch_id: l.batch_id, strips: Number(l.strips) || 0, tablets: Number(l.loose) || 0 })),
      });
      setConfirmSend(false);
      onSent(r.data, r.message);
    } catch (e) {
      const errs = e?.response?.data?.errors;
      setConfirmSend(false);
      if (Array.isArray(errs) && errs.length) {
        // put each message on its line, and refresh what is available
        setLines((ls) =>
          ls.map((l) => {
            const hit = errs.find((x) => Number(x.batch_id) === l.batch_id);
            if (!hit) return l;
            return { ...l, serverError: hit.message, quantity_available: hit.available ?? l.quantity_available };
          })
        );
        setStockKey((k) => k + 1);
        if (phone) setMobileTab("cart");
        const bad = lines.findIndex((l) => errs.some((x) => Number(x.batch_id) === l.batch_id));
        if (bad >= 0) setCartPage(pageOfLine(bad));
      }
      setSendError(apiMessage(e, "Could not send. Please try again."));
    } finally {
      setSending(false);
    }
  };

  /* ================= pieces ================= */
  const header = (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0, px: { xs: 1, md: 2 }, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <IconButton aria-label="Back to transfers" onClick={back}>
        <ArrowBackIcon />
      </IconButton>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 16.5, md: 18 } }} noWrap>
          New transfer
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", sm: "block" } }} noWrap>
          Stock leaves {from || "the branch"} now and reaches {to || "the other branch"} when they accept it
        </Typography>
      </Box>
    </Stack>
  );

  const routeBar = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={{ xs: 1, md: 1.5 }}
      sx={{ flexShrink: 0, px: { xs: 1.5, md: 2.5 }, py: 1.25, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}
    >
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: 300 }}>
        {isAdmin ? (
          <TextField
            select
            fullWidth
            size="small"
            label="From"
            value={from}
            onChange={(e) => changeFrom(e.target.value)}
            error={touched && !from}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          >
            {(info?.source_branches || []).map((b) => (
              <MenuItem key={b} value={b}>
                {b}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Box>
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary" }}>From (your branch)</Typography>
            <BranchTag strong>{from}</BranchTag>
          </Box>
        )}
      </Box>
      <ArrowForwardIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: 300 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="To"
          value={toOptions.some((b) => same(b, to)) ? to : ""}
          onChange={(e) => setTo(e.target.value)}
          disabled={!from || !toOptions.length}
          error={touched && !to}
          helperText={from && !toOptions.length ? "No other branch" : undefined}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        >
          {toOptions.map((b) => (
            <MenuItem key={b} value={b}>
              {b}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Stack>
  );

  /* ----- left: stock to pick from ----- */
  const stockRow = (r) => {
    const added = inCart.has(r.batch_id);
    return (
      <Stack
        key={r.batch_id}
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          px: { xs: 1.5, md: 2 },
          py: 1.1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: added ? fade(cssVar("primary"), 0.05) : undefined,
          "&:hover": { bgcolor: added ? fade(cssVar("primary"), 0.07) : fade(cssVar("textSecondary"), 0.04) },
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap title={r.name}>
            {r.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
            Batch {r.batch_number} · Exp{" "}
            <Box component="span" sx={{ color: expiresSoon(r.expiry_date) ? cssVar("warning") : undefined, fontWeight: expiresSoon(r.expiry_date) ? 600 : 400 }}>
              {fmtExpiry(r.expiry_date)}
            </Box>
            {packOf(r).upp > 1 ? ` · ${packOf(r).upp} per ${packOf(r).word}` : ""}
            {r.storage_location ? ` · ${r.storage_location}` : ""}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0, maxWidth: { xs: 110, sm: 170 } }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>{r.stock_text || qtyWords(r.quantity_available, r)}</Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>available</Typography>
        </Box>
        {added ? (
          <Tooltip title="Already added — change the quantity on the right">
            <Button size="small" variant="text" startIcon={<CheckIcon />} onClick={() => addLine(r)} sx={{ ...buttonSx, minWidth: 84 }}>
              Added
            </Button>
          </Tooltip>
        ) : (
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addLine(r)} sx={{ ...buttonSx, minWidth: 84 }}>
            Add
          </Button>
        )}
      </Stack>
    );
  };

  let stockBody;
  if (!from) {
    stockBody = <EmptyState icon={<Inventory2OutlinedIcon />} title="Choose the branch to send from">Its stock shows here.</EmptyState>;
  } else if (stockError) {
    stockBody = (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }} action={<Button color="inherit" size="small" onClick={() => setStockKey((k) => k + 1)}>Retry</Button>}>
          {stockError}
        </Alert>
      </Box>
    );
  } else if (stockLoading && !stock.length) {
    stockBody = (
      <Stack spacing={1} sx={{ p: 2 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={46} />
        ))}
      </Stack>
    );
  } else if (!stock.length) {
    stockBody = q ? (
      <EmptyState icon={<SearchIcon />} title={`Nothing matches "${q}"`}>Only active, unexpired batches with stock in {from} can be sent.</EmptyState>
    ) : (
      <EmptyState icon={<Inventory2OutlinedIcon />} title={`No stock to send in ${from}`}>Only active, unexpired batches with stock can be sent.</EmptyState>
    );
  } else {
    stockBody = (
      <Box sx={{ opacity: stockLoading ? 0.6 : 1, transition: "opacity .15s" }}>
        {pageSlice(stock, clampPage(stockPage, stock.length, stockSize), stockSize).map(stockRow)}
        {stock.length >= STOCK_LIMIT && (
          <Typography sx={{ p: 1.5, fontSize: 12.5, color: "text.secondary", textAlign: "center" }}>
            Showing the first {STOCK_LIMIT}. Search to find others.
          </Typography>
        )}
      </Box>
    );
  }

  const stockPanel = (
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", bgcolor: "background.paper" }}>
      <Box sx={{ flexShrink: 0, p: { xs: 1.5, md: 2 }, pb: 1 }}>
        {!phone && <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Stock in {from || "…"}</Typography>}
        <TextField
          fullWidth
          size="small"
          placeholder="Search medicine, code or batch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={!from}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
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
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", borderTop: 1, borderColor: "divider", ...thinScroll }}>{stockBody}</Box>
      {from && !stockError && stock.length > PAGE_SIZES[0] && (
        <AppPager
          page={clampPage(stockPage, stock.length, stockSize)}
          pageSize={stockSize}
          total={stock.length}
          onPageChange={setStockPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={(n) => {
            setStockSize(n);
            setStockPage(1);
          }}
          disabled={stockLoading}
          sx={{ flexShrink: 0, px: { xs: 1.5, md: 2 } }}
        />
      )}
    </Box>
  );

  /* ----- right: what will be sent ----- */
  const qtyBox = (l, field, label, ref) => (
    <TextField
      size="small"
      value={l[field]}
      onChange={(e) => setQty(l.batch_id, field, e.target.value)}
      inputRef={ref}
      error={touched && !!qtyProblem(l)}
      placeholder="0"
      label={label}
      InputLabelProps={{ shrink: true }}
      inputProps={{ inputMode: "numeric", "aria-label": `${label} of ${l.name}`, style: { textAlign: "right", fontVariantNumeric: "tabular-nums" } }}
      sx={{ width: { xs: 84, sm: 92 }, flexShrink: 0, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
    />
  );

  const cartLine = (l) => {
    const { upp, word } = packOf(l);
    const problem = l.serverError || (touched || l.strips !== "" || l.loose !== "" ? qtyProblem(l) : "");
    const sending = tabletsOf(l);
    const focusRef = (el) => {
      if (el) qtyRefs.current[l.batch_id] = el;
      else delete qtyRefs.current[l.batch_id];
    };
    return (
      <Box key={l.batch_id} sx={{ px: { xs: 1.5, md: 2 }, py: 1.25, borderBottom: 1, borderColor: "divider", bgcolor: l.serverError ? fade(cssVar("error"), 0.04) : undefined }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap title={l.name}>
              {l.name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
              Batch {l.batch_number} · Exp {fmtExpiry(l.expiry_date)}
              {upp > 1 ? ` · ${upp} per ${word}` : ""}
            </Typography>
          </Box>
          <IconButton aria-label={`Remove ${l.name}`} size="small" onClick={() => removeLine(l.batch_id)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }}>
          {qtyBox(l, "strips", `${word[0].toUpperCase()}${plural(word, 2).slice(1)}`, focusRef)}
          {upp > 1 && qtyBox(l, "loose", "Tablets")}
          <Button size="small" onClick={() => sendAll(l)} sx={{ ...buttonSx, minWidth: 0, px: 1, fontSize: 12.5 }}>
            All
          </Button>
          <Box sx={{ flex: 1 }} />
          {!problem && sending > 0 && upp > 1 && (
            <Typography sx={{ fontSize: 12, color: "text.secondary", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>= {num(sending)} tablets</Typography>
          )}
        </Stack>
        <Typography sx={{ mt: 0.75, fontSize: 12, color: problem ? cssVar("error") : "text.secondary", fontWeight: problem ? 600 : 400 }}>
          {problem || `of ${l.stock_text || qtyWords(l.quantity_available, l)} in this batch`}
        </Typography>
      </Box>
    );
  };

  const cartPanel = (
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", bgcolor: "background.paper" }}>
      {!phone && (
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ flexShrink: 0, px: 2, pt: 2, pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>To send</Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>In strips + loose tablets</Typography>
        </Stack>
      )}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", borderTop: 1, borderColor: "divider", ...thinScroll }}>
        {lines.length ? (
          pageSlice(lines, clampPage(cartPage, lines.length, cartSize), cartSize).map(cartLine)
        ) : (
          <EmptyState icon={<SendOutlinedIcon />} title="Nothing added yet">
            {phone ? "Add batches from Pick stock." : "Add batches from the stock list."}
          </EmptyState>
        )}
      </Box>
      {lines.length > PAGE_SIZES[0] && (
        <AppPager
          page={clampPage(cartPage, lines.length, cartSize)}
          pageSize={cartSize}
          total={lines.length}
          onPageChange={setCartPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={(n) => {
            setCartSize(n);
            setCartPage(1);
          }}
          sx={{ flexShrink: 0, px: { xs: 1.5, md: 2 } }}
        />
      )}
      <Box sx={{ flexShrink: 0, p: { xs: 1.5, md: 2 }, borderTop: 1, borderColor: "divider" }}>
        <TextField
          fullWidth
          size="small"
          label="Note for the receiving branch (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </Box>
    </Box>
  );

  const missing = !from ? "Choose the branch to send from" : !to ? "Choose the branch to send to" : !lines.length ? "Add at least one batch" : problems ? `Fix ${problems} ${problems === 1 ? "line" : "lines"}` : "";

  const footer = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ flexShrink: 0, px: { xs: 1.5, md: 2.5 }, py: 1.25, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14.5, fontVariantNumeric: "tabular-nums" }} noWrap>
          {lines.length} {lines.length === 1 ? "batch" : "batches"} · {num(totalUnits)} tablets
        </Typography>
        <Typography sx={{ fontSize: 12, color: touched && missing ? cssVar("error") : "text.secondary", fontWeight: touched && missing ? 600 : 400 }} noWrap>
          {missing || (to ? `Ready to send to ${to}` : "")}
        </Typography>
      </Box>
      <Button variant="contained" disableElevation startIcon={<SendOutlinedIcon />} onClick={trySend} disabled={sending} sx={{ ...buttonSx, flexShrink: 0, px: 2.5 }}>
        Send
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {header}
      {routeBar}

      {sendError && (
        <Alert severity="error" onClose={() => setSendError("")} sx={{ flexShrink: 0, borderRadius: 0 }}>
          {sendError}
        </Alert>
      )}

      {phone ? (
        <>
          <Tabs
            value={mobileTab}
            onChange={(_, v) => setMobileTab(v)}
            variant="fullWidth"
            sx={{ flexShrink: 0, minHeight: 42, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", "& .MuiTab-root": { minHeight: 42, textTransform: "none", fontWeight: 600 } }}
          >
            <Tab value="pick" label="Pick stock" />
            <Tab
              value="cart"
              label={
                <Badge color={problems ? "error" : "primary"} badgeContent={lines.length} invisible={!lines.length} sx={{ "& .MuiBadge-badge": { right: -14 } }}>
                  To send
                </Badge>
              }
            />
          </Tabs>
          <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>{mobileTab === "pick" ? stockPanel : cartPanel}</Box>
        </>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: "1px", bgcolor: "divider" }}>
          <Box sx={{ flex: 1.15, minWidth: 0, display: "flex" }}>{stockPanel}</Box>
          <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>{cartPanel}</Box>
        </Box>
      )}

      {footer}

      <ConfirmDialog
        open={confirmSend}
        title={`Send to ${to}?`}
        confirmLabel="Send"
        busy={sending}
        onConfirm={send}
        onClose={() => setConfirmSend(false)}
      >
        <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 2, bgcolor: fade(cssVar("primary"), 0.06), color: toneInk("primary") }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
            {lines.length} {lines.length === 1 ? "batch" : "batches"} · {num(totalUnits)} tablets
          </Typography>
          <Typography sx={{ fontSize: 13 }}>
            {from} → {to}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 14 }}>
          The stock leaves <b>{from}</b> now and shows as in transit. <b>{to}</b> adds it to their stock when they accept. Until then, {from} can cancel it.
        </Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmLeave}
        title="Discard this transfer?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        color="error"
        onConfirm={onBack}
        onClose={() => setConfirmLeave(false)}
      >
        <Typography sx={{ fontSize: 14 }}>The {lines.length ? `${lines.length} ${lines.length === 1 ? "batch" : "batches"} you added` : "note you wrote"} will be lost. Nothing has been sent.</Typography>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!pendingFrom}
        title={`Send from ${pendingFrom || ""} instead?`}
        confirmLabel="Change branch"
        cancelLabel="Keep"
        onConfirm={() => {
          setFrom(pendingFrom);
          setLines([]);
          setSearch("");
          setPendingFrom(null);
        }}
        onClose={() => setPendingFrom(null)}
      >
        <Typography sx={{ fontSize: 14 }}>The batches you added are from {from}, so they’ll be removed.</Typography>
      </ConfirmDialog>
    </Box>
  );
}