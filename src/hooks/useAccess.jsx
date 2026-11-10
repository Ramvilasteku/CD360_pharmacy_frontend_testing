// src/hooks/useAccess.js
//
// One place the whole frontend asks "is this user allowed to do X?".
//
// WHAT THIS IS FOR
//   Drawing decisions only. The server is still the authority: every route keeps its
//   allowPermissions("pharmacy.suppliers.create") guard, and a 403 is still handled by
//   the page. This file only stops us from showing a button that is guaranteed to fail.
//
// HOW IT GETS THE PERMISSIONS
//   GET /api/getMyAccess  (server.js line 121) is fetched ONCE per page load and cached
//   at module level, so ten components asking ten questions make one request.
//
// USAGE
//   const { loading, can } = useAccess();
//   if (loading) return <Skeleton />;
//   {can("pharmacy.suppliers.create") && <Button>Add supplier</Button>}
//
//   // whole-page guard
//   if (!loading && !can("pharmacy.suppliers.view")) return <AccessDenied what="Suppliers" />;
//
//   // conditional render without the && noise
//   <Gate perm="pharmacy.suppliers.delete"><IconButton …/></Gate>
//
// SUPPORTED KEY FORMS
//   exact        pharmacy.suppliers.create
//   wildcards    pharmacy.suppliers.*   pharmacy.*   *
//
// IF NOTHING IS GATED AND THE CONSOLE SAYS "shape not recognised"
//   The payload from /api/getMyAccess doesn't carry its permission keys under any of the
//   field names below. Open devtools and run  window.__access  — it holds the raw payload
//   and the keys that were understood. Add the field name to CONTAINER_FIELDS and it works.

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Box, Button, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const API_BASE = process.env.REACT_APP_SITE_URL || "";
const ACCESS_URL = `${API_BASE}/api/getMyAccess`;

// Fields that genuinely hold permission keys. Finding one of these is how we know the
// payload really does describe permissions — so an empty list means "this user has none"
// rather than "we failed to read it". Getting this wrong in either direction is the only
// way this file can misbehave, so the two sets are kept separate on purpose.
const PERM_FIELDS = new Set([
  "permissions", "permission", "permission_keys", "permissionkeys",
  "role_permissions", "rolepermissions", "allowed", "allowed_permissions",
]);

// Fields worth walking into, but whose presence proves nothing on its own.
const WALK_FIELDS = new Set([
  "modules", "module", "features", "feature", "access", "my_access", "data",
]);

// Field names that hold one key as a plain string.
const KEY_FIELDS = new Set(["permission_key", "permissionkey", "key", "name", "slug"]);

// "everything" markers some backends send instead of listing every key.
const WILDCARD_WORDS = new Set(["*", "all", "any", "superadmin", "super_admin"]);

// A real key is module.feature.action — three snake_case segments. Requiring two dots keeps
// out things that merely look dotted (domains, versions, file names).
const KEY_SHAPE = /^[a-z0-9_-]+\.[a-z0-9_*-]+\.[a-z0-9_*-]+$/; // hyphens allowed: pharmacy.sales-returns.create
const PREFIX_SHAPE = /^[a-z0-9_-]+\.\*$/; // pharmacy.*

const isKey = (s) => KEY_SHAPE.test(s) || PREFIX_SHAPE.test(s) || WILDCARD_WORDS.has(s);

/* ------------------------------------------------------------------ harvesting */

function harvest(node, found, state, depth = 0) {
  if (node == null || depth > 10) return;

  if (typeof node === "string") {
    const s = node.trim().toLowerCase();
    if (WILDCARD_WORDS.has(s)) state.wildcard = true;
    else if (isKey(s)) found.add(s);
    return;
  }

  if (typeof node === "boolean" || typeof node === "number") return;

  if (Array.isArray(node)) {
    node.forEach((n) => harvest(n, found, state, depth + 1));
    return;
  }

  if (typeof node !== "object") return;

  for (const [rawKey, value] of Object.entries(node)) {
    const key = rawKey.toLowerCase();

    // a tenant owner / super admin flag, however it is spelled
    if (value === true && /^(is_)?(super_?)?admin$/.test(key)) state.wildcard = true;
    if (key === "role_key" && typeof value === "string" && /^(super_?)?admin$/.test(value.toLowerCase())) {
      state.wildcard = true;
    }

    if (KEY_FIELDS.has(key) && typeof value === "string") {
      const s = value.trim().toLowerCase();
      if (WILDCARD_WORDS.has(s)) state.wildcard = true;
      else if (isKey(s)) found.add(s);
      continue;
    }

    if (PERM_FIELDS.has(key)) {
      state.recognised = true;
      harvest(value, found, state, depth + 1);
      continue;
    }

    if (WALK_FIELDS.has(key)) {
      harvest(value, found, state, depth + 1);
      continue;
    }

    // keep walking plain objects/arrays — a container may sit a level down
    if (value && typeof value === "object") harvest(value, found, state, depth + 1);
  }
}

function normalise(payload) {
  const found = new Set();
  const state = { wildcard: false, recognised: false };
  harvest(payload, found, state);

  // Some backends send { "pharmacy.suppliers.create": true } as an object map.
  const flat = payload && (payload.permissions || (payload.data && payload.data.permissions));
  if (flat && !Array.isArray(flat) && typeof flat === "object") {
    for (const [k, v] of Object.entries(flat)) {
      const s = String(k).trim().toLowerCase();
      if (v && isKey(s)) found.add(s);
    }
  }

  return {
    keys: found,
    wildcard: state.wildcard,
    // true => the payload really does describe permissions, so an empty list means
    // "this user has none". false => we did not understand it; see `can()` below.
    recognised: state.recognised || found.size > 0 || state.wildcard,
    raw: payload,
  };
}

/* ------------------------------------------------------------------ cache */

let cache = null;      // normalised result
let inflight = null;   // de-dupes concurrent first loads
const listeners = new Set();

function publish() {
  listeners.forEach((fn) => {
    try { fn(); } catch (_) { /* a dead component must not break the rest */ }
  });
}

async function load(force = false) {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;

  inflight = (async () => {
    try {
      const r = await axios.get(ACCESS_URL, { withCredentials: true });
      const body = r && r.data ? r.data : null;
      cache = normalise(body && body.data !== undefined ? body : { data: body });
      if (!cache.recognised && typeof console !== "undefined") {
        console.warn(
          "[useAccess] /api/getMyAccess returned a shape with no recognisable permission " +
          "keys — nothing will be hidden. Inspect window.__access and add the field name " +
          "to PERM_FIELDS in src/hooks/useAccess.js."
        );
      }
    } catch (e) {
      // Network/401 — do not silently lock the UI; the server still guards every route.
      cache = { keys: new Set(), wildcard: false, recognised: false, raw: null, error: e };
    }
    if (typeof window !== "undefined") {
      window.__access = { keys: [...cache.keys].sort(), wildcard: cache.wildcard, recognised: cache.recognised, raw: cache.raw };
    }
    inflight = null;
    publish();
    return cache;
  })();

  return inflight;
}

/** Throw away what we know and ask the server again. */
export function refreshAccess() {
  cache = null;
  inflight = null;
  return load(true);
}

/* ------------------------------------------------------------------ role switch */

const SWITCH_SIGNAL = "caredesk:role-switched";

/**
 * Switch the signed-in user to another of their roles, then re-ask the server
 * what they may now do.
 *
 *   await switchRole({ role_id: 4 });
 *
 * `payload` is passed to POST /api/pharmacy/account/switch-role untouched, so whatever your
 * endpoint expects (role_id, role_key, …) is what you send.
 *
 * WHY IT RELOADS BY DEFAULT
 *   Switching role mints a new JWT. That changes the permission list, the
 *   module/feature registry the sidebar is built from, and the scoping of every
 *   list already sitting on screen. Re-fetching only the permissions re-gates the
 *   buttons while leaving the OLD role's data on display — which looks correct and
 *   isn't. A reload is the only way to be sure nothing stale survives.
 *
 *   Pass { reload: false } if you have a screen that truly can re-fetch itself;
 *   the permission cache is still refreshed and every useAccess() re-renders.
 *
 * UNSAVED WORK
 *   A reload discards it. Ask first if a form is open:
 *     if (dirty && !window.confirm("Switch role? Unsaved changes will be lost.")) return;
 */
export async function switchRole(payload, { reload = true } = {}) {
  // L8: /api/switch-role never existed; the live role switcher (RoleSwitcher.jsx) uses this route.
  const r = await axios.post(`${API_BASE}/api/pharmacy/account/switch-role`, payload, { withCredentials: true });

  cache = null;
  inflight = null;

  // Tell this browser's other tabs, so a second tab doesn't keep showing the old
  // role's menus. Wrapped because storage throws in a few privacy contexts.
  try {
    window.localStorage.setItem(SWITCH_SIGNAL, String(Date.now()));
  } catch (_) { /* no cross-tab signal available — this tab still updates */ }

  if (reload) {
    window.location.reload();
    return r.data; // not reached, but keeps the signature honest
  }

  await load(true);
  return r.data;
}

// Another tab switched role. Whatever is on screen here belongs to the old one.
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("storage", (e) => {
    if (e.key === SWITCH_SIGNAL && e.newValue) window.location.reload();
  });
}

/** Non-hook check, for route guards and sidebar registries built outside React. */
export function canStatic(perm) {
  if (!cache) return true;              // not loaded yet — let the server decide
  return check(cache, perm);
}

function check(state, perm) {
  if (!perm) return true;
  if (!state) return true;
  if (state.wildcard) return true;
  // Shape not understood (or the call failed): show everything and let the route answer.
  // Hiding the whole app because a /me endpoint changed shape is the worse failure.
  if (!state.recognised) return true;

  const want = String(perm).trim().toLowerCase();
  if (state.keys.has(want)) return true;

  const parts = want.split(".");
  // pharmacy.suppliers.create  matches  pharmacy.suppliers.*  and  pharmacy.*
  for (let i = parts.length - 1; i > 0; i -= 1) {
    if (state.keys.has(`${parts.slice(0, i).join(".")}.*`)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ hook */

export function useAccess() {
  const [state, setState] = useState(cache);

  useEffect(() => {
    let alive = true;
    const onChange = () => { if (alive) setState(cache); };
    listeners.add(onChange);
    if (!cache) load().then(onChange); else onChange();
    return () => { alive = false; listeners.delete(onChange); };
  }, []);

  const can = useCallback((perm) => check(state, perm), [state]);
  const canAny = useCallback((...perms) => perms.flat().some((p) => check(state, p)), [state]);
  const canAll = useCallback((...perms) => perms.flat().every((p) => check(state, p)), [state]);

  return {
    loading: !state,
    can,
    canAny,
    canAll,
    isAdmin: !!(state && state.wildcard),
    permissions: state ? [...state.keys] : [],
    error: state ? state.error || null : null,
    reload: refreshAccess,
  };
}

/** Convenience: <Gate perm="pharmacy.suppliers.create">…</Gate> */
export function Gate({ perm, any, fallback = null, children }) {
  const { loading, can, canAny } = useAccess();
  if (loading) return null;                       // never flash a button we may remove
  const allowed = any ? canAny(any) : can(perm);
  return allowed ? children : fallback;
}

/**
 * The panel a user sees instead of a screen they have no view permission for.
 * Says which screen and who to ask — so a missing permission never looks like a bug.
 *
 *   <AccessDenied what="Suppliers" />
 */
export function AccessDenied({ what = "this screen", onBack }) {
  return (
    <Box
      sx={{
        flex: 1, width: "100%", height: "60%", minHeight: 0, overflow: "hidden",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 1.25, px: 3, textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center",
          bgcolor: "action.hover", color: "text.disabled", mb: 0.5,
        }}
      >
        <LockOutlinedIcon />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
        You don’t have access to {what}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>
        Your role doesn’t include permission to view this. Ask your administrator to add it
        under Roles &amp; Permissions.
      </Typography>
      {onBack && (
        <Button onClick={onBack} sx={{ textTransform: "none", mt: 0.5 }}>
          Go back
        </Button>
      )}
    </Box>
  );
}

export default useAccess;