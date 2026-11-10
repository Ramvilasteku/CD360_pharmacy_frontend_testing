// src/pharmacy/inventory/InventoryBranchFrame.jsx
//
// The branch for an Inventory page reached from the sidebar — added 6 Nov 2026.
//
// Gives the page `branchState` / `branchParams`; it draws NOTHING itself. Each page puts
// <BranchPicker state={branchState} /> in its own filter row (changed 6 Nov evening: the
// separate bar above the page was replaced by the dropdown among the existing filters).
//
// TWO MODES
//   write   Stock Adjustment. The admin's WORKING branch — the same one New sale, Receive
//           and B2B use, remembered on this device. Must be chosen before adjusting.
//   read    Inventory, Stock Ledger, Low Stock. Opens on "All branches" every time; a branch
//           picked here filters this page only and never changes the working branch.
//
// WHO SEES WHAT (BranchPicker)
//   single-branch pharmacy   nothing
//   staff                    their own branch as a chip; the server enforces it regardless
//   admin                    the Branch select
//   branches failed to load  a warning chip with the server's reason

import React from "react";
import { usePharmacyBranch } from "../shared/BranchPicker";

export default function InventoryBranchFrame({ mode = "read", children }) {
  const br = usePharmacyBranch(
    mode === "write" ? { allowAll: false } : { allowAll: true, defaultAll: true }
  );
  return React.isValidElement(children)
    ? React.cloneElement(children, { branchState: br, branchParams: br.params })
    : children;
}