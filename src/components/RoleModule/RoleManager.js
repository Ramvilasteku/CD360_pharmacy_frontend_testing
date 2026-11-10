import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  IconButton,
  TextField,
  Tooltip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  InputAdornment,
  Chip,
  Skeleton,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PeopleIcon from "@mui/icons-material/People";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import GroupsIcon from "@mui/icons-material/Groups";
import SearchIcon from "@mui/icons-material/Search";
import ExtensionIcon from "@mui/icons-material/Extension";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ShieldIcon from "@mui/icons-material/Shield";
import RoleWizard from "./RoleWizard";
import RoleStaffDialog from "./RoleStaffDialog";

const TEAL = "#3f6f7a";
const TEAL_DARK = "#2d5761";
const AMBER = "#f5b400";

export default function RoleManager() {
  const theme = useTheme();

  const [roles, setRoles] = useState([]);
  const [staffCounts, setStaffCounts] = useState({});
  const [featureCounts, setFeatureCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardRole, setWizardRole] = useState(null);

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [staffDialogRole, setStaffDialogRole] = useState(null);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    role: null,
    loading: false,
  });

  // Snackbar for feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // success | error | warning | info
  });

  const API = process.env.REACT_APP_URL;

  const showSnack = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/roles/getall/roles`, {
        credentials: "include",
      });
      const data = await res.json();
      const list = (data?.data || []).filter(
        (r) => r.role_key !== "admin" && r.role_key !== "client",
      );
      setRoles(list);
      await fetchAllCounts(list);
    } catch (err) {
      showSnack("Failed to load roles. Please refresh.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCounts = async (roleList) => {
    const staffMap = {};
    const featureMap = {};
    await Promise.all(
      roleList.map(async (r) => {
        try {
          const [staffRes, featRes] = await Promise.all([
            fetch(`${API}/api/user-role-assignments/get/role/${r.id}`, {
              credentials: "include",
            }),
            fetch(`${API}/api/role-features/get/rolefeature/${r.id}`, {
              credentials: "include",
            }),
          ]);
          const staffData = await staffRes.json();
          const featData = await featRes.json();
          staffMap[r.id] = (staffData?.data || []).filter(
            (a) => a.status === 1,
          ).length;
          featureMap[r.id] = (featData?.data?.features || []).length;
        } catch {
          staffMap[r.id] = 0;
          featureMap[r.id] = 0;
        }
      }),
    );
    setStaffCounts(staffMap);
    setFeatureCounts(featureMap);
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDeleteDialog = (role) => {
    if (role.is_system_role === 1) {
      showSnack("System roles cannot be deleted.", "warning");
      return;
    }
    setDeleteDialog({ open: true, role, loading: false });
  };

  const closeDeleteDialog = () => {
    if (deleteDialog.loading) return;
    setDeleteDialog({ open: false, role: null, loading: false });
  };

  const confirmDelete = async () => {
    const role = deleteDialog.role;
    if (!role) return;

    setDeleteDialog((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API}/api/roles/delete/role/${role.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      showSnack(`Role "${role.role_name}" deleted successfully.`, "success");
      setDeleteDialog({ open: false, role: null, loading: false });
      fetchRoles();
    } catch (err) {
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
      showSnack(err.message, "error");
    }
  };

  const totalStaff = Object.values(staffCounts).reduce((a, b) => a + b, 0);
  const totalFeatures = Object.values(featureCounts).reduce((a, b) => a + b, 0);

  const columns = [
    {
      field: "role_name",
      headerName: "Role",
      flex: 1.3,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: `${TEAL}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldIcon sx={{ fontSize: 18, color: TEAL }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {params.row.role_name}
              </Typography>
              {params.row.is_system_role === 1 && (
                <Chip
                  label="System"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 9,
                    fontWeight: 700,
                    background: "#e8e8e8",
                    color: "#666",
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              )}
            </Box>
            <Typography
              sx={{
                fontSize: 11,
                color: "#888",
                fontFamily: "monospace",
              }}
            >
              {params.row.role_key}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      renderCell: (params) => (
        <Typography
          sx={{
            fontSize: 13,
            color: "#555",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {params.row.description || (
            <span style={{ color: "#bbb", fontStyle: "italic" }}>
              No description
            </span>
          )}
        </Typography>
      ),
    },
    {
      field: "staff_count",
      headerName: "Staff",
      width: 110,
      renderCell: (params) => {
        const count = staffCounts[params.row.id];
        if (count === undefined) {
          return <Skeleton variant="text" width={30} />;
        }
        return (
          <Chip
            icon={<PeopleIcon sx={{ fontSize: 14 }} />}
            label={count}
            size="small"
            sx={{
              background: count > 0 ? `${TEAL}15` : "#f5f5f5",
              color: count > 0 ? TEAL : "#999",
              fontWeight: 600,
              "& .MuiChip-icon": {
                color: count > 0 ? TEAL : "#999",
              },
            }}
          />
        );
      },
    },
    {
      field: "feature_count",
      headerName: "Features",
      width: 120,
      renderCell: (params) => {
        const count = featureCounts[params.row.id];
        if (count === undefined) {
          return <Skeleton variant="text" width={30} />;
        }
        return (
          <Chip
            icon={<ExtensionIcon sx={{ fontSize: 14 }} />}
            label={count}
            size="small"
            sx={{
              background: count > 0 ? `${AMBER}15` : "#f5f5f5",
              color: count > 0 ? "#a67a00" : "#999",
              fontWeight: 600,
              "& .MuiChip-icon": {
                color: count > 0 ? AMBER : "#999",
              },
            }}
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="View assigned staff" arrow>
            <IconButton
              size="small"
              onClick={() => {
                setStaffDialogRole(params.row);
                setStaffDialogOpen(true);
              }}
              sx={{
                width: "35%",
                color: TEAL,
                "&:hover": { background: `${TEAL}15` },
              }}
            >
              <GroupsIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit role & permissions" arrow>
            <IconButton
              size="small"
              onClick={() => {
                setWizardRole(params.row);
                setWizardOpen(true);
              }}
              sx={{
                width: "35%",

                color: TEAL,
                "&:hover": { background: `${TEAL}15` },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              params.row.is_system_role === 1
                ? "System roles cannot be deleted"
                : "Delete role"
            }
            arrow
          >
            <span>
              <IconButton
                size="small"
                disabled={params.row.is_system_role === 1}
                onClick={() => openDeleteDialog(params.row)}
                sx={{
                  width: "35%",

                  color: "#d32f2f",
                  "&:hover": { background: "#ffebee" },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filteredRoles = roles.filter((r) =>
    (r.role_name + " " + r.role_key + " " + (r.description || ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // ─── STAT CARD helper ───
  const StatCard = ({ icon, label, value, color, subtitle }) => (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        border: "1px solid #f0f0f0",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        },
      }}
    >
      <CardContent sx={{ px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 42,
              borderRadius: 2.5,
              background: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {React.cloneElement(icon, { sx: { fontSize: 28, color } })}
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                color: "#666",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                fontSize: 28,
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.1,
              }}
            >
              {loading ? <Skeleton width={40} /> : value}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: 11, color: "#999", mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ padding: { xs: 1, md: 2 } }}>
      {/* Header */}

      {/* Stat cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
          mb: 1.5,
        }}
      >
        <StatCard
          icon={<LockPersonIcon />}
          label="Total Roles"
          value={roles.length}
          color={TEAL}
          subtitle={`${roles.filter((r) => r.is_system_role === 1).length} system, ${roles.filter((r) => r.is_system_role !== 1).length} custom`}
        />
        <StatCard
          icon={<PeopleIcon />}
          label="Staff Assigned"
          value={totalStaff}
          color={AMBER}
          subtitle="Across all roles"
        />
        <StatCard
          icon={<ExtensionIcon />}
          label="Feature Grants"
          value={totalFeatures}
          color="#7c5cff"
          subtitle="Total access grants"
        />
      </Box>

      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 1.5,
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          placeholder="Search by name, key, or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            minWidth: 300,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              background: "#fff",
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: TEAL,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: TEAL,
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#999", fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setWizardRole(null);
            setWizardOpen(true);
          }}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            px: 2.5,
            py: 1,
            borderRadius: 2,
            background: `linear-gradient(180deg, ${TEAL}, ${TEAL_DARK})`,
            boxShadow: `0 2px 6px ${TEAL}40`,
            "&:hover": {
              background: `linear-gradient(180deg, ${TEAL_DARK}, #1e3d45)`,
              boxShadow: `0 4px 10px ${TEAL}60`,
            },
          }}
        >
          Create Role
        </Button>
      </Box>

      {/* Table */}
      <Box
        sx={{
          height: 300,
          width: "100%",
          background: "#fff",
          borderRadius: 3,
          border: "1px solid #f0f0f0",
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={filteredRoles}
          columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          rowHeight={64}
          initialState={{
            pagination: { paginationModel: { pageSize: 5, page: 0 } },
          }}
          slots={{
            noRowsOverlay: () => (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#999",
                }}
              >
                <ShieldIcon sx={{ fontSize: 48, mb: 1, color: "#ddd" }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  {search ? "No roles match your search" : "No roles yet"}
                </Typography>
                <Typography sx={{ fontSize: 12, mt: 0.5 }}>
                  {search
                    ? "Try a different keyword"
                    : "Click 'Create Role' to add your first role"}
                </Typography>
              </Box>
            ),
          }}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              background: "#fafafa",
              borderBottom: "1px solid #eee",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#555",
              fontWeight: 600,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            },
            "& .MuiDataGrid-row": {
              cursor: "default",
              "&:hover": {
                background: "#f9fbfc",
              },
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #f5f5f5",
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
              {
                outline: "none",
              },
          }}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Wizard */}
      <RoleWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        role={wizardRole}
        onSaved={(created) => {
          setWizardOpen(false);
          fetchRoles();
          showSnack(
            created
              ? `Role created successfully.`
              : `Role updated successfully.`,
            "success",
          );
        }}
      />

      {/* Staff Dialog */}
      <RoleStaffDialog
        open={staffDialogOpen}
        onClose={() => setStaffDialogOpen(false)}
        role={staffDialogRole}
        onChanged={fetchRoles}
        onFeedback={showSnack}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        PaperProps={{
          sx: {
            borderRadius: 3,
            padding: 1,
            maxWidth: 420,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            pb: 1,
          }}
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
            <WarningAmberIcon sx={{ color: "#d32f2f", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
              Delete Role?
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#555", fontSize: 14 }}>
            Are you sure you want to delete{" "}
            <strong style={{ color: "#1a1a1a" }}>
              "{deleteDialog.role?.role_name}"
            </strong>
            ? This action cannot be undone.
          </DialogContentText>
          {staffCounts[deleteDialog.role?.id] > 0 && (
            <Alert
              severity="warning"
              sx={{
                mt: 2,
                borderRadius: 2,
                fontSize: 13,
              }}
            >
              <strong>{staffCounts[deleteDialog.role?.id]}</strong> staff
              member(s) are currently assigned this role. You'll need to
              reassign them first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={closeDeleteDialog}
            disabled={deleteDialog.loading}
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
            onClick={confirmDelete}
            disabled={deleteDialog.loading}
            variant="contained"
            color="error"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
              borderRadius: 2,
              boxShadow: "none",
              "&:hover": { boxShadow: "0 2px 6px rgba(211,47,47,0.3)" },
            }}
          >
            {deleteDialog.loading ? "Deleting..." : "Delete Role"}
          </Button>
        </DialogActions>
      </Dialog>
      {/*  */}
    </Box>
  );
}
