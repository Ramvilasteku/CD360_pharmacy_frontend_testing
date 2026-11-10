// src/pharmacy/shared/BranchPicker.js
//
// Which branch a pharmacy screen works in.
//
//   One branch (or none)   nothing to choose — the picker renders nothing, `branch` is null and
//                          the server uses the only branch.
//   Several branches
//     staff                always their own branch — shown as a chip, not changeable
//     admin                a "Branch" select. Screens that CHANGE stock (POS, Receive, B2B, stock
//                          adjustments) need one picked; screens that only SHOW stock offer
//                          "All branches". The admin's last choice is remembered on this device.
//
// Usage
//   const br = usePharmacyBranch({ allowAll: false });
//   <BranchPicker state={br} />
//   api call: { params: { branch: br.branch || undefined } }  — send it for the admin; the server
//   ignores it for staff.
//   if (br.needsChoice) → ask the admin to pick before letting them sell / receive.

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import axios from "axios";
import { Box, MenuItem, TextField, Tooltip } from "@mui/material";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import { cssVar, fade, toneInk } from "../../theme/appColors";

const API_BASE = process.env.REACT_APP_SITE_URL || process.env.REACT_APP_URL || "";
const http = axios.create({ withCredentials: true });
const KEY = "cd.pharmacy.workingBranch";

// ---- the admin's WORKING branch: one value shared by every screen and every hook call ----
const remember = {
  get: () => {
    try {
      return window.localStorage.getItem(KEY) || "";
    } catch {
      return "";
    }
  },
  set: (v) => {
    try {
      if (v) window.localStorage.setItem(KEY, v);
      else window.localStorage.removeItem(KEY);
    } catch {
      /* private mode: just don't remember */
    }
  },
};

let working = remember.get();
const listeners = new Set();
const workingStore = {
  get: () => working,
  set: (v) => {
    const next = v || "";
    if (next === working) return;
    working = next;
    remember.set(next);
    listeners.forEach((fn) => fn());
  },
  subscribe: (fn) => {
    listeners.add(fn);
    // another browser tab changed it
    const onStorage = (e) => {
      if (e.key === KEY) {
        working = e.newValue || "";
        fn();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(fn);
      window.removeEventListener("storage", onStorage);
    };
  },
};

let cache = null; // one request per page load
let pending = null;
function loadBranches() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = http
      .get(`${API_BASE}/api/pharmacy/branches/get/branches`)
      .then((r) => (cache = r.data.data))
      .finally(() => (pending = null));
  }
  return pending;
}

/**
 * The branch this screen works in.
 *   Screens that CHANGE stock (allowAll false) always use the admin's working branch — picked once,
 *   shared by POS, Receive, B2B…, remembered on this device.
 *   Screens that only SHOW stock (allowAll true) start on the working branch too; choosing
 *   "All branches" there is local to that screen and does NOT forget the working branch.
 *
 *   defaultAll (26 Oct 2026, read screens only) — open on "All branches" EVERY time, instead
 *   of on the working branch. A branch picked here is local to this screen (and this mount)
 *   and is never written to the working branch, so it can't change what POS bills from.
 *   Used by Sales (All sales / Payments / Returns), the Reports screens and both Medicines
 *   screens — what the admin asked for: "default all branch" on everything that only
 *   reads. Off by default, so Inventory and the Procurement lists behave exactly as before.
 *
 *   One hook can serve both kinds of tab (Sales flips allowAll as you change tab): the
 *   working branch and the read-screen pick are separate values, so picking on New sale
 *   never changes the list tabs, and filtering a list never changes what New sale sells from.
 */
export function usePharmacyBranch({ allowAll = false, defaultAll = false } = {}) {
  const [info, setInfo] = useState(cache);
  const [error, setError] = useState("");
  const picked = useSyncExternalStore(workingStore.subscribe, workingStore.get, workingStore.get);
  const [showAll, setShowAll] = useState(false); // read screens only
  const [readPick, setReadPick] = useState(""); // defaultAll read screens: "" = All branches

  useEffect(() => {
    let alive = true;
    loadBranches()
      .then((d) => alive && setInfo(d))
      .catch((e) => {
        if (!alive) return;
        // 6 Nov 2026: keep the server's reason (and status) — the picker now shows it instead of
        // silently disappearing, which looked exactly like "this pharmacy has one branch".
        const status = e?.response?.status;
        const why = e?.response?.data?.message || e?.message || "no response from the server";
        setError(`Could not load branches${status ? ` (${status})` : ""}: ${why}`);
      });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const multi = !!info?.multi;
    const isAdmin = !!info?.is_admin;
    const branches = info?.branches || [];
    const valid = branches.find((b) => b.toLowerCase() === String(picked).toLowerCase()) || "";
    const localAll = allowAll && defaultAll; // this screen keeps its own pick, starting at All
    const validRead = branches.find((b) => b.toLowerCase() === String(readPick).toLowerCase()) || "";
    let branch = null;
    if (multi && isAdmin) {
      if (localAll) branch = validRead || null;
      else branch = allowAll && showAll ? null : valid || null;
    } else if (multi) branch = info?.my_branch || null;
    return {
      loading: !info && !error,
      error,
      multi,
      isAdmin,
      myBranch: info?.my_branch || null,
      branches,
      unassigned: info?.unassigned_batches || 0,
      allowAll,
      branch, // null = all branches (admin, read screens) or single-branch pharmacy
      needsChoice: multi && isAdmin && !branch && !allowAll,
      /** a branch name → becomes the working branch everywhere; "" → "All branches" on a read
       *  screen, or clears the working branch on a screen that changes stock */
      setBranch: (b) => {
        // A defaultAll read screen filters itself only — never the shared working branch.
        if (localAll) {
          setReadPick(b || "");
          return;
        }
        if (b) {
          workingStore.set(b);
          setShowAll(false);
        } else if (allowAll) {
          setShowAll(true);
        } else {
          workingStore.set("");
        }
      },
      /** add to request params */
      params: multi && isAdmin && branch ? { branch } : {},
    };
  }, [info, error, picked, allowAll, showAll, defaultAll, readPick]);
}

export default function BranchPicker({ state, size = "small", sx, label = "Branch" }) {
  if (!state || state.loading) return null;

  // The branch list could not be loaded: say so, instead of hiding the picker as if the
  // pharmacy had only one branch. Hover shows the full reason from the server.
  if (state.error) {
    return (
      <Tooltip title={state.error}>
        <Box
          role="alert"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.25,
            py: 0.6,
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            color: toneInk("warning"),
            bgcolor: fade(cssVar("warning"), 0.12),
            maxWidth: 360,
            whiteSpace: "nowrap",
            ...sx,
          }}
        >
          <StoreOutlinedIcon sx={{ fontSize: 17 }} />
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {state.error}
          </Box>
        </Box>
      </Tooltip>
    );
  }

  if (!state.multi) return null;

  if (!state.isAdmin) {
    return (
      <Tooltip title="You work in this branch">
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.25,
            py: 0.6,
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            color: toneInk("primary"),
            bgcolor: fade(cssVar("primary"), 0.08),
            maxWidth: 220,
            whiteSpace: "nowrap",
            ...sx,
          }}
        >
          <StoreOutlinedIcon sx={{ fontSize: 17 }} />
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {state.myBranch}
          </Box>
        </Box>
      </Tooltip>
    );
  }

  return (
    <TextField
      select
      size={size}
      label={label}
      value={state.branch || (state.allowAll ? "__all" : "")}
      onChange={(e) => state.setBranch(e.target.value === "__all" ? "" : e.target.value)}
      error={state.needsChoice}
      sx={{ minWidth: 170, "& .MuiOutlinedInput-root": { borderRadius: 2 }, ...sx }}
      SelectProps={{ displayEmpty: true }}
      InputLabelProps={{ shrink: true }}
    >
      {state.allowAll ? (
        <MenuItem value="__all">All branches</MenuItem>
      ) : (
        <MenuItem value="" disabled>
          Choose a branch
        </MenuItem>
      )}
      {state.branches.map((b) => (
        <MenuItem key={b} value={b}>
          {b}
        </MenuItem>
      ))}
    </TextField>
  );
}