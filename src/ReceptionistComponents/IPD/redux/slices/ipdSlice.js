import { createSlice } from "@reduxjs/toolkit";

const ipdSlice = createSlice({
  name: "ipd",
  initialState: {
    dischargedPatients: {},
    ipdDataLoaded: false, // renamed for clarity
  },
  reducers: {
    setDischargedPatients: (state, action) => {
      state.dischargedPatients = action.payload;
      state.ipdDataLoaded = true;
    },
    addDischargedPatient: (state, action) => {
      state.dischargedPatients[action.payload] = true;
    },
    removeDischargedPatient: (state, action) => {
      delete state.dischargedPatients[action.payload];
    },
  },
});

export const {
  setDischargedPatients,
  addDischargedPatient,
  removeDischargedPatient,
} = ipdSlice.actions;

export default ipdSlice.reducer;