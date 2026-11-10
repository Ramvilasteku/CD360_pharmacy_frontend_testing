// src/redux/store/slices/referenceSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

/* ═══════════════════════════════════════════════════════════════════
   ASYNC THUNKS - Load master data
   ═══════════════════════════════════════════════════════════════════ */

export const loadCategories = createAsyncThunk(
  "reference/loadCategories",
  async () => {
    const response = await axios.get(
      `${API_BASE}/api/pharmacy/categories`,
      { withCredentials: true }
    );
    return response.data;
  }
);

export const loadSuppliers = createAsyncThunk(
  "reference/loadSuppliers",
  async () => {
    const response = await axios.get(
      `${API_BASE}/api/pharmacy/suppliers`,
      { withCredentials: true }
    );
    return response.data;
  }
);

export const loadCustomers = createAsyncThunk(
  "reference/loadCustomers",
  async () => {
    const response = await axios.get(
      `${API_BASE}/api/pharmacy/customer-pos`,
      { withCredentials: true }
    );
    return response.data;
  }
);

/* ═══════════════════════════════════════════════════════════════════
   SLICE
   ═══════════════════════════════════════════════════════════════════ */

const initialState = {
  categories: [],
  suppliers: [],
  customers: [],
  medicineCatalog: [],
  loading: {
    categories: false,
    suppliers: false,
    customers: false,
    medicineCatalog: false,
  },
  lastFetched: {
    categories: null,
    suppliers: null,
    customers: null,
    medicineCatalog: null,
  },
};

const referenceSlice = createSlice({
  name: "reference",
  initialState,
  reducers: {
    invalidate: (state, action) => {
      const key = action.payload;
      if (state.lastFetched[key] !== undefined) {
        state.lastFetched[key] = null;
      }
    },
    invalidateAll: (state) => {
      Object.keys(state.lastFetched).forEach((key) => {
        state.lastFetched[key] = null;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      /* ─── Categories ─── */
      .addCase(loadCategories.pending, (state) => {
        state.loading.categories = true;
      })
      .addCase(loadCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.loading.categories = false;
        state.lastFetched.categories = Date.now();
      })
      .addCase(loadCategories.rejected, (state) => {
        state.loading.categories = false;
      })

      /* ─── Suppliers ─── */
      .addCase(loadSuppliers.pending, (state) => {
        state.loading.suppliers = true;
      })
      .addCase(loadSuppliers.fulfilled, (state, action) => {
        state.suppliers = action.payload;
        state.loading.suppliers = false;
        state.lastFetched.suppliers = Date.now();
      })
      .addCase(loadSuppliers.rejected, (state) => {
        state.loading.suppliers = false;
      })

      /* ─── Customers ─── */
      .addCase(loadCustomers.pending, (state) => {
        state.loading.customers = true;
      })
      .addCase(loadCustomers.fulfilled, (state, action) => {
        state.customers = action.payload;
        state.loading.customers = false;
        state.lastFetched.customers = Date.now();
      })
      .addCase(loadCustomers.rejected, (state) => {
        state.loading.customers = false;
      });
  },
});

export const { invalidate, invalidateAll } = referenceSlice.actions;
export default referenceSlice.reducer;