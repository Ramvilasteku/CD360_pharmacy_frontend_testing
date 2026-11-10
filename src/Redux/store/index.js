// src/redux/store/index.js

import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

/* ═══════════════════════════════════════════════════════════════════
   IMPORT ALL SLICE REDUCERS
   Add new slices here when you create them
   ═══════════════════════════════════════════════════════════════════ */

import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import referenceReducer from "./slices/referenceSlice";
import posReducer from "./slices/posSlice";


/* ═══════════════════════════════════════════════════════════════════
   PERSIST CONFIGURATIONS
   
   Persistence strategy:
   - auth   → localStorage (survives refresh - user stays logged in)
   - pos    → localStorage (cart survives refresh - customer doesn't lose it)
   - ui     → NOT persisted (session only - modals shouldn't reopen)
   - reference → NOT persisted (fetched fresh - master data may change)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Auth persist config
 * Only stores essential auth data - NOT loading/error states
 */
const authPersistConfig = {
  key: "caredesk-auth",
  storage,
  version: 1,
  whitelist: [
  "user",
  "role",
  "activeRole",
  "primaryRole",       // ⭐ ADD
  "userType",          // ⭐ ADD
  "plan_type",
  "permissions",
  "modules",
  "features",          // ⭐ ADD ← CRITICAL for sidebar
  "roles",             // ⭐ ADD
  "adminModules",      // ⭐ ADD
  "isAuthenticated",
],
  // Migrate old data if structure changes
  migrate: (state) => {
    // If old version, clear it to force fresh login
    if (!state?._persist?.version || state._persist.version < 1) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(state);
  },
};

/**
 * POS persist config
 * Cart data survives page refresh - prevents cashier losing work
 */
const posPersistConfig = {
  key: "caredesk-pos",
  storage,
  version: 1,
  whitelist: ["cart", "heldSales", "selectedCustomer"],
};


/* ═══════════════════════════════════════════════════════════════════
   ROOT REDUCER
   Combine all slice reducers with persistence where needed
   ═══════════════════════════════════════════════════════════════════ */

const appReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  ui: uiReducer,
  reference: referenceReducer,
  pos: persistReducer(posPersistConfig, posReducer),
});

/**
 * Root reducer with reset capability
 * When user logs out, we want to clear ALL Redux state
 * Not just auth
 */
const rootReducer = (state, action) => {
  // Special action - reset entire store
  if (action.type === "RESET_STORE") {
    // Clear persisted storage too
    storage.removeItem("persist:caredesk-auth");
    storage.removeItem("persist:caredesk-pos");
    return appReducer(undefined, action);
  }
  
  return appReducer(state, action);
};


/* ═══════════════════════════════════════════════════════════════════
   STORE CONFIGURATION
   ═══════════════════════════════════════════════════════════════════ */

export const store = configureStore({
  reducer: rootReducer,
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions contain non-serializable data
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
        ],
        // Ignore these paths in state for serialization check
        ignoredPaths: ["_persist"],
      },
      // Disable immutable check in production for performance
      immutableCheck: process.env.NODE_ENV !== "production",
    }),
  
  // Redux DevTools - only in development
  devTools: process.env.NODE_ENV !== "production" && {
    name: "CareDesk360",
    trace: true,
    traceLimit: 25,
  },
});


/* ═══════════════════════════════════════════════════════════════════
   PERSISTOR
   Handles the rehydration of persisted state on app boot
   ═══════════════════════════════════════════════════════════════════ */

export const persistor = persistStore(store, null, () => {
  // Callback when rehydration completes
  if (process.env.NODE_ENV !== "production") {
    console.log("[Redux] Store rehydrated from localStorage");
  }
});


/* ═══════════════════════════════════════════════════════════════════
   HELPER: Reset entire store (used on logout)
   Dispatches special action that clears everything
   ═══════════════════════════════════════════════════════════════════ */

export const resetStore = () => ({ type: "RESET_STORE" });


/* ═══════════════════════════════════════════════════════════════════
   HELPER: Purge persisted storage manually
   Useful for testing or "logout everywhere" feature
   ═══════════════════════════════════════════════════════════════════ */

export const purgePersistedState = async () => {
  await persistor.purge();
  await persistor.flush();
};


/* ═══════════════════════════════════════════════════════════════════
   TYPE HELPERS (JSDoc for IDE autocomplete without TypeScript)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * @typedef {ReturnType<typeof store.getState>} RootState
 * @typedef {typeof store.dispatch} AppDispatch
 */