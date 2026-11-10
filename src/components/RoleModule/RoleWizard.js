import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Switch,
  FormControlLabel,
  Checkbox,
  Chip,
  Skeleton,
  LinearProgress,
  Tooltip,
  Fade,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { toast } from "react-toastify";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ExtensionIcon from "@mui/icons-material/Extension";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ShieldIcon from "@mui/icons-material/Shield";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import LockIcon from "@mui/icons-material/Lock";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CircleIcon from "@mui/icons-material/Circle";

const TEAL = "#3f6f7a";
const TEAL_DARK = "#2d5761";
const TEAL_LIGHT = "#eaf3f5";
const AMBER = "#f5b400";
const RED = "#d32f2f";
const GREEN = "#4caf50";

// ─── Fixed dimensions ───
const MODULE_CARD_HEIGHT = 64;
const FEATURE_CARD_HEIGHT = 76;
const MODULE_GRID_COLS = "repeat(3, 1fr)";
const FEATURE_GRID_COLS = "repeat(2, 1fr)";

const notify = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  warning: (msg) => toast.warn(msg),
  info: (msg) => toast.info(msg),
};

const STEPS = [
  { label: "Basic Info", icon: <ShieldIcon /> },
  { label: "Modules", icon: <ViewModuleIcon /> },
  { label: "Features", icon: <ExtensionIcon /> },
  { label: "Permissions", icon: <AdminPanelSettingsIcon /> },
];

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "70%",
  height: "90%",
  bgcolor: "background.paper",
  borderRadius: 3,
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  outline: "none",
  display: "flex",
  flexDirection: "column",
};

// ─── Dynamic action metadata ───
// Known actions get curated icon/color. Unknown actions (from backend)
// still render — humanized label + generated color from a small palette.
const KNOWN_ACTIONS = {
  view: {
    label: "View",
    icon: <VisibilityIcon fontSize="small" />,
    color: "#2196f3",
  },
  create: {
    label: "Create",
    icon: <AddCircleOutlineIcon fontSize="small" />,
    color: "#00acc1",
  },
  edit: {
    label: "Edit",
    icon: <EditNoteIcon fontSize="small" />,
    color: AMBER,
  },
  delete: {
    label: "Delete",
    icon: <DeleteOutlineIcon fontSize="small" />,
    color: RED,
  },
};

const FALLBACK_PALETTE = [
  "#7c5cff",
  "#009688",
  "#e91e63",
  "#3f51b5",
  "#ff6f00",
  "#5d4037",
];

const humanize = (str) =>
  String(str || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const hashCode = (str) =>
  [...String(str)].reduce((h, c) => h + c.charCodeAt(0), 0);

const getActionMeta = (action) => {
  if (KNOWN_ACTIONS[action]) return { key: action, ...KNOWN_ACTIONS[action] };
  const color = FALLBACK_PALETTE[hashCode(action) % FALLBACK_PALETTE.length];
  return {
    key: action,
    label: humanize(action),
    icon: <CircleIcon sx={{ fontSize: 10 }} />,
    color,
  };
};

const ACTION_SORT_ORDER = { view: 0, create: 1, edit: 2, delete: 3 };
const sortActions = (actions) =>
  [...actions].sort((a, b) => {
    const ao = ACTION_SORT_ORDER[a] ?? 100;
    const bo = ACTION_SORT_ORDER[b] ?? 100;
    if (ao !== bo) return ao - bo;
    return a.localeCompare(b);
  });

const getLevelInfo = (grantedActions = [], availableActions = []) => {
  const granted = new Set(grantedActions);
  if (granted.size === 0) return { label: "No Access", color: "#999" };
  if (
    availableActions.length > 0 &&
    availableActions.every((a) => granted.has(a))
  ) {
    return { label: "Full Access", color: GREEN };
  }
  if (granted.size === 1 && granted.has("view"))
    return { label: "View Only", color: "#2196f3" };
  if (
    availableActions.includes("delete") &&
    !granted.has("delete") &&
    availableActions.filter((a) => a !== "delete").every((a) => granted.has(a))
  ) {
    return { label: "Editor", color: AMBER };
  }
  return { label: "Custom", color: "#7c5cff" };
};

const parseJsonSafe = async (res) => {
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Non-JSON response (${res.status})`);
  }
  if (!res.ok)
    throw new Error(data.message || `Request failed (${res.status})`);
  return data;
};

const generateDescription = (name) => {
  if (!name?.trim()) return "";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const nameLower = lower.replace(/\s+/g, " ");
  if (/manager|head|lead|senior|chief|director/.test(lower)) {
    return `Oversees ${nameLower} responsibilities and manages related operational activities within the organization.`;
  }
  if (/junior|assistant|trainee|intern/.test(lower)) {
    return `Assists with ${nameLower} tasks and supports day-to-day operations under supervision.`;
  }
  return `Responsible for ${nameLower} activities and related operational tasks within the organization.`;
};

export default function RoleWizard({ open, onClose, role, onSaved }) {
  const API = process.env.REACT_APP_URL;
  const isEdit = !!role;
  const isSystemRole = role?.is_system_role === 1;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingStep, setLoadingStep] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const [roleForm, setRoleForm] = useState({ role_name: "", description: "" });
  const [roleId, setRoleId] = useState(null);
  const [roleKey, setRoleKey] = useState(null);

  const [allModules, setAllModules] = useState([]);
  const [adminKeys, setAdminKeys] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);

  const [allFeatures, setAllFeatures] = useState([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);

  const [allPermissions, setAllPermissions] = useState([]);
  const [featureActions, setFeatureActions] = useState({});

  // Track which module keys we've already fetched features/permissions for,
  // so incremental module toggles don't re-fetch the whole set.
  const [loadedFeatureKeys, setLoadedFeatureKeys] = useState(new Set());
  const [loadedPermKeys, setLoadedPermKeys] = useState(new Set());

  // Accordion expansion state
  const [expandedModuleGroup, setExpandedModuleGroup] = useState("available");
  const [expandedFeatureAcc, setExpandedFeatureAcc] = useState(null);
  const [expandedPermAcc, setExpandedPermAcc] = useState(null);
  const [expandedPermFeature, setExpandedPermFeature] = useState(null);

  // ─── Initial load ───
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setExpandedModuleGroup("available");
    setExpandedFeatureAcc(null);
    setExpandedPermAcc(null);
    setExpandedPermFeature(null);
    setLoadedFeatureKeys(new Set());
    setLoadedPermKeys(new Set());

    if (isEdit) {
      setRoleForm({
        role_name: role.role_name,
        description: role.description || "",
      });
      setRoleId(role.id);
      setRoleKey(role.role_key);
      bootstrapEditMode(role);
    } else {
      setRoleForm({ role_name: "", description: "" });
      setRoleId(null);
      setRoleKey(null);
      setSelectedModules([]);
      setSelectedFeatureIds([]);
      setFeatureActions({});
      setAllFeatures([]);
      setAllPermissions([]);
      fetchModuleCatalog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role]);

  const fetchModuleCatalog = async () => {
    try {
      const [allRes, adminRes] = await Promise.all([
        fetch(`${API}/api/all-modules`, { credentials: "include" }),
        fetch(`${API}/api/modules`, { credentials: "include" }),
      ]);
      const allData = await allRes.json();
      const adminData = await adminRes.json();
      setAllModules(allData || []);
      setAdminKeys(Array.isArray(adminData) ? adminData : []);
    } catch (err) {
      notify.error("Failed to load module catalog");
    }
  };

  // In edit mode we preload everything so the user can jump to any step.
  const bootstrapEditMode = async (r) => {
    setInitialLoading(true);
    try {
      // Kick off all catalog + role-state calls in parallel
      const [allModRes, adminModRes, roleModRes, roleFeatRes, rolePermRes] =
        await Promise.all([
          fetch(`${API}/api/all-modules`, { credentials: "include" }),
          fetch(`${API}/api/modules`, { credentials: "include" }),
          fetch(`${API}/api/role-modules/${r.role_key}`, {
            credentials: "include",
          }),
          fetch(`${API}/api/role-features/get/rolefeature/${r.id}`, {
            credentials: "include",
          }),
          fetch(`${API}/api/role-permissions/get/role/${r.id}`, {
            credentials: "include",
          }),
        ]);

      const allModData = await allModRes.json();
      const adminModData = await adminModRes.json();
      const roleModData = await roleModRes.json();
      const roleFeatData = await roleFeatRes.json();
      const rolePermData = await rolePermRes.json();

      setAllModules(allModData || []);
      setAdminKeys(Array.isArray(adminModData) ? adminModData : []);

      const modKeys = roleModData?.modules || [];
      setSelectedModules(modKeys);

      const featureList = roleFeatData?.data?.features || [];
      setSelectedFeatureIds(featureList.map((f) => f.feature_id));

      const grantedPerms =
        rolePermData?.data?.permissions || rolePermData?.data || [];
      const byFeature = {};
      grantedPerms.forEach((p) => {
        if (!byFeature[p.feature_key]) byFeature[p.feature_key] = [];
        byFeature[p.feature_key].push(p.action);
      });
      setFeatureActions(byFeature);

      // Preload features + permissions catalog for every module this role has
      if (modKeys.length > 0) {
        const featResults = await Promise.all(
          modKeys.map((mk) =>
            fetch(
              `${API}/api/features/getall/features/admin?module_key=${mk}`,
              { credentials: "include" },
            ).then((res) => res.json()),
          ),
        );
        setAllFeatures(featResults.flatMap((r) => r?.data || []));

        const permResults = await Promise.all(
          modKeys.map((mk) =>
            fetch(
              `${API}/api/permissions/getall/permissions?module_key=${mk}`,
              {
                credentials: "include",
              },
            ).then((res) => res.json()),
          ),
        );
        setAllPermissions(permResults.flatMap((r) => r?.data || []));

        setLoadedFeatureKeys(new Set(modKeys));
        setLoadedPermKeys(new Set(modKeys));
      }
    } catch (err) {
      notify.error("Failed to load role details");
      console.warn("bootstrapEditMode error:", err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  // Incrementally load features for modules we haven't fetched yet.
  const ensureFeaturesLoaded = useCallback(async () => {
    const missing = selectedModules.filter((mk) => !loadedFeatureKeys.has(mk));
    if (missing.length === 0) return;
    setLoadingStep(true);
    try {
      const results = await Promise.all(
          missing.map((mk) =>
            fetch(`${API}/api/features/getall/features/admin?module_key=${mk}`, {
              credentials: "include",
            }).then((r) => r.json()),
          ),
        );

        console.log("[features] Raw API response:", results);  // ← add this
        console.log("[features] Module keys requested:", missing);

        const newFeatures = results.flatMap((r) => r?.data || []);
        console.log("[features] Parsed features:", newFeatures);
      setAllFeatures((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        return [...prev, ...newFeatures.filter((f) => !existingIds.has(f.id))];
      });
      setLoadedFeatureKeys((prev) => {
        const next = new Set(prev);
        missing.forEach((k) => next.add(k));
        return next;
      });
    } catch (err) {
      notify.error("Failed to load features");
    } finally {
      setLoadingStep(false);
    }
  }, [API, selectedModules, loadedFeatureKeys]);

  const ensurePermissionsLoaded = useCallback(async () => {
    const missing = selectedModules.filter((mk) => !loadedPermKeys.has(mk));
    if (missing.length === 0) return;
    setLoadingStep(true);
    try {
      const results = await Promise.all(
        missing.map((mk) =>
          fetch(`${API}/api/permissions/getall/permissions?module_key=${mk}`, {
            credentials: "include",
          }).then((r) => r.json()),
        ),
      );
      const newPerms = results.flatMap((r) => r?.data || []);
      setAllPermissions((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...newPerms.filter((p) => !existingIds.has(p.id))];
      });
      setLoadedPermKeys((prev) => {
        const next = new Set(prev);
        missing.forEach((k) => next.add(k));
        return next;
      });
    } catch (err) {
      notify.error("Failed to load permissions");
    } finally {
      setLoadingStep(false);
    }
  }, [API, selectedModules, loadedPermKeys]);

  // ─── Derived data ───
  const modulesGrouped = useMemo(() => {
    const groups = { available: [], unavailable: [] };
    allModules.forEach((m) => {
      const isAvail = adminKeys.includes(m.module_key);
      groups[isAvail ? "available" : "unavailable"].push(m);
    });
    return groups;
  }, [allModules, adminKeys]);

  const allSelectedFeatures = useMemo(
    () => allFeatures.filter((f) => selectedFeatureIds.includes(f.id)),
    [allFeatures, selectedFeatureIds],
  );

  const featuresByModule = useMemo(() => {
    const map = {};
    selectedModules.forEach((mk) => {
      map[mk] = [];
    });
    allFeatures.forEach((f) => {
      if (!map[f.module_key]) map[f.module_key] = [];
      map[f.module_key].push(f);
    });
    return map;
  }, [allFeatures, selectedModules]);

  const modulesWithFeatures = useMemo(
    () =>
      Object.entries(featuresByModule).filter(([, feats]) => feats.length > 0),
    [featuresByModule],
  );

  const permissionsByModule = useMemo(() => {
    const map = {};
    selectedModules.forEach((mk) => {
      map[mk] = [];
    });
    allSelectedFeatures.forEach((f) => {
      if (!map[f.module_key]) map[f.module_key] = [];
      map[f.module_key].push(f);
    });
    return map;
  }, [allSelectedFeatures, selectedModules]);

  // Available actions per feature, straight from the backend permissions table
  const actionsByFeature = useMemo(() => {
    const map = {};
    allPermissions.forEach((p) => {
      if (!p.feature_key || !p.action) return;
      if (!map[p.feature_key]) map[p.feature_key] = new Set();
      map[p.feature_key].add(p.action);
    });
    const out = {};
    Object.keys(map).forEach((k) => {
      out[k] = sortActions([...map[k]]);
    });
    return out;
  }, [allPermissions]);

  const getActionsFor = useCallback(
    (featureKey) => actionsByFeature[featureKey] || [],
    [actionsByFeature],
  );

  // Unique action set for the legend
  const legendActions = useMemo(() => {
    const set = new Set();
    allSelectedFeatures.forEach((f) => {
      getActionsFor(f.feature_key).forEach((a) => set.add(a));
    });
    return sortActions([...set]);
  }, [allSelectedFeatures, getActionsFor]);

  const isModuleFullyGranted = (moduleKey) => {
    const feats = allSelectedFeatures.filter((f) => f.module_key === moduleKey);
    if (feats.length === 0) return false;
    return feats.every((f) => {
      const available = getActionsFor(f.feature_key);
      if (available.length === 0) return false;
      const granted = featureActions[f.feature_key] || [];
      return available.every((a) => granted.includes(a));
    });
  };

  // ─── Save ───
  const finalSave = async () => {
    setSaving(true);
    try {
      let workingRoleId = roleId;
      let workingRoleKey = roleKey;

      const finalDescription =
        roleForm.description?.trim() || generateDescription(roleForm.role_name);

      if (!isEdit) {
        const generatedKey = roleForm.role_name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");
        const res = await fetch(`${API}/api/roles/post/role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            role_key: generatedKey,
            role_name: roleForm.role_name.trim(),
            description: finalDescription,
          }),
        });
        const data = await parseJsonSafe(res);
        workingRoleId = data.data.id;
        workingRoleKey = data.data.role_key;
        setRoleId(workingRoleId);
        setRoleKey(workingRoleKey);
      } else if (!isSystemRole) {
        const res = await fetch(
          `${API}/api/roles/update/role/${workingRoleId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              role_name: roleForm.role_name.trim(),
              description: finalDescription,
            }),
          },
        );
        await parseJsonSafe(res);
      }

      const modRes = await fetch(`${API}/api/role-modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: workingRoleKey,
          module_keys: selectedModules,
        }),
      });
      await parseJsonSafe(modRes);

      const featRes = await fetch(
        `${API}/api/role-features/update/rolefeature/${workingRoleId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ feature_ids: selectedFeatureIds }),
        },
      );
      await parseJsonSafe(featRes);

      // Only send permissions for features that are actually selected —
      // this drops stale entries left over from unchecked features.
      const permissionIds = [];
      allSelectedFeatures.forEach((f) => {
        const actions = featureActions[f.feature_key] || [];
        actions.forEach((action) => {
          const perm = allPermissions.find(
            (p) => p.feature_key === f.feature_key && p.action === action,
          );
          if (perm) permissionIds.push(perm.id);
        });
      });
      const permRes = await fetch(
        `${API}/api/role-permissions/update/role/${workingRoleId}/sync`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ permission_ids: permissionIds }),
        },
      );
      await parseJsonSafe(permRes);

      onSaved?.(!isEdit);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Navigation ───
  const validateStep = (s) => {
    if (s === 0) {
      if (!roleForm.role_name.trim()) {
        notify.warning("Please enter a role name to continue.");
        return false;
      }
    }
    if (s === 1) {
      if (!selectedModules.length) {
        notify.warning("Please select at least one module.");
        return false;
      }
    }
    if (s === 2) {
      const missing = selectedModules.filter((mk) => {
        const modFeatures = allFeatures.filter((f) => f.module_key === mk);
        if (modFeatures.length === 0) return false;
        return !modFeatures.some((f) => selectedFeatureIds.includes(f.id));
      });
      if (missing.length) {
        const names = missing.map(
          (mk) =>
            allModules.find((m) => m.module_key === mk)?.module_name || mk,
        );
        notify.warning(
          `Please select at least one feature for: ${names.join(", ")}`,
        );
        setExpandedFeatureAcc(missing[0]);
        return false;
      }
    }
    if (s === 3) {
      const missingFeatures = allSelectedFeatures.filter(
        (f) => (featureActions[f.feature_key] || []).length === 0,
      );
      if (missingFeatures.length) {
        const names = missingFeatures.map((f) => f.feature_name);
        const shown = names.slice(0, 3).join(", ");
        const extra = names.length > 3 ? ` and ${names.length - 3} more` : "";
        notify.warning(
          `Please grant at least one action for: ${shown}${extra}`,
        );
        const firstMissing = missingFeatures[0];
        setExpandedPermAcc(firstMissing.module_key);
        setExpandedPermFeature(firstMissing.feature_key);
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    if (step === 1) {
      await ensureFeaturesLoaded();
      setStep(2);
      return;
    }
    if (step === 2) {
      await ensurePermissionsLoaded();
      setStep(3);
      return;
    }
    if (step === 3) {
      await finalSave();
      return;
    }
    setStep((s) => s + 1);
  };

  // Edit-mode: jump directly to any step. All data is already loaded.
  const handleStepClick = async (target) => {
    if (!isEdit || saving || loadingStep || initialLoading) return;
    if (target === step) return;
    // Make sure catalog is present for the target step (usually a no-op after bootstrap).
    if (target >= 2) await ensureFeaturesLoaded();
    if (target >= 3) await ensurePermissionsLoaded();
    setStep(target);
  };

  // ─── Auto-expand on step entry (when nothing else is open) ───
  useEffect(() => {
    if (step === 2 && !expandedFeatureAcc && allFeatures.length > 0) {
      const first = selectedModules.find((mk) =>
        allFeatures.some((f) => f.module_key === mk),
      );
      if (first) setExpandedFeatureAcc(first);
    }
    if (step === 3 && !expandedPermAcc && allSelectedFeatures.length > 0) {
      // Prefer a module with missing grants; fall back to first with features.
      const withMissing = selectedModules.find((mk) =>
        allSelectedFeatures.some(
          (f) =>
            f.module_key === mk &&
            (featureActions[f.feature_key] || []).length === 0,
        ),
      );
      const first =
        withMissing ||
        selectedModules.find((mk) =>
          allSelectedFeatures.some((f) => f.module_key === mk),
        );
      if (first) setExpandedPermAcc(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Toggles ───
  const toggleModule = (mk) =>
    setSelectedModules((prev) =>
      prev.includes(mk) ? prev.filter((k) => k !== mk) : [...prev, mk],
    );

  const toggleFeature = (fid) =>
    setSelectedFeatureIds((prev) =>
      prev.includes(fid) ? prev.filter((i) => i !== fid) : [...prev, fid],
    );

  const toggleAction = (featureKey, action) => {
    const available = getActionsFor(featureKey);
    setFeatureActions((prev) => {
      const current = new Set(prev[featureKey] || []);
      if (current.has(action)) {
        current.delete(action);
      } else {
        current.add(action);
        // Auto-include "view" for any mutating action — but only if this
        // feature actually has a view permission defined in the backend.
        if (action !== "view" && available.includes("view")) {
          current.add("view");
        }
      }
      return { ...prev, [featureKey]: sortActions([...current]) };
    });
  };

  const setFeatureAll = (featureKey, all) => {
    const available = getActionsFor(featureKey);
    setFeatureActions((prev) => ({
      ...prev,
      [featureKey]: all ? [...available] : [],
    }));
  };

  const setModuleAll = (moduleKey, all) => {
    const featsInMod = allSelectedFeatures.filter(
      (f) => f.module_key === moduleKey,
    );
    setFeatureActions((prev) => {
      const next = { ...prev };
      featsInMod.forEach((f) => {
        const available = getActionsFor(f.feature_key);
        next[f.feature_key] = all ? [...available] : [];
      });
      return next;
    });
  };

  const handleRoleNameBlur = () => {
    if (isSystemRole) return;
    if (!roleForm.description.trim() && roleForm.role_name.trim()) {
      setRoleForm((prev) => ({
        ...prev,
        description: generateDescription(prev.role_name),
      }));
    }
  };

  const summaryPill = (text, color) => (
    <Chip
      label={text}
      size="small"
      sx={{
        background: `${color}15`,
        color,
        fontWeight: 600,
        fontSize: 11,
        height: 22,
      }}
    />
  );

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={modalStyle}>
          {/* HEADER */}
          <Box
            sx={{
              px: 4,
              pt: 3,
              pb: 2,
              borderBottom: "1px solid #f0f0f0",
              position: "relative",
            }}
          >
            <IconButton
              onClick={onClose}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                color: "#999",
                "&:hover": { background: "#f5f5f5", color: "#333" },
              }}
            >
              <CloseIcon />
            </IconButton>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `${TEAL}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldIcon sx={{ color: TEAL }} />
              </Box>
              <Box>
                <Typography
                  sx={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}
                >
                  {isEdit ? "Edit Role" : "Create Role"}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#666" }}>
                  {isEdit
                    ? `Managing "${role?.role_name}"${isSystemRole ? " (System Role)" : ""} — click any step to jump to it`
                    : "Configure a role's access. Nothing is saved until you click Finish."}
                </Typography>
              </Box>
            </Box>

            <Stepper
              activeStep={step}
              nonLinear={isEdit}
              sx={{
                mt: 2.5,
                "& .MuiStepIcon-root": {
                  color: "#e0e0e0",
                  "&.Mui-active": { color: TEAL },
                  "&.Mui-completed": { color: TEAL },
                },
                "& .MuiStepLabel-label": {
                  fontSize: 12,
                  fontWeight: 500,
                  "&.Mui-active": { fontWeight: 700, color: TEAL },
                },
                "& .MuiStepButton-root": {
                  py: 0.5,
                  borderRadius: 1,
                  "&:hover": isEdit ? { background: `${TEAL}08` } : {},
                },
              }}
            >
              {STEPS.map((s, idx) => (
                <Step key={s.label} completed={isEdit ? true : idx < step}>
                  {isEdit ? (
                    <StepButton
                      onClick={() => handleStepClick(idx)}
                      disabled={saving || loadingStep || initialLoading}
                    >
                      {s.label}
                    </StepButton>
                  ) : (
                    <StepLabel>{s.label}</StepLabel>
                  )}
                </Step>
              ))}
            </Stepper>
          </Box>

          {saving || loadingStep || initialLoading ? (
            <LinearProgress
              sx={{
                background: "transparent",
                "& .MuiLinearProgress-bar": { background: TEAL },
              }}
            />
          ) : (
            <Box sx={{ height: 4 }} />
          )}

          {/* CONTENT */}
          <Box
            sx={{ px: 4, py: 3, overflowY: "auto", flex: 1, minHeight: 320 }}
          >
            {initialLoading ? (
              <Box>
                <Skeleton
                  variant="rectangular"
                  height={40}
                  sx={{ borderRadius: 2, mb: 2 }}
                />
                <Skeleton
                  variant="rectangular"
                  height={80}
                  sx={{ borderRadius: 2, mb: 1 }}
                />
                <Skeleton
                  variant="rectangular"
                  height={80}
                  sx={{ borderRadius: 2, mb: 1 }}
                />
                <Skeleton
                  variant="rectangular"
                  height={80}
                  sx={{ borderRadius: 2 }}
                />
              </Box>
            ) : (
              <>
                {/* ═══ STEP 0 — BASIC INFO ═══ */}
                {step === 0 && (
                  <Fade in timeout={300}>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#333",
                          mb: 2,
                        }}
                      >
                        Role Details
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        label="Role Name"
                        placeholder="e.g. Head Pharmacist"
                        value={roleForm.role_name}
                        onChange={(e) =>
                          setRoleForm({
                            ...roleForm,
                            role_name: e.target.value,
                          })
                        }
                        onBlur={handleRoleNameBlur}
                        disabled={isSystemRole}
                        required
                        sx={{
                          mb: 2.5,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: TEAL,
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: TEAL,
                            },
                          },
                        }}
                        helperText={
                          isSystemRole
                            ? "System role names cannot be changed"
                            : "A clear, descriptive name for this role"
                        }
                      />

                      <Box sx={{ position: "relative" }}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Description"
                          placeholder="What responsibilities does this role have?"
                          value={roleForm.description}
                          onChange={(e) =>
                            setRoleForm({
                              ...roleForm,
                              description: e.target.value,
                            })
                          }
                          multiline
                          rows={3}
                          disabled={isSystemRole}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: TEAL,
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                {
                                  borderColor: TEAL,
                                },
                            },
                          }}
                          helperText="Auto-fills from the role name — edit freely if you want to customize"
                        />
                        {!isSystemRole && (
                          <Tooltip
                            title="Regenerate description from role name"
                            arrow
                          >
                            <Button
                              size="small"
                              startIcon={
                                <AutoFixHighIcon sx={{ fontSize: 14 }} />
                              }
                              disabled={!roleForm.role_name.trim()}
                              onClick={() =>
                                setRoleForm((prev) => ({
                                  ...prev,
                                  description: generateDescription(
                                    prev.role_name,
                                  ),
                                }))
                              }
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                textTransform: "none",
                                fontSize: 11,
                                color: TEAL,
                                fontWeight: 600,
                              }}
                            >
                              Generate
                            </Button>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </Fade>
                )}

                {/* ═══ STEP 1 — MODULES ═══ */}
                {step === 1 && (
                  <Fade in timeout={300}>
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#333",
                            }}
                          >
                            Grant Modules
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#666" }}>
                            Modules define which sections of the app this role
                            can access.
                          </Typography>
                        </Box>
                        {summaryPill(
                          `${selectedModules.length} selected`,
                          selectedModules.length ? TEAL : "#999",
                        )}
                      </Box>

                      {allModules.length === 0 ? (
                        <Skeleton
                          variant="rectangular"
                          height={100}
                          sx={{ borderRadius: 2 }}
                        />
                      ) : (
                        <>
                          {/* Available */}
                          <StyledAccordion
                            expanded={expandedModuleGroup === "available"}
                            onChange={(_, isOpen) =>
                              setExpandedModuleGroup(
                                isOpen ? "available" : null,
                              )
                            }
                            accent={TEAL}
                          >
                            <StyledAccordionSummary>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  flex: 1,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 1,
                                    background: `${TEAL}20`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <CheckIcon
                                    sx={{ fontSize: 16, color: TEAL }}
                                  />
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#333",
                                  }}
                                >
                                  Your Modules
                                </Typography>
                                <Typography
                                  sx={{ fontSize: 11, color: "#888" }}
                                >
                                  — enabled for your organization
                                </Typography>
                              </Box>
                              <Chip
                                label={`${selectedModules.length} / ${modulesGrouped.available.length}`}
                                size="small"
                                sx={{
                                  background: selectedModules.length
                                    ? TEAL
                                    : "#e0e0e0",
                                  color: selectedModules.length
                                    ? "#fff"
                                    : "#666",
                                  fontWeight: 700,
                                  fontSize: 11,
                                  height: 22,
                                  mr: 1,
                                }}
                              />
                            </StyledAccordionSummary>
                            <AccordionDetails sx={{ pt: 1, pb: 2 }}>
                              {modulesGrouped.available.length === 0 ? (
                                <Typography
                                  sx={{
                                    fontSize: 12,
                                    color: "#999",
                                    textAlign: "center",
                                    py: 2,
                                  }}
                                >
                                  No modules enabled for your organization.
                                </Typography>
                              ) : (
                                <Box
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: MODULE_GRID_COLS,
                                    gap: 1.5,
                                  }}
                                >
                                  {modulesGrouped.available.map((m) => (
                                    <ModuleRow
                                      key={m.id}
                                      module={m}
                                      selected={selectedModules.includes(
                                        m.module_key,
                                      )}
                                      available
                                      onToggle={() =>
                                        toggleModule(m.module_key)
                                      }
                                    />
                                  ))}
                                </Box>
                              )}
                            </AccordionDetails>
                          </StyledAccordion>

                          {/* Unavailable */}
                          {modulesGrouped.unavailable.length > 0 && (
                            <StyledAccordion
                              expanded={expandedModuleGroup === "unavailable"}
                              onChange={(_, isOpen) =>
                                setExpandedModuleGroup(
                                  isOpen ? "unavailable" : null,
                                )
                              }
                              accent="#999"
                            >
                              <StyledAccordionSummary>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    flex: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 1,
                                      background: "#f0f0f0",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <LockIcon
                                      sx={{ fontSize: 15, color: "#999" }}
                                    />
                                  </Box>
                                  <Typography
                                    sx={{
                                      fontSize: 13,
                                      fontWeight: 700,
                                      color: "#555",
                                    }}
                                  >
                                    Not Available for Your Organization
                                  </Typography>
                                  <Typography
                                    sx={{ fontSize: 11, color: "#999" }}
                                  >
                                    — contact system admin to enable
                                  </Typography>
                                </Box>
                                <Chip
                                  label={modulesGrouped.unavailable.length}
                                  size="small"
                                  sx={{
                                    background: "#f0f0f0",
                                    color: "#666",
                                    fontWeight: 700,
                                    fontSize: 11,
                                    height: 22,
                                    mr: 1,
                                  }}
                                />
                              </StyledAccordionSummary>
                              <AccordionDetails sx={{ pt: 1, pb: 2 }}>
                                <Box
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: MODULE_GRID_COLS,
                                    gap: 1.5,
                                  }}
                                >
                                  {modulesGrouped.unavailable.map((m) => (
                                    <ModuleRow
                                      key={m.id}
                                      module={m}
                                      selected={false}
                                      available={false}
                                      onToggle={() => {}}
                                    />
                                  ))}
                                </Box>
                              </AccordionDetails>
                            </StyledAccordion>
                          )}
                        </>
                      )}
                    </Box>
                  </Fade>
                )}

                {/* ═══ STEP 2 — FEATURES ═══ */}
                {step === 2 && (
                  <Fade in timeout={300}>
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#333",
                            }}
                          >
                            Grant Features
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: "#666" }}>
                            Expand each module and select at least one feature.
                          </Typography>
                        </Box>
                        {summaryPill(
                          `${selectedFeatureIds.length} selected`,
                          selectedFeatureIds.length ? TEAL : "#999",
                        )}
                      </Box>

                      {loadingStep ? (
                        <Box>
                          {[1, 2, 3].map((i) => (
                            <Skeleton
                              key={i}
                              variant="rectangular"
                              height={64}
                              sx={{ borderRadius: 2, mb: 1 }}
                            />
                          ))}
                        </Box>
                      ) : modulesWithFeatures.length === 0 ? (
                        <EmptyState
                          icon={<ExtensionIcon sx={{ fontSize: 48 }} />}
                          title="No features available"
                          message="The selected modules don't have any features yet. Go back to pick different modules, or contact your administrator."
                        />
                      ) : (
                        modulesWithFeatures.map(([mk, features]) => {
                          const moduleObj = allModules.find(
                            (m) => m.module_key === mk,
                          );
                          const grantedCount = features.filter((f) =>
                            selectedFeatureIds.includes(f.id),
                          ).length;
                          const missingRequired = grantedCount === 0;
                          const isExpanded = expandedFeatureAcc === mk;

                          return (
                            <StyledAccordion
                              key={mk}
                              expanded={isExpanded}
                              onChange={(_, isOpen) =>
                                setExpandedFeatureAcc(isOpen ? mk : null)
                              }
                              accent={missingRequired ? RED : TEAL}
                            >
                              <StyledAccordionSummary>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 1,
                                      background: `${TEAL}20`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <ViewModuleIcon
                                      sx={{ fontSize: 15, color: TEAL }}
                                    />
                                  </Box>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "#333",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {moduleObj?.module_name || mk}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: 10,
                                        color: "#999",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {mk}
                                    </Typography>
                                  </Box>
                                  {missingRequired && (
                                    <Chip
                                      icon={
                                        <WarningAmberIcon
                                          sx={{
                                            fontSize: 12,
                                            color: `${RED} !important`,
                                          }}
                                        />
                                      }
                                      label="Pick 1+"
                                      size="small"
                                      sx={{
                                        height: 20,
                                        fontSize: 10,
                                        background: "#ffebee",
                                        color: RED,
                                        fontWeight: 700,
                                        "& .MuiChip-label": { px: 0.5 },
                                      }}
                                    />
                                  )}
                                </Box>
                                <Chip
                                  label={`${grantedCount} / ${features.length}`}
                                  size="small"
                                  sx={{
                                    background: grantedCount ? TEAL : "#e0e0e0",
                                    color: grantedCount ? "#fff" : "#666",
                                    fontWeight: 700,
                                    fontSize: 11,
                                    height: 22,
                                    mr: 1,
                                  }}
                                />
                              </StyledAccordionSummary>
                              <AccordionDetails sx={{ pt: 1, pb: 2 }}>
                                <Box
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: FEATURE_GRID_COLS,
                                    gap: 1.5,
                                  }}
                                >
                                  {features.map((f) => (
                                    <FeatureRow
                                      key={f.id}
                                      feature={f}
                                      selected={selectedFeatureIds.includes(
                                        f.id,
                                      )}
                                      onToggle={() => toggleFeature(f.id)}
                                    />
                                  ))}
                                </Box>
                              </AccordionDetails>
                            </StyledAccordion>
                          );
                        })
                      )}
                    </Box>
                  </Fade>
                )}

                {/* ═══ STEP 3 — PERMISSIONS ═══ */}
                {step === 3 && (
                  <Fade in timeout={300}>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          sx={{ fontSize: 14, fontWeight: 600, color: "#333" }}
                        >
                          Set Permissions
                        </Typography>
                        <Typography
                          sx={{ fontSize: 12, color: "#666", mb: 1.5 }}
                        >
                          Expand each feature and grant at least one action.
                          Actions come from the permissions table — mutating
                          actions auto-include View when available.
                        </Typography>
                        {legendActions.length > 0 && (
                          <LegendBar actions={legendActions} />
                        )}
                      </Box>

                      {loadingStep ? (
                        <Box>
                          {[1, 2, 3].map((i) => (
                            <Skeleton
                              key={i}
                              variant="rectangular"
                              height={90}
                              sx={{ borderRadius: 2, mb: 1 }}
                            />
                          ))}
                        </Box>
                      ) : allSelectedFeatures.length === 0 ? (
                        <EmptyState
                          icon={
                            <AdminPanelSettingsIcon sx={{ fontSize: 48 }} />
                          }
                          title="No features to configure"
                          message="Go back to the previous step and enable at least one feature."
                        />
                      ) : (
                        Object.entries(permissionsByModule).map(
                          ([mk, features]) => {
                            if (features.length === 0) return null;
                            const moduleObj = allModules.find(
                              (m) => m.module_key === mk,
                            );
                            const allGranted = isModuleFullyGranted(mk);
                            const grantedFeatures = features.filter(
                              (f) =>
                                (featureActions[f.feature_key] || []).length >
                                0,
                            ).length;
                            const missingCount =
                              features.length - grantedFeatures;
                            const hasMissing = missingCount > 0;
                            const isExpanded = expandedPermAcc === mk;

                            return (
                              <StyledAccordion
                                key={mk}
                                expanded={isExpanded}
                                onChange={(_, isOpen) =>
                                  setExpandedPermAcc(isOpen ? mk : null)
                                }
                                accent={
                                  hasMissing ? RED : allGranted ? GREEN : TEAL
                                }
                              >
                                <StyledAccordionSummary>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 1,
                                        background: `${TEAL}20`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <ViewModuleIcon
                                        sx={{ fontSize: 15, color: TEAL }}
                                      />
                                    </Box>
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography
                                        sx={{
                                          fontSize: 13,
                                          fontWeight: 700,
                                          color: "#333",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {moduleObj?.module_name || mk}
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontSize: 10,
                                          color: "#999",
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        {mk}
                                      </Typography>
                                    </Box>
                                    {hasMissing && (
                                      <Chip
                                        icon={
                                          <WarningAmberIcon
                                            sx={{
                                              fontSize: 12,
                                              color: `${RED} !important`,
                                            }}
                                          />
                                        }
                                        label={`${missingCount} missing`}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: 10,
                                          background: "#ffebee",
                                          color: RED,
                                          fontWeight: 700,
                                          "& .MuiChip-label": { px: 0.5 },
                                        }}
                                      />
                                    )}
                                  </Box>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mr: 1,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      size="small"
                                      variant={
                                        allGranted ? "outlined" : "contained"
                                      }
                                      onClick={() =>
                                        setModuleAll(mk, !allGranted)
                                      }
                                      sx={{
                                        textTransform: "none",
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        px: 1.25,
                                        py: 0.25,
                                        borderRadius: 1.5,
                                        minWidth: 0,
                                        ...(allGranted
                                          ? { color: RED, borderColor: RED }
                                          : {
                                              background: TEAL,
                                              "&:hover": {
                                                background: TEAL_DARK,
                                              },
                                            }),
                                      }}
                                    >
                                      {allGranted ? "Clear All" : "Grant All"}
                                    </Button>
                                    <Chip
                                      label={`${grantedFeatures} / ${features.length}`}
                                      size="small"
                                      sx={{
                                        background: grantedFeatures
                                          ? TEAL
                                          : "#e0e0e0",
                                        color: grantedFeatures
                                          ? "#fff"
                                          : "#666",
                                        fontWeight: 700,
                                        fontSize: 11,
                                        height: 22,
                                      }}
                                    />
                                  </Box>
                                </StyledAccordionSummary>
                                <AccordionDetails sx={{ pt: 1, pb: 2 }}>
                                  {features.map((f) => (
                                    <FeaturePermissionAccordion
                                      key={f.id}
                                      feature={f}
                                      availableActions={getActionsFor(
                                        f.feature_key,
                                      )}
                                      actions={
                                        featureActions[f.feature_key] || []
                                      }
                                      expanded={
                                        expandedPermFeature === f.feature_key
                                      }
                                      onToggle={(isOpen) =>
                                        setExpandedPermFeature(
                                          isOpen ? f.feature_key : null,
                                        )
                                      }
                                      onToggleAction={(a) =>
                                        toggleAction(f.feature_key, a)
                                      }
                                      onSetAll={(all) =>
                                        setFeatureAll(f.feature_key, all)
                                      }
                                    />
                                  ))}
                                </AccordionDetails>
                              </StyledAccordion>
                            );
                          },
                        )
                      )}
                    </Box>
                  </Fade>
                )}
              </>
            )}
          </Box>

          {/* FOOTER */}
          <Box
            sx={{
              px: 4,
              py: 2.5,
              borderTop: "1px solid #f0f0f0",
              background: "#fafafa",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: 12, color: "#999" }}>
              Step {step + 1} of {STEPS.length}
              {isEdit && " — click any step above to jump"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="text"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || saving || initialLoading}
                sx={{
                  textTransform: "none",
                  color: "#666",
                  fontWeight: 500,
                  "&:hover": { background: "#eee" },
                }}
              >
                Back
              </Button>
              {isEdit && step !== STEPS.length - 1 && (
                <Button
                  variant="outlined"
                  onClick={finalSave}
                  disabled={saving || initialLoading}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    color: TEAL,
                    borderColor: TEAL,
                    "&:hover": {
                      background: `${TEAL}10`,
                      borderColor: TEAL_DARK,
                    },
                  }}
                >
                  Save Changes
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={saving || loadingStep || initialLoading}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  px: 3,
                  borderRadius: 2,
                  background: `linear-gradient(180deg, ${TEAL}, ${TEAL_DARK})`,
                  boxShadow: `0 2px 6px ${TEAL}40`,
                  "&:hover": {
                    background: `linear-gradient(180deg, ${TEAL_DARK}, #1e3d45)`,
                  },
                  "&.Mui-disabled": { background: "#ccc", color: "#fff" },
                }}
              >
                {saving
                  ? "Saving..."
                  : step === STEPS.length - 1
                    ? isEdit
                      ? "Save Changes"
                      : "Create Role"
                    : "Next"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
}

// ─── Subcomponents ─────────────────────────────

function StyledAccordion({ children, expanded, onChange, accent = TEAL }) {
  return (
    <Accordion
      expanded={expanded}
      onChange={onChange}
      disableGutters
      sx={{
        boxShadow: "none",
        border: `1px solid ${expanded ? accent : "#e8e8e8"}`,
        borderRadius: "10px !important",
        mb: 1.25,
        "&:before": { display: "none" },
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s",
        ...(expanded && { boxShadow: `0 2px 8px ${accent}15` }),
      }}
    >
      {children}
    </Accordion>
  );
}

function StyledAccordionSummary({ children }) {
  return (
    <AccordionSummary
      expandIcon={<ExpandMoreIcon sx={{ color: "#666" }} />}
      sx={{
        minHeight: 52,
        px: 2,
        "&.Mui-expanded": { minHeight: 52, background: "#fafbfc" },
        "& .MuiAccordionSummary-content": {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          m: 0,
          "&.Mui-expanded": { m: 0 },
        },
      }}
    >
      {children}
    </AccordionSummary>
  );
}

function ModuleRow({ module, selected, available, onToggle }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        height: MODULE_CARD_HEIGHT,
        px: 1.75,
        border: `1px solid ${selected ? TEAL : "#eee"}`,
        borderRadius: 2,
        background: !available ? "#fafafa" : selected ? TEAL_LIGHT : "#fff",
        opacity: available ? 1 : 0.6,
        transition: "all 0.2s",
        cursor: available ? "pointer" : "not-allowed",
        "&:hover": available && {
          borderColor: TEAL,
          transform: "translateY(-1px)",
        },
      }}
      onClick={available ? onToggle : undefined}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
          flex: 1,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            background: available ? `${TEAL}20` : "#eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ViewModuleIcon
            sx={{ fontSize: 16, color: available ? TEAL : "#999" }}
          />
        </Box>
        <Tooltip title={module.module_name} arrow enterDelay={500}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: "#333",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {module.module_name}
          </Typography>
        </Tooltip>
      </Box>
      {!available ? (
        <Tooltip
          title="Contact your system administrator to enable this module"
          arrow
        >
          <LockIcon sx={{ color: "#999", fontSize: 18, flexShrink: 0 }} />
        </Tooltip>
      ) : (
        <Switch
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          sx={{
            flexShrink: 0,
            "& .MuiSwitch-switchBase.Mui-checked": { color: TEAL },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: TEAL,
            },
          }}
        />
      )}
    </Box>
  );
}

function FeatureRow({ feature, selected, onToggle }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        height: FEATURE_CARD_HEIGHT,
        p: 1.5,
        pl: 2,
        border: `1px solid ${selected ? TEAL : "#f0f0f0"}`,
        borderRadius: 2,
        background: selected ? TEAL_LIGHT : "#fff",
        transition: "all 0.2s",
        cursor: "pointer",
        "&:hover": { borderColor: TEAL, transform: "translateY(-1px)" },
      }}
      onClick={onToggle}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          flex: 1,
          minWidth: 0,
          height: "100%",
        }}
      >
        {selected ? (
          <CheckCircleIcon
            sx={{ fontSize: 18, color: TEAL, flexShrink: 0, mt: 0.25 }}
          />
        ) : (
          <RadioButtonUncheckedIcon
            sx={{ fontSize: 18, color: "#ccc", flexShrink: 0, mt: 0.25 }}
          />
        )}
        <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
          <Tooltip title={feature.feature_name} arrow enterDelay={500}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: "#333",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {feature.feature_name}
            </Typography>
          </Tooltip>
          {feature.description && (
            <Tooltip title={feature.description} arrow enterDelay={500}>
              <Typography
                sx={{
                  fontSize: 11,
                  color: "#888",
                  mt: 0.25,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: 1.35,
                }}
              >
                {feature.description}
              </Typography>
            </Tooltip>
          )}
        </Box>
      </Box>
      <Switch
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        size="small"
        sx={{
          ml: 1,
          flexShrink: 0,
          "& .MuiSwitch-switchBase.Mui-checked": { color: TEAL },
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
            backgroundColor: TEAL,
          },
        }}
      />
    </Box>
  );
}

function FeaturePermissionAccordion({
  feature,
  availableActions,
  actions,
  expanded,
  onToggle,
  onToggleAction,
  onSetAll,
}) {
  const level = getLevelInfo(actions, availableActions);
  const allChecked =
    availableActions.length > 0 &&
    availableActions.every((a) => actions.includes(a));
  const noneChecked = actions.length === 0;
  const noActionsInBackend = availableActions.length === 0;

  return (
    <StyledAccordion
      expanded={expanded}
      onChange={(_, isOpen) => onToggle(isOpen)}
      accent={
        noActionsInBackend
          ? "#999"
          : noneChecked
            ? RED
            : allChecked
              ? GREEN
              : level.color
      }
    >
      <StyledAccordionSummary>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: "#333",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {feature.feature_name}
            </Typography>

            {feature.description && (
              <Tooltip title={feature.description} arrow enterDelay={500}>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: "#888",
                    mt: 0.25,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.35,
                  }}
                >
                  {feature.description}
                </Typography>
              </Tooltip>
            )}
          </Box>
          {noActionsInBackend && (
            <Chip
              label="No actions defined"
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                background: "#f5f5f5",
                color: "#999",
                fontWeight: 700,
                "& .MuiChip-label": { px: 0.5 },
              }}
            />
          )}
          {!noActionsInBackend && noneChecked && (
            <Chip
              icon={
                <WarningAmberIcon
                  sx={{ fontSize: 12, color: `${RED} !important` }}
                />
              }
              label="Pick 1+"
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                background: "#ffebee",
                color: RED,
                fontWeight: 700,
                "& .MuiChip-label": { px: 0.5 },
              }}
            />
          )}
        </Box>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, mr: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Chip
            size="small"
            label={level.label}
            sx={{
              background: `${level.color}15`,
              color: level.color,
              fontWeight: 600,
              fontSize: 10,
              height: 22,
              border: `1px solid ${level.color}40`,
            }}
          />
          {!noActionsInBackend && (
            <Button
              size="small"
              variant="text"
              onClick={() => onSetAll(!allChecked)}
              sx={{
                textTransform: "none",
                fontSize: 11,
                fontWeight: 600,
                color: allChecked ? RED : TEAL,
                px: 1,
                minWidth: 0,
              }}
            >
              {allChecked ? "Clear" : "All"}
            </Button>
          )}
        </Box>
      </StyledAccordionSummary>
      <AccordionDetails sx={{ pt: 1, pb: 2 }}>
        {noActionsInBackend ? (
          <Typography
            sx={{
              fontSize: 12,
              color: "#999",
              fontStyle: "italic",
              textAlign: "center",
              py: 1.5,
            }}
          >
            No permissions defined in the backend for this feature.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {availableActions.map((actionKey) => {
              const meta = getActionMeta(actionKey);
              const checked = actions.includes(actionKey);
              return (
                <Box
                  key={actionKey}
                  role="checkbox"
                  aria-checked={checked}
                  tabIndex={0}
                  onClick={() => onToggleAction(actionKey)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      onToggleAction(actionKey);
                    }
                  }}
                  sx={{
                    display: "flex",
                    flexWrap:"wrap",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    cursor: "pointer",
                    userSelect: "none",
                    border: `1.5px solid ${checked ? meta.color : "#e5e5e5"}`,
                    background: checked ? `${meta.color}12` : "#fff",
                    boxShadow: checked ? `0 1px 3px ${meta.color}30` : "none",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      background: checked
                        ? `${meta.color}1c`
                        : `${meta.color}08`,
                      borderColor: meta.color,
                      transform: "translateY(-1px)",
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${meta.color}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  {/* Icon */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      color: checked ? meta.color : "#999",
                    }}
                  >
                    {meta.icon}
                  </Box>

                  {/* Label */}
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: checked ? meta.color : "#555",
                      flex: 1,
                    }}
                  >
                    {meta.label}
                  </Typography>

                  {/* Check badge on the right when selected */}
                  {checked && (
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <CheckIcon sx={{ fontSize: 12, color: "#fff" }} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </AccordionDetails>
    </StyledAccordion>
  );
}

function LegendBar({ actions }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        p: 1,
        background: "#f9f9f9",
        borderRadius: 2,
        border: "1px solid #f0f0f0",
        flexWrap: "wrap",
      }}
    >
      {actions.map((actionKey) => {
        const meta = getActionMeta(actionKey);
        return (
          <Box
            key={actionKey}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.25,
            }}
          >
            <Box sx={{ color: meta.color, display: "flex" }}>
              {React.cloneElement(meta.icon, { sx: { fontSize: 14 } })}
            </Box>
            <Typography
              sx={{ fontSize: 11, color: meta.color, fontWeight: 600 }}
            >
              {meta.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <Box
      sx={{
        py: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#999",
        textAlign: "center",
      }}
    >
      <Box sx={{ mb: 1.5, color: "#ddd" }}>{icon}</Box>
      <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 12, maxWidth: 360 }}>{message}</Typography>
    </Box>
  );
}
