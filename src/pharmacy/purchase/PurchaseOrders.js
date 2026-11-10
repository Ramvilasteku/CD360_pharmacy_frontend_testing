// src/pages/pharmacy/PurchaseOrders.js
//
// Every purchase order in one place, and the two things you do with them:
//   Generate PO     raise orders from the below-reorder-level suggestions
//   Receive stock   book a delivery in (an uploaded supplier invoice, or against an order)
// Both sit at the right of the heading. Each shows only if the role may use it.
//
// Orders that are still waiting for their delivery carry a "Receive" shortcut, which
// opens the Receive screen with that order already chosen. Opening any order shows its
// payments, which can be recorded, edited or removed right there. The order opens IN the
// page (Back arrow), not as a popup; this header steps aside while it is open, and the list
// behind it keeps its page and filters.
//
// A thin shell: the header, then the shared PurchaseOrderList doing all the work — the
// same component the Suppliers screen uses for one supplier's history, so the two can
// never drift apart.
//
// The page never scrolls. It measures where it starts and fills the rest of the
// window; only the order rows scroll, inside the list.
//
// Needs pharmacy.purchase.view.   Buttons: pharmacy.purchase.create (Generate PO),
// pharmacy.purchase.receive (Receive stock).

import { ColorRoot } from "../../theme/appColors";
import React, { useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InventoryOutlinedIcon from "@mui/icons-material/Inventory2Outlined";

import useAccess, { AccessDenied } from "../../hooks/useAccess";
import PurchaseOrderList from "../../pharmacy/purchase/PurchaseOrderList";

const SHELL_HEIGHT = "calc(100dvh - var(--purchase-orders-offset, 0px))";

// Hand-off to the Receive screen: "open with this order already picked". sessionStorage,
// because the Receive screen can sit under three different layouts (pharmacist, receptionist,
// admin) and a URL or router state does not survive all of them. Same key in ReceivePurchaseOrder.
export const RECEIVE_PRESELECT_KEY = "caredesk:receive-po";

/**
 * Measures where this screen actually begins and sizes it to the rest of the
 * window, so it never runs past the bottom and makes the BROWSER scroll.
 * See the same hook in Suppliers.js for the reasoning.
 */
function useFitsWindow(fallback) {
  const ref = useRef(null);
  const lastTop = useRef(-1);
  const [height, setHeight] = useState(fallback);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top));
      // Only react to a real move, or the height we just set feeds back into the
      // next measurement and oscillates.
      if (Math.abs(top - lastTop.current) < 1) return;
      lastTop.current = top;
      setHeight(`calc(100dvh - ${top}px)`);
    };

    measure();
    window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, []);

  return [ref, height];
}

function PurchaseOrdersPage() {
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const { loading: accessLoading, can } = useAccess();
  const navigate = useNavigate();
  const location = useLocation();

  const canView = can("pharmacy.purchase.view");
  const canGenerate = can("pharmacy.purchase.create");
  const canReceive = can("pharmacy.purchase.receive");
  const [viewing, setViewing] = useState(false); // an order is open in the page

  // The sibling screens live next to this one in every layout:
  //   /pharmacy/purchase-orders                    → /pharmacy/receive-purchase-order
  //   /AdminDashboard/pharmacy/purchase-orders     → /AdminDashboard/pharmacy/receive-purchase-order
  // so the target is this URL with its last segment swapped, whichever layout we're in.
  const goTo = (slug) => {
    const next = location.pathname.replace(/purchase-orders\/?$/i, slug);
    navigate(next === location.pathname ? `/pharmacy/${slug}` : next);
  };

  const receiveOrder = (order) => {
    try {
      sessionStorage.setItem(
        RECEIVE_PRESELECT_KEY,
        JSON.stringify({ id: order.id, purchase_number: order.purchase_number })
      );
    } catch {
      /* private mode — the Receive screen simply opens without the order picked */
    }
    goTo("receive-purchase-order");
  };

  if (!accessLoading && !canView) {
    return (
      <Box sx={{ height: shellHeight, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>
        <AccessDenied what="Purchase orders" />
      </Box>
    );
  }

  return (
    <Box
      ref={shellRef}
      sx={{
        height: shellHeight,
        maxHeight:"86vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 2, md: 3 },
          py: { xs: 1.25, md: 1.5 },
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: viewing ? "none" : "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em" }} noWrap>
            Purchase orders
          </Typography>
          <Typography
            sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", lg: "block" } }}
            noWrap
          >
            Everything you have ordered, from every supplier
          </Typography>
        </Box>

        {(canGenerate || canReceive) && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {canReceive && (
              <Button
                variant="outlined"
                startIcon={<InventoryOutlinedIcon />}
                onClick={() => goTo("receive-purchase-order")}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              >
                Receive stock
              </Button>
            )}
            {canGenerate && (
              <Button
                variant="contained"
                disableElevation
                startIcon={<AddIcon />}
                onClick={() => goTo("generate-purchase-order")}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              >
                Generate PO
              </Button>
            )}
          </Stack>
        )}
      </Box>

      <PurchaseOrderList
        showFilters
        inline
        onViewing={setViewing}
        canView={canView}
        title={null}
        onReceive={canReceive ? receiveOrder : undefined}
        emptyTitle="No purchase orders yet"
        emptyHint="Raise one with Generate PO, or receive a delivery and it will appear here."
      />
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js. */
export default function PurchaseOrders() {
  return (
    <ColorRoot>
      <PurchaseOrdersPage />
    </ColorRoot>
  );
}