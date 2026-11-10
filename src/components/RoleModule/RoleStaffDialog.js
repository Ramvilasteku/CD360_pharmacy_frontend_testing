import React, { useEffect, useState } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";

const TEAL = "#3f6f7a";

// Modal shell — flex column with a bounded height so the middle can scroll.
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "92%", sm: "70%", md: "50%", lg: "40%" },
  maxHeight: "65vh",
  bgcolor: "background.paper",
  borderRadius: "16px",
  boxShadow: 24,
  display: "flex",
  flexDirection: "column",
  outline: "none",
  overflow: "hidden", // clip child rounded corners
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

export default function RoleStaffDialog({ open, onClose, role }) {
  const API = process.env.REACT_APP_URL;

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignments = async () => {
    if (!role?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/user-role-assignments/get/role/${role.id}`,
        { credentials: "include" },
      );
      const data = await parseJsonSafe(res);
      setAssignments((data?.data || []).filter((a) => a.status === 1));
    } catch (err) {
      console.error(err.message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && role?.id) {
      fetchAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role?.id]);

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        {/* ─── FIXED HEADER ─── */}
        <Box
          sx={{
            position: "relative",
            px: 4,
            pt: 4,
            pb: 2,
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "#6b7280",
              "&:hover": { background: "#f5f5f5" },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pr: 4 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `${TEAL}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <GroupsIcon sx={{ color: TEAL, fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  color: TEAL,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {role?.role_name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#888" }}>
                Staff assigned to this role
              </Typography>
            </Box>
          </Box>

          {role?.description && (
            <Typography sx={{ fontSize: 13, color: "#666", mt: 1.5 }}>
              {role.description}
            </Typography>
          )}
        </Box>

        {/* ─── SCROLLABLE MIDDLE ─── */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 4,
            py: 2,
            // Nicer scrollbar
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#cce0e1",
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: TEAL,
            },
            "&::-webkit-scrollbar-track": { background: "transparent" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1.5,
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#555" }}>
              Assigned Staff
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: assignments.length ? TEAL : "#999",
                background: assignments.length ? `${TEAL}15` : "#f5f5f5",
                px: 1,
                py: 0.25,
                borderRadius: 1,
                minWidth: 24,
                textAlign: "center",
              }}
            >
              {assignments.length}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <CircularProgress size={22} sx={{ color: TEAL }} />
            </Box>
          ) : assignments.length === 0 ? (
            <Box
              sx={{
                padding: 3,
                border: "1px dashed #ddd",
                borderRadius: 2,
                textAlign: "center",
                color: "#999",
              }}
            >
              <PersonIcon sx={{ fontSize: 32, color: "#ddd" }} />
              <Typography sx={{ fontSize: 13, fontStyle: "italic", mt: 0.5 }}>
                No staff assigned to this role yet.
              </Typography>
              <Typography sx={{ fontSize: 11, mt: 0.5 }}>
                Assign staff from the Employees screen.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              {assignments.map((a) => (
                <Box
                  key={a.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    padding: "10px 14px",
                    border: "1px solid #eee",
                    borderRadius: 2,
                    transition: "border-color 0.15s, background 0.15s",
                    "&:hover": {
                      borderColor: TEAL,
                      background: "#f9fbfc",
                    },
                  }}
                >
                  <Box
                    sx={{
                      background: "#eaf3f5",
                      color: TEAL,
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <PersonIcon fontSize="small" />
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#1a1a1a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.user_name}
                      </Typography>

                      {a.is_primary === 1 && (
                        <StarIcon
                          sx={{
                            fontSize: 14,
                            color: "#f5b400",
                            flexShrink: 0,
                          }}
                          titleAccess="Primary role"
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
                      }}
                    >
                      {a.user_email}
                      {a.branch ? ` · ${a.branch}` : ""}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* ─── FIXED FOOTER ─── */}
        <Box
          sx={{
            px: 4,
            py: 2,
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
            background: "#fafafa",
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              textTransform: "none",
              color: TEAL,
              borderColor: TEAL,
              "&:hover": {
                borderColor: TEAL,
                background: `${TEAL}10`,
              },
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}