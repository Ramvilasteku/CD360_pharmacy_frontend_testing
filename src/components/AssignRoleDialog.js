import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Divider,
  Chip,
  Tooltip,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import ShieldIcon from "@mui/icons-material/Shield";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonIcon from "@mui/icons-material/Person";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import AddIcon from "@mui/icons-material/Add";

const TEAL = "#3f6f7a";
const TEAL_DARK = "#2d5761";
const TEAL_LIGHT = "#eaf3f5";
const AMBER = "#f5b400";
const RED = "#d32f2f";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 640,
  maxWidth: "96vw",
  maxHeight: "92vh",
  bgcolor: "background.paper",
  borderRadius: 3,
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  outline: "none",
  display: "flex",
  flexDirection: "column",
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

export default function AssignRoleDialog({
  open,
  onClose,
  employee,
  allRoles = [],
  onChanged,
}) {
  const API = process.env.REACT_APP_URL;

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Assign form
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [makeItPrimary, setMakeItPrimary] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Per-row action state
  const [busyId, setBusyId] = useState(null); // assignment id being modified
  const [confirmRemove, setConfirmRemove] = useState(null); // assignment object
  const [confirmPrimary, setConfirmPrimary] = useState(null); // assignment object

  // Feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const showSnack = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const fetchAssignments = async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/user-role-assignments/get/user/staff/${employee.id}`,
        { credentials: "include" },
      );
      const data = await parseJsonSafe(res);
      setAssignments((data?.data || []).filter((a) => a.status !== 0));
    } catch (err) {
      console.error("Fetch assignments error:", err.message);
      setAssignments([]);
      showSnack("Couldn't load this employee's roles.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && employee?.id) {
      fetchAssignments();
      setSelectedRoleId("");
      setMakeItPrimary(false);
      setBusyId(null);
      setConfirmRemove(null);
      setConfirmPrimary(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id]);

  // Derived: roles not yet assigned to this employee
  const assignedRoleIds = useMemo(
    () => new Set(assignments.map((a) => a.role_id)),
    [assignments],
  );
  const availableRoles = useMemo(
    () => allRoles.filter((r) => !assignedRoleIds.has(r.id)),
    [allRoles, assignedRoleIds],
  );

  const currentPrimary = useMemo(
    () => assignments.find((a) => a.is_primary === 1),
    [assignments],
  );
  const hasNoPrimary = !currentPrimary && assignments.length > 0;

  // Enrich assignments with catalog info (name/description) if backend didn't send it
  const enrichedAssignments = useMemo(() => {
    return assignments.map((a) => {
      const catalog = allRoles.find((r) => r.id === a.role_id) || {};
      return {
        ...a,
        role_name: a.role_name || catalog.role_name || "Unknown role",
        role_key: a.role_key || catalog.role_key || "",
        description: a.description ?? catalog.description ?? "",
      };
    });
  }, [assignments, allRoles]);

  // ─── Actions ─────────────────────────────────

  const handleAssign = async () => {
    if (!selectedRoleId) {
      showSnack("Please pick a role to assign.", "warning");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(
        `${API}/api/user-role-assignments/post/user-role-assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            user_id: employee.id,
            user_type: "staff",
            role_id: selectedRoleId,
            is_primary: makeItPrimary,
          }),
        },
      );
      await parseJsonSafe(res);

      const roleObj = allRoles.find((r) => r.id === selectedRoleId);
      showSnack(
        `Assigned "${roleObj?.role_name || "role"}" to ${employee.name}.`,
        "success",
      );
      setSelectedRoleId("");
      setMakeItPrimary(false);
      await fetchAssignments();
      onChanged?.();
    } catch (err) {
      showSnack(err.message, "error");
    } finally {
      setAssigning(false);
    }
  };

const handleSetPrimary = async (assignment) => {
  setBusyId(assignment.id);
  try {
    const res = await fetch(
      `${API}/api/user-role-assignments/update/${assignment.id}/set-primary`,
      {
        method: "PUT",
        credentials: "include",
      },
    );
    await parseJsonSafe(res);
    showSnack(
      `"${assignment.role_name}" is now the primary role.`,
      "success",
    );
    await fetchAssignments();
    onChanged?.();
  } catch (err) {
    showSnack(err.message, "error");
  } finally {
    setBusyId(null);
    setConfirmPrimary(null);
  }
};

  const handleRemove = async (assignment) => {
    setBusyId(assignment.id);
    try {
      const res = await fetch(
        `${API}/api/user-role-assignments/delete/${assignment.id}`,
        { method: "DELETE", credentials: "include" },
      );
      await parseJsonSafe(res);
      showSnack(
        `Removed "${assignment.role_name}" from ${employee.name}.`,
        "success",
      );
      await fetchAssignments();
      onChanged?.();
    } catch (err) {
      showSnack(err.message, "error");
    } finally {
      setBusyId(null);
      setConfirmRemove(null);
    }
  };

  const askSetPrimary = (assignment) => {
    // If there's already a different primary, confirm the swap.
    // If not, just do it silently.
    if (currentPrimary && currentPrimary.id !== assignment.id) {
      setConfirmPrimary(assignment);
    } else {
      handleSetPrimary(assignment);
    }
  };

  return (
    <>
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: `${TEAL}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ManageAccountsIcon sx={{ color: TEAL, fontSize: 24 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#1a1a1a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Manage Roles — {employee?.name || "Employee"}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#666",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {employee?.email}
                    {employee?.branch ? ` · ${employee.branch}` : ""}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* CONTENT */}
            <Box sx={{ px: 4, py: 3, overflowY: "auto", flex: 1 }}>
              {/* Header row */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{ fontSize: 13, fontWeight: 700, color: "#333" }}
                >
                  Currently Assigned
                </Typography>
                <Chip
                  label={`${enrichedAssignments.length} role${enrichedAssignments.length === 1 ? "" : "s"}`}
                  size="small"
                  sx={{
                    background: enrichedAssignments.length
                      ? `${TEAL}15`
                      : "#f5f5f5",
                    color: enrichedAssignments.length ? TEAL : "#999",
                    fontWeight: 700,
                    fontSize: 11,
                    height: 22,
                  }}
                />
              </Box>

              {/* Warn if no primary is set */}
              {hasNoPrimary && (
                <Alert
                  severity="warning"
                  icon={<WarningAmberIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    fontSize: 12,
                    py: 0.5,
                    "& .MuiAlert-message": { py: 0.5 },
                  }}
                >
                  No primary role set. Star one below to make it the primary.
                </Alert>
              )}

              {/* Assignments list */}
              {loading ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CircularProgress size={24} sx={{ color: TEAL }} />
                </Box>
              ) : enrichedAssignments.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    px: 3,
                    border: "1px dashed #ddd",
                    borderRadius: 2,
                    textAlign: "center",
                    color: "#999",
                    background: "#fafafa",
                  }}
                >
                  <PersonIcon sx={{ fontSize: 36, color: "#ddd" }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 1 }}>
                    No roles assigned yet
                  </Typography>
                  <Typography sx={{ fontSize: 12, mt: 0.5 }}>
                    Assign one below to give this employee access.
                  </Typography>
                </Box>
              ) : (
                enrichedAssignments.map((a) => (
                  <RoleAssignmentRow
                    key={a.id}
                    assignment={a}
                    busy={busyId === a.id}
                    canRemove={a.is_primary !== 1}
                    onSetPrimary={() => askSetPrimary(a)}
                    onRemove={() => setConfirmRemove(a)}
                  />
                ))
              )}

              <Divider sx={{ my: 3 }} />

              {/* ASSIGN NEW ROLE */}
              <Typography
                sx={{ fontSize: 13, fontWeight: 700, color: "#333", mb: 1.5 }}
              >
                Assign Another Role
              </Typography>

              {availableRoles.length === 0 ? (
                <Box
                  sx={{
                    py: 2,
                    px: 2,
                    background: "#f9f9f9",
                    borderRadius: 2,
                    border: "1px solid #f0f0f0",
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: "#666" }}>
                    All available roles are already assigned to this employee.
                  </Typography>
                </Box>
              ) : (
                <>
                  <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                    <InputLabel id="assign-role-label">Role</InputLabel>
                    <Select
                      labelId="assign-role-label"
                      label="Role"
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      MenuProps={{ PaperProps: { style: { maxHeight: 280 } } }}
                      sx={{
                        borderRadius: 2,
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: TEAL,
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: TEAL,
                        },
                      }}
                    >
                      {availableRoles.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              py: 0.25,
                            }}
                          >
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                              {r.role_name}
                            </Typography>
                            {r.description && (
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  color: "#888",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: 400,
                                }}
                              >
                                {r.description}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={makeItPrimary}
                        onChange={(e) => setMakeItPrimary(e.target.checked)}
                        sx={{
                          color: "#ccc",
                          "&.Mui-checked": { color: AMBER },
                        }}
                        size="small"
                      />
                    }
                    label={
                      <Box>
                        <Typography
                          sx={{ fontSize: 13, fontWeight: 600, color: "#333" }}
                        >
                          Make this the primary role
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#888" }}>
                          {currentPrimary
                            ? `Will replace "${currentPrimary.role_name}" as primary.`
                            : "This will be the employee's main role."}
                        </Typography>
                      </Box>
                    }
                    sx={{ ml: 0, alignItems: "flex-start", mt: 0.5 }}
                  />
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
                {enrichedAssignments.length > 0 && currentPrimary
                  ? `Primary: ${currentPrimary.role_name}`
                  : "No primary role"}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="text"
                  onClick={onClose}
                  sx={{
                    textTransform: "none",
                    color: "#666",
                    fontWeight: 500,
                    "&:hover": { background: "#eee" },
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="contained"
                  startIcon={
                    assigning ? (
                      <CircularProgress size={14} sx={{ color: "#fff" }} />
                    ) : (
                      <AddIcon />
                    )
                  }
                  onClick={handleAssign}
                  disabled={
                    !selectedRoleId || assigning || availableRoles.length === 0
                  }
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2.5,
                    borderRadius: 2,
                    background: `linear-gradient(180deg, ${TEAL}, ${TEAL_DARK})`,
                    boxShadow: `0 2px 6px ${TEAL}40`,
                    "&:hover": {
                      background: `linear-gradient(180deg, ${TEAL_DARK}, #1e3d45)`,
                    },
                    "&.Mui-disabled": { background: "#ccc", color: "#fff" },
                  }}
                >
                  {assigning ? "Assigning..." : "Assign Role"}
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Confirm Remove */}
      <Dialog
        open={!!confirmRemove}
        onClose={() => busyId === null && setConfirmRemove(null)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 420 } }}
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#ffebee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WarningAmberIcon sx={{ color: RED, fontSize: 24 }} />
          </Box>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
            Remove Role?
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#555", fontSize: 14 }}>
            Remove{" "}
            <strong style={{ color: "#1a1a1a" }}>
              "{confirmRemove?.role_name}"
            </strong>{" "}
            from <strong style={{ color: "#1a1a1a" }}>{employee?.name}</strong>?
            They'll lose access to everything this role granted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setConfirmRemove(null)}
            disabled={busyId !== null}
            sx={{
              textTransform: "none",
              color: "#666",
              fontWeight: 500,
              px: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleRemove(confirmRemove)}
            disabled={busyId !== null}
            variant="contained"
            color="error"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
              borderRadius: 2,
              boxShadow: "none",
              "&:hover": { boxShadow: `0 2px 6px ${RED}40` },
            }}
          >
            {busyId === confirmRemove?.id ? "Removing..." : "Remove Role"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Set Primary (swap) */}
      <Dialog
        open={!!confirmPrimary}
        onClose={() => busyId === null && setConfirmPrimary(null)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 420 } }}
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: `${AMBER}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StarIcon sx={{ color: AMBER, fontSize: 24 }} />
          </Box>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
            Change Primary Role?
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#555", fontSize: 14 }}>
            <strong style={{ color: "#1a1a1a" }}>
              "{confirmPrimary?.role_name}"
            </strong>{" "}
            will become the primary role for{" "}
            <strong style={{ color: "#1a1a1a" }}>{employee?.name}</strong>.
            {currentPrimary && (
              <>
                {" "}
                "{currentPrimary.role_name}" will remain assigned but no longer
                primary.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setConfirmPrimary(null)}
            disabled={busyId !== null}
            sx={{
              textTransform: "none",
              color: "#666",
              fontWeight: 500,
              px: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSetPrimary(confirmPrimary)}
            disabled={busyId !== null}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
              borderRadius: 2,
              background: `linear-gradient(180deg, ${AMBER}, #d99a00)`,
              boxShadow: `0 2px 6px ${AMBER}40`,
              "&:hover": {
                background: `linear-gradient(180deg, #d99a00, #b78200)`,
              },
            }}
          >
            {busyId === confirmPrimary?.id ? "Setting..." : "Set as Primary"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{
            borderRadius: 2,
            fontWeight: 500,
            minWidth: 280,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

// ─── Subcomponents ─────────────────────────────

function RoleAssignmentRow({
  assignment,
  busy,
  canRemove,
  onSetPrimary,
  onRemove,
}) {
  const isPrimary = assignment.is_primary === 1;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        mb: 1,
        border: `1px solid ${isPrimary ? `${AMBER}55` : "#eee"}`,
        borderRadius: 2,
        background: isPrimary
          ? `linear-gradient(90deg, ${AMBER}08, transparent)`
          : "#fff",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          borderColor: isPrimary ? AMBER : TEAL,
          transform: "translateY(-1px)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          background: isPrimary ? `${AMBER}20` : `${TEAL}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <ShieldIcon sx={{ color: isPrimary ? AMBER : TEAL, fontSize: 20 }} />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1a1a1a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {assignment.role_name}
          </Typography>
          {isPrimary && (
            <Chip
              icon={
                <StarIcon sx={{ fontSize: 12, color: `${AMBER} !important` }} />
              }
              label="Primary"
              size="small"
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 700,
                background: `${AMBER}20`,
                color: "#8a6d00",
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
        </Box>

        <Typography
          sx={{
            fontSize: 11,
            color: "#888",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            mt: 0.25,
          }}
        >
          {assignment.description}
        </Typography>
      </Box>

      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
      >
        {busy ? (
          <CircularProgress size={18} sx={{ color: TEAL, mx: 1 }} />
        ) : (
          <>
            <Tooltip
              title={isPrimary ? "This is the primary role" : "Set as primary"}
              arrow
            >
              <span>
                <IconButton
                  size="small"
                  onClick={onSetPrimary}
                  disabled={isPrimary}
                  sx={{
                    color: isPrimary ? AMBER : "#bbb",
                    "&:hover": { background: `${AMBER}15`, color: AMBER },
                    "&.Mui-disabled": { color: AMBER, opacity: 1 },
                  }}
                >
                  {isPrimary ? (
                    <StarIcon fontSize="small" />
                  ) : (
                    <StarBorderIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip
              title={
                canRemove
                  ? "Remove this role"
                  : "Set a different role as primary before removing this one"
              }
              arrow
            >
              <span>
                <IconButton
                  size="small"
                  onClick={onRemove}
                  disabled={!canRemove}
                  sx={{
                    color: canRemove ? RED : "#ccc",
                    "&:hover": { background: "#ffebee" },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
      </Box>
    </Box>
  );
}
