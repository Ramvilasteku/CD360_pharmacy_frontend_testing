// src/redux/store/slices/uiSlice.js
import { createSlice, nanoid } from "@reduxjs/toolkit";

const initialState = {
  sidebarCollapsed: false,
  activeModal: null,
  modalData: null,
  toasts: [],
  dashboardCustomization: {
    hiddenWidgets: [],
    widgetOrder: {},
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    openModal: (state, action) => {
      state.activeModal = action.payload.modal;
      state.modalData = action.payload.data || null;
    },

    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },

    showToast: {
      reducer: (state, action) => {
        state.toasts.push(action.payload);
      },
      prepare: (message, type = "info") => ({
        payload: {
          id: nanoid(),
          message,
          type,
          timestamp: Date.now(),
        },
      }),
    },

    dismissToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    hideWidget: (state, action) => {
      const widgetId = action.payload;
      if (!state.dashboardCustomization.hiddenWidgets.includes(widgetId)) {
        state.dashboardCustomization.hiddenWidgets.push(widgetId);
      }
    },

    showWidget: (state, action) => {
      state.dashboardCustomization.hiddenWidgets =
        state.dashboardCustomization.hiddenWidgets.filter(
          (id) => id !== action.payload
        );
    },

    resetDashboard: (state) => {
      state.dashboardCustomization = initialState.dashboardCustomization;
    },
  },
});

export const {
  toggleSidebar,
  openModal,
  closeModal,
  showToast,
  dismissToast,
  hideWidget,
  showWidget,
  resetDashboard,
} = uiSlice.actions;

export default uiSlice.reducer;