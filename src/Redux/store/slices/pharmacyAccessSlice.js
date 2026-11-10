// src/redux/slices/pharmacyAccessSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
// import { updateAccessFromRefresh } from "./authSlice"; 
//  NEW — use the three real actions
import {
  updateFeatures,
  updateModules,
  updatePermissions,
} from "./authSlice";
export const fetchPharmacyAccess = createAsyncThunk(
  "pharmacyAccess/fetch",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/getMyAccess`,   // ⭐ Correct URL
        { withCredentials: true }
      );

      const u = res.data.user;

      // ⭐ Sync fresh data to auth slice (so usePermission hook sees it)
      // ✅ NEW — dispatch each slice individually
dispatch(updatePermissions(u.permissions || []));
dispatch(updateModules(u.modules || []));
dispatch(updateFeatures(u.features || []));
      // Return data for pharmacyAccess slice itself
      const pharmacyMods = (u.modules || []).filter(
        (m) => m === "pharmacy" || m.startsWith("pharmacy_")
      );

      return {
        hasPharmacyAccess: pharmacyMods.length > 0 || u.role === "admin",
        pharmacySubModules: pharmacyMods,
        permissions: u.permissions || [],
        role: u.role,
        userType: u.userType,
        lastFetched: Date.now(),
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Fetch failed");
    }
  }
);

const pharmacyAccessSlice = createSlice({
  name: "pharmacyAccess",
  initialState: {
    hasPharmacyAccess: false,
    pharmacySubModules: [],
    permissions: [],
    role: null,
    userType: null,
    loading: false,
    error: null,
    lastFetched: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPharmacyAccess.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPharmacyAccess.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
      })
      .addCase(fetchPharmacyAccess.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default pharmacyAccessSlice.reducer;