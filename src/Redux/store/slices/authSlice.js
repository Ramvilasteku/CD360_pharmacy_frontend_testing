// src/Redux/store/slices/authSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = process.env.REACT_APP_URL || "http://localhost:5000";

/* ═══════════════════════════════════════════════════════════════════
   ASYNC THUNKS
   ═══════════════════════════════════════════════════════════════════ */


export const refreshAccess = createAsyncThunk(
  "auth/refreshAccess",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/getMyAccess`,
        { withCredentials: true }
      );
      return res.data.user || res.data;   // ⭐ ADD .user — matches verifyOtp pattern
    } catch (err) {
      return rejectWithValue(err.response?.data);
    }
  }
);

export const loadSession = createAsyncThunk(
  "auth/loadSession",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE}/api/auth/me`, {
        withCredentials: true,
      });
      return response.data.user || response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Session expired");
    }
  }
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ otp }, { rejectWithValue }) => {       // ← only otp
    try {
      const response = await axios.post(
        `${API_BASE}/verify-otp`,                  // ← match server.js
        { otp },                                    // ← only otp
        { withCredentials: true }
      );
      return response.data.user || response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "OTP verification failed");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await axios.post(`${API_BASE}/api/auth/logout`, {}, { withCredentials: true });
      return true;
    } catch (err) {
      return rejectWithValue("Logout failed");
    }
  }
);


/* ═══════════════════════════════════════════════════════════════════
    COMPLETE INITIAL STATE — every field the backend returns
   ═══════════════════════════════════════════════════════════════════ */

const initialState = {
  /* User identity */
  user: null,
  userType: null,           // "admin" | "staff" | "client"
  
  /* Role information */
  role: null,               // Legacy field
  activeRole: null,         // Current active role
  primaryRole: null,        // Primary role (from is_primary=1)
  roles: [],                // All assigned roles [{role_id, role_key, role_name, is_primary}]
  
  /* Plan / licensing */
  plan_type: null,          // "pharmacy" | "clinic" | "hospital"
  adminModules: [],         // What the tenant is licensed for
  
  /* Access data */
  modules: [],              // Modules assigned to user's role (intersected with adminModules)
  features: [],             // NEW: Features from role_features
  permissions: [],          // Permissions from role_permissions
  
  /* Session state */
  isAuthenticated: false,
  loading: false,
  error: null,
  lastLoggedIn: null,
};


/* ═══════════════════════════════════════════════════════════════════
   HELPER: Sync all fields to localStorage
   ═══════════════════════════════════════════════════════════════════ */

const syncToLocalStorage = (payload) => {
  try {
    localStorage.setItem("role",         payload.role || "");
    localStorage.setItem("userType",     payload.userType || "staff");
    localStorage.setItem("plan_type",    payload.plan_type || "");
    localStorage.setItem("activeRole",   payload.activeRole  || payload.role || "");
    localStorage.setItem("primaryRole",  payload.primaryRole || payload.role || "");
    localStorage.setItem("modules",      JSON.stringify(payload.modules      || []));
    localStorage.setItem("features",     JSON.stringify(payload.features     || []));
    localStorage.setItem("permissions",  JSON.stringify(payload.permissions  || []));
    localStorage.setItem("adminModules", JSON.stringify(payload.adminModules || []));
    localStorage.setItem("roles",        JSON.stringify(payload.roles || []));
  } catch (err) {
    console.error("Failed to sync auth to localStorage:", err);
  }
};

/* Populate state from payload */
const applyAccessPayload = (state, payload) => {
  state.user         = { id: payload.id, name: payload.name };
  state.userType     = payload.userType || null;
  state.role         = payload.role || null;
  state.activeRole   = payload.activeRole  || payload.role || null;
  state.primaryRole  = payload.primaryRole || payload.role || null;
  state.roles        = payload.roles || [];
  state.plan_type    = payload.plan_type || null;
  state.modules      = payload.modules || [];
  state.features     = payload.features || [];       // NEW
  state.permissions  = payload.permissions || [];
  state.adminModules = payload.adminModules || [];
  state.isAuthenticated = true;
  state.lastLoggedIn = Date.now();
};


/* ═══════════════════════════════════════════════════════════════════
   SLICE
   ═══════════════════════════════════════════════════════════════════ */

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },

    updateModules: (state, action) => {
      state.modules = action.payload;
      localStorage.setItem("modules", JSON.stringify(action.payload));
    },

    updatePermissions: (state, action) => {
      state.permissions = action.payload;
      localStorage.setItem("permissions", JSON.stringify(action.payload));
    },

    updateFeatures: (state, action) => {                // NEW
      state.features = action.payload;
      localStorage.setItem("features", JSON.stringify(action.payload));
    },


     updateAccessFromRefresh: (state, action) => {
      const { 
        permissions, 
        modules, 
        features, 
        adminModules, 
        roles, 
        activeRole, 
        primaryRole 
      } = action.payload;
      
      // Only update if value provided (defensive)
      if (permissions) state.permissions = permissions;
      if (modules) state.modules = modules;
      if (features) state.features = features;
      if (adminModules) state.adminModules = adminModules;
      if (roles) state.roles = roles;
      if (activeRole) state.activeRole = activeRole;
      if (primaryRole) state.primaryRole = primaryRole;
      
      // Keep localStorage in sync for backward compat
      try {
        if (permissions) localStorage.setItem("permissions", JSON.stringify(permissions));
        if (modules) localStorage.setItem("modules", JSON.stringify(modules));
        if (features) localStorage.setItem("features", JSON.stringify(features));
        if (adminModules) localStorage.setItem("adminModules", JSON.stringify(adminModules));
        if (roles) localStorage.setItem("roles", JSON.stringify(roles));
      } catch (e) {
        console.warn("localStorage update failed:", e);
      }
    },
  


    /* ═══════════════════════════════════════════════════════════
        COMPLETE bootstrap — reads ALL fields from localStorage
       Called on app boot for INSTANT display
       ═══════════════════════════════════════════════════════════ */
    bootstrapFromLocalStorage: (state) => {
      try {
        const storedRole      = localStorage.getItem("role");
        const storedUserType  = localStorage.getItem("userType");
        const storedPlanType  = localStorage.getItem("plan_type");
        const storedName      = localStorage.getItem("adminName") || localStorage.getItem("userName");
        const storedId        = localStorage.getItem("adminId")   || localStorage.getItem("userId");
        const storedActive    = localStorage.getItem("activeRole");
        const storedPrimary   = localStorage.getItem("primaryRole");

        const storedModules      = JSON.parse(localStorage.getItem("modules")      || "[]");
        const storedFeatures     = JSON.parse(localStorage.getItem("features")     || "[]");   //  NEW
        const storedPermissions  = JSON.parse(localStorage.getItem("permissions")  || "[]");
        const storedAdminModules = JSON.parse(localStorage.getItem("adminModules") || "[]");
        const storedRoles        = JSON.parse(localStorage.getItem("roles")        || "[]");

        if (storedRole || storedId) {
          state.user         = { id: storedId, name: storedName };
          state.role         = storedRole;
          state.userType     = storedUserType;
          state.plan_type    = storedPlanType || null;
          state.activeRole   = storedActive  || storedRole;
          state.primaryRole  = storedPrimary || storedRole;
          state.modules      = storedModules;
          state.features     = storedFeatures;              //  NEW
          state.permissions  = storedPermissions;
          state.adminModules = storedAdminModules;
          state.roles        = storedRoles;
          state.isAuthenticated = true;
        }
      } catch (err) {
        console.error("Failed to bootstrap auth from localStorage:", err);
      }
    },
  },

  extraReducers: (builder) => {
  builder
    /* ─── loadSession ─── */
    .addCase(loadSession.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(loadSession.fulfilled, (state, action) => {
      state.loading = false;
      applyAccessPayload(state, action.payload);
      syncToLocalStorage(action.payload);
    })
    .addCase(loadSession.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.error = action.payload;
    })

    /* ─── verifyOtp ─── */
    .addCase(verifyOtp.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(verifyOtp.fulfilled, (state, action) => {
      state.loading = false;
      applyAccessPayload(state, action.payload);
      syncToLocalStorage(action.payload);
    })
    .addCase(verifyOtp.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })

    /* ─── refreshAccess (polling) ─── */
    .addCase(refreshAccess.pending, (state) => {
      // Don't set loading true — polling should be silent
    })
    .addCase(refreshAccess.fulfilled, (state, action) => {         // ← NEW VERSION
      const payload = action.payload;
      
      // GUARD: don't overwrite good data with empty response
      if (!payload || (!payload.modules?.length && !payload.features?.length)) {
        console.warn("[refreshAccess] Empty payload — keeping existing state");
        return;
      }
      
      applyAccessPayload(state, payload);
      syncToLocalStorage(payload);
    })
    .addCase(refreshAccess.rejected, (state, action) => {
      // Silent failure — don't clear session, just log
      console.warn("[refreshAccess] Failed to refresh:", action.payload);
    })

    /* ─── logout ─── */
    .addCase(logoutUser.fulfilled, () => {
      localStorage.clear();
      return initialState;
    });
},
});

export const {
  clearError,
  updateModules,
  updatePermissions,
  updateFeatures,                        
  bootstrapFromLocalStorage,
} = authSlice.actions;

export default authSlice.reducer;