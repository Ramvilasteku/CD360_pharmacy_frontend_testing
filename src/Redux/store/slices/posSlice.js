// src/redux/store/slices/posSlice.js

import { createSlice, nanoid } from "@reduxjs/toolkit";

/**
 * ═══════════════════════════════════════════════════════════════════
 * POS SLICE - Point of Sale Cart State
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Manages the current sale being built by cashier:
 * - Cart items (medicine + batch + quantity)
 * - Selected customer
 * - Doctor name (mandatory for prescription drugs)
 * - Payment info
 * - Held sales (parked sales for later)
 * 
 * Persisted to localStorage so cashier doesn't lose work on refresh
 * ═══════════════════════════════════════════════════════════════════
 */

const initialState = {
  // Current cart being built
  cart: {
    items: [],
    customer_id: null,
    customer_type: "walk_in",     // 'walk_in' | 'registered' | 'patient'
    customer_name: "",
    customer_phone: "",
    doctor_name: "",              // Mandatory for prescription sales
    prescription_id: null,        // For dispensing flow
    prescription_image: null,     // For POS with Rx photo
    
    // Financial fields (auto-calculated)
    subtotal: 0,
    discount_amount: 0,
    discount_percent: 0,
    tax_amount: 0,
    grand_total: 0,
    
    // Payment
    payment_method: "cash",       // 'cash' | 'card' | 'upi' | 'credit'
    paid_amount: 0,
    due_amount: 0,
    
    // Meta
    remarks: "",
    created_at: null,
  },
  
  // Held sales (parked for later completion)
  heldSales: [],
  
  // Recently used customers (for quick access)
  selectedCustomer: null,
  
  // UI state
  activeMedicineSearch: "",
  scannedBarcode: null,
};


/* ═══════════════════════════════════════════════════════════════════
   HELPER: Recalculate totals from cart items
   ═══════════════════════════════════════════════════════════════════ */

function recalculateTotals(cart) {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + (item.quantity * item.selling_price),
    0
  );
  
  const tax_amount = cart.items.reduce(
    (sum, item) => {
      const itemTotal = item.quantity * item.selling_price;
      return sum + (itemTotal * (item.gst_percent || 0) / 100);
    },
    0
  );
  
  const discount_amount = cart.discount_percent > 0
    ? (subtotal * cart.discount_percent / 100)
    : cart.discount_amount || 0;
  
  const grand_total = subtotal + tax_amount - discount_amount;
  const due_amount = Math.max(0, grand_total - (cart.paid_amount || 0));
  
  return {
    ...cart,
    subtotal: Number(subtotal.toFixed(2)),
    tax_amount: Number(tax_amount.toFixed(2)),
    discount_amount: Number(discount_amount.toFixed(2)),
    grand_total: Number(grand_total.toFixed(2)),
    due_amount: Number(due_amount.toFixed(2)),
  };
}


/* ═══════════════════════════════════════════════════════════════════
   SLICE
   ═══════════════════════════════════════════════════════════════════ */

const posSlice = createSlice({
  name: "pos",
  initialState,
  reducers: {
    /* ─────────────────────────────
       CART ITEM MANAGEMENT
       ───────────────────────────── */
    
    addItem: (state, action) => {
      const { medicine_id, batch_id, medicine_name, batch_number,
              quantity, selling_price, mrp, gst_percent, hsn_code,
              available_stock } = action.payload;
      
      // Check if same medicine+batch already in cart
      const existingIndex = state.cart.items.findIndex(
        (item) => item.medicine_id === medicine_id && 
                  item.batch_id === batch_id
      );
      
      if (existingIndex >= 0) {
        // Increment quantity
        state.cart.items[existingIndex].quantity += quantity;
      } else {
        // Add new item
        state.cart.items.push({
          id: nanoid(),
          medicine_id,
          batch_id,
          medicine_name,
          batch_number,
          quantity,
          selling_price,
          mrp,
          gst_percent: gst_percent || 0,
          hsn_code,
          available_stock,
        });
      }
      
      state.cart = recalculateTotals(state.cart);
    },
    
    updateItemQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.cart.items.find((i) => i.id === id);
      if (item) {
        item.quantity = Math.max(1, quantity);
        state.cart = recalculateTotals(state.cart);
      }
    },
    
    updateItemPrice: (state, action) => {
      const { id, selling_price } = action.payload;
      const item = state.cart.items.find((i) => i.id === id);
      if (item) {
        item.selling_price = Number(selling_price);
        state.cart = recalculateTotals(state.cart);
      }
    },
    
    removeItem: (state, action) => {
      state.cart.items = state.cart.items.filter((i) => i.id !== action.payload);
      state.cart = recalculateTotals(state.cart);
    },
    
    clearCart: (state) => {
      state.cart = initialState.cart;
    },
    
    /* ─────────────────────────────
       CUSTOMER MANAGEMENT
       ───────────────────────────── */
    
    setCustomer: (state, action) => {
      const { customer_id, customer_type, customer_name, customer_phone } = action.payload;
      state.cart.customer_id = customer_id;
      state.cart.customer_type = customer_type;
      state.cart.customer_name = customer_name;
      state.cart.customer_phone = customer_phone;
      state.selectedCustomer = action.payload;
    },
    
    clearCustomer: (state) => {
      state.cart.customer_id = null;
      state.cart.customer_type = "walk_in";
      state.cart.customer_name = "";
      state.cart.customer_phone = "";
      state.selectedCustomer = null;
    },
    
    /* ─────────────────────────────
       DOCTOR & PRESCRIPTION
       ───────────────────────────── */
    
    setDoctor: (state, action) => {
      state.cart.doctor_name = action.payload;
    },
    
    setPrescription: (state, action) => {
      const { prescription_id, prescription_image } = action.payload;
      state.cart.prescription_id = prescription_id;
      state.cart.prescription_image = prescription_image;
    },
    
    /* ─────────────────────────────
       DISCOUNT
       ───────────────────────────── */
    
    setDiscount: (state, action) => {
      const { type, value } = action.payload;
      if (type === "percent") {
        state.cart.discount_percent = Number(value);
        state.cart.discount_amount = 0;
      } else {
        state.cart.discount_amount = Number(value);
        state.cart.discount_percent = 0;
      }
      state.cart = recalculateTotals(state.cart);
    },
    
    /* ─────────────────────────────
       PAYMENT
       ───────────────────────────── */
    
    setPaymentMethod: (state, action) => {
      state.cart.payment_method = action.payload;
    },
    
    setPaidAmount: (state, action) => {
      state.cart.paid_amount = Number(action.payload);
      state.cart = recalculateTotals(state.cart);
    },
    
    setRemarks: (state, action) => {
      state.cart.remarks = action.payload;
    },
    
    /* ─────────────────────────────
       HOLD & RESUME SALES
       ───────────────────────────── */
    
    holdCurrentSale: (state) => {
      if (state.cart.items.length === 0) return;
      
      state.heldSales.push({
        id: nanoid(),
        heldAt: new Date().toISOString(),
        cart: { ...state.cart },
      });
      
      state.cart = initialState.cart;
    },
    
    resumeHeldSale: (state, action) => {
      const heldSale = state.heldSales.find((h) => h.id === action.payload);
      if (heldSale) {
        state.cart = heldSale.cart;
        state.heldSales = state.heldSales.filter((h) => h.id !== action.payload);
      }
    },
    
    deleteHeldSale: (state, action) => {
      state.heldSales = state.heldSales.filter((h) => h.id !== action.payload);
    },
    
    /* ─────────────────────────────
       SEARCH & BARCODE
       ───────────────────────────── */
    
    setSearchQuery: (state, action) => {
      state.activeMedicineSearch = action.payload;
    },
    
    setScannedBarcode: (state, action) => {
      state.scannedBarcode = action.payload;
    },
  },
});

export const {
  addItem,
  updateItemQuantity,
  updateItemPrice,
  removeItem,
  clearCart,
  setCustomer,
  clearCustomer,
  setDoctor,
  setPrescription,
  setDiscount,
  setPaymentMethod,
  setPaidAmount,
  setRemarks,
  holdCurrentSale,
  resumeHeldSale,
  deleteHeldSale,
  setSearchQuery,
  setScannedBarcode,
} = posSlice.actions;

export default posSlice.reducer;