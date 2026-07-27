import { configureStore } from "@reduxjs/toolkit";
import ipdReducer from "./slices/ipdSlice";

export const store = configureStore({
  reducer: {
    ipd: ipdReducer,
  },
});