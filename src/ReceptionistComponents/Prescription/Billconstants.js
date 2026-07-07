// billConstants.js
// Shared MUI sx style objects + static section metadata used across
// AddBillModal.jsx, EditableCostTable.jsx, AddItemForm.jsx, SectionHeader.jsx, SectionNav.jsx
//
// Note: these are MUI `sx` objects, not plain CSS. `sx` is resolved by MUI's
// styled-engine at render time and can't live in a real .css file the way
// class-based styles can — this file is the closest equivalent (a single
// shared source of style objects) without breaking the MUI theming.

import { COLORS } from "../Themes";

export const fieldSx = {
  "& .MuiInputBase-root": { height: 30, border: `2px solid ${COLORS.primary}` },
  "& fieldset": { border: "none" },
};

export const costInputSx = {
  width: 100,
  "& .MuiInputBase-root": { height: 30, fontSize: 13 },
  "& fieldset": { border: "1px solid #ccc" },
};

export const editInputSx = {
  width: 80,
  "& .MuiInputBase-root": { height: 28, fontSize: 12 },
  "& fieldset": { border: "1px solid #aaa" },
};

export const addInputSx = {
  "& .MuiInputBase-root": {
    height: 44,
    fontSize: 13,
    borderRadius: "8px",
    boxSizing: "border-box",
  },
  "& .MuiOutlinedInput-input": {
    padding: "10px 12px",
  },
};
export const labelSx = {
  color: COLORS.primary,
  mb: 0.5,
  fontWeight: 500,
};

export const SECTION_META = {
  consultations: { label: "Consultation Fees", icon: "📋" },
  medicines:     { label: "Medicines",         icon: "💊" },
  tests:         { label: "Tests",             icon: "🔬" },
};