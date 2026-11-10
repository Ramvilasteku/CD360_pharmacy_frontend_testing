import React, { useState } from "react";
import { useSelector } from "react-redux";

import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";

import { alpha, useTheme } from "@mui/material/styles";

import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";

import axios from "axios";

import { normaliseRoles, roleHome } from "./shellNav";

const API_BASE = process.env.REACT_APP_SITE_URL || "";

const SWITCH_URL = `${API_BASE}/api/pharmacy/account/switch-role`;
const SWITCH_SIGNAL = "caredesk:role-switched";

/* Store the same access information used during login */
function storeAccess(user, roleKey) {
  const set = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      // Server cookie still maintains the active role.
    }
  };

  set("role", roleKey);
  set("activeRole", roleKey);

  if (user.modules) {
    set("modules", JSON.stringify(user.modules));
  }

  if (user.features) {
    set("features", JSON.stringify(user.features));
  }

  if (user.permissions) {
    set("permissions", JSON.stringify(user.permissions));
  }

  if (user.adminModules) {
    set("adminModules", JSON.stringify(user.adminModules));
  }

  if (user.roles) {
    set("roles", JSON.stringify(user.roles));
  }

  if (user.branch !== undefined) {
    set("branch", user.branch || "");
  }
}

export default function RoleSwitcher({
  compact = false,
  onDark = false,
}) {
  const theme = useTheme();

  const rolesRaw = useSelector((state) => state.auth?.roles);

  const current = useSelector(
    (state) => state.auth?.activeRole || state.auth?.role
  );

  const roles = normaliseRoles(rolesRaw);

  const [anchor, setAnchor] = useState(null);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const currentRole = roles.find(
    (role) => role.role_key === current
  ) || {
    role_key: current,
    role_name: current,
  };

  if (roles.length < 2) {
    return null;
  }

  const handleMenuOpen = (event) => {
    setAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchor(null);
  };

  const handleRoleSelect = (role) => {
    handleMenuClose();

    if (role.role_key !== current) {
      setError(null);
      setTarget(role);
    }
  };

  const handleCancel = () => {
    if (!busy) {
      setTarget(null);
      setError(null);
    }
  };

  /* Confirm and switch the active role */
  const handleConfirm = async () => {
    if (!target || busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await axios.post(
        SWITCH_URL,
        { role: target.role_key },
        { withCredentials: true }
      );

      const user = response.data?.user || {};

      const roleKey =
        user.activeRole || user.role || target.role_key;

      storeAccess(user, roleKey);

      // Notify other browser tabs about the role change.
      try {
        localStorage.setItem(
          SWITCH_SIGNAL,
          String(Date.now())
        );
      } catch (_) {
        // Other tabs will update on their next load.
      }

      // Perform a full reload to clear previous role screens and caches.
      window.location.assign(
        roleHome(roleKey, user.modules)
      );
    } catch (err) {
      setBusy(false);

      setError(
        err?.response?.data?.message ||
          "Couldn't switch role. Please try again."
      );
    }
  };

  const primaryTextColor = onDark
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary;

  return (
    <>
      {/* Role Switcher Button */}
      <ButtonBase
        onClick={handleMenuOpen}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={`Current role: ${currentRole.role_name}. Switch role`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minHeight: 42,
          px: compact ? 1.25 : 1.5,
          py: compact ? 0.5 : 0.75,
          borderRadius: 2,
          border: "1px solid",
          borderColor: onDark
            ? alpha(primaryTextColor, anchor ? 0.4 : 0.2)
            : anchor
              ? "primary.main"
              : "divider",
          backgroundColor: onDark
            ? alpha(primaryTextColor, anchor ? 0.12 : 0.06)
            : "background.paper",
          color: primaryTextColor,
          textAlign: "left",
          flexShrink: 0,
          transition: "all 0.2s ease",

          "&:hover": {
            backgroundColor: onDark
              ? alpha(primaryTextColor, 0.14)
              : alpha(theme.palette.primary.main, 0.06),
            borderColor: "primary.main",
          },
        }}
      >
        <SwapHorizOutlinedIcon
          sx={{
            fontSize: 19,
            color: onDark ? "inherit" : "primary.main",
          }}
        />

        {compact ? (
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Switch Role
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              minWidth: 0,
            }}
          >
                       {/* Current Role Details */}
            <Box
              sx={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 0.3,
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: onDark
                    ? alpha(primaryTextColor, 0.65)
                    : "text.secondary",
                }}
              >
                Current Role
              </Typography>

              <Typography
                noWrap
                title={currentRole.role_name}
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  maxWidth: 140,
                  color: onDark ? "#FFFFFF" : "#173B3D",
                }}
              >
                {currentRole.role_name}
              </Typography>
            </Box>
          </Box>
        )}

        <ExpandMoreIcon
          sx={{
            fontSize: 19,
            color: onDark
              ? alpha(primaryTextColor, 0.8)
              : "text.secondary",
            transition: "transform 0.2s ease",
            transform: anchor ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </ButtonBase>

      {/* Available Roles Menu */}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 230,
            borderRadius: 2,
            p: 0.75,
            boxShadow: "0px 8px 30px rgba(0,0,0,0.10)",
            border: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Typography
          sx={{
            px: 1.5,
            py: 1,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.09em",
            color: "text.secondary",
          }}
        >
          SWITCH ROLE
        </Typography>

        {roles.map((role) => {
          const isActive = role.role_key === current;

          return (
            <MenuItem
              key={role.role_key}
              selected={isActive}
              onClick={() => handleRoleSelect(role)}
              sx={{
                minHeight: 42,
                borderRadius: 1.5,
                px: 1.5,
                gap: 1,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,

                "&.Mui-selected": {
                  backgroundColor: "rgba(3,151,158,0.09)",
                },

                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(3,151,158,0.14)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: "24px !important",
                  color: "primary.main",
                }}
              >
                {isActive && (
                  <CheckIcon sx={{ fontSize: 18 }} />
                )}
              </ListItemIcon>

              <Box sx={{ flex: 1 }}>
                {role.role_name}
              </Box>

              {!!Number(role.is_primary) && (
                <Box
                  component="span"
                  sx={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "text.secondary",
                    backgroundColor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.25,
                  }}
                >
                  Primary
                </Box>
              )}
            </MenuItem>
          );
        })}
      </Menu>

      {/* Role Switch Confirmation */}
      <Dialog
        open={Boolean(target)}
        onClose={handleCancel}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 0.5,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: 17,
            fontWeight: 800,
            pb: 1,
          }}
        >
          Switch to {target?.role_name}?
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              fontSize: 13.5,
              lineHeight: 1.7,
              color: "text.secondary",
            }}
          >
            You are about to switch to the{" "}
            <Box
              component="span"
              sx={{
                fontWeight: 700,
                color: "text.primary",
              }}
            >
              {target?.role_name}
            </Box>{" "}
            dashboard.

            Any unsaved changes on your current page will be lost.
          </Typography>

          {error && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{
                mt: 2,
                borderRadius: 2,
                fontSize: 13,
              }}
            >
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            gap: 1,
          }}
        >
          <Button
            onClick={handleCancel}
            disabled={busy}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disableElevation
            onClick={handleConfirm}
            disabled={busy}
            startIcon={
              busy ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : (
                <SwapHorizOutlinedIcon />
              )
            }
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              px: 2,
            }}
          >
            {busy ? "Switching..." : "Switch Role"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}