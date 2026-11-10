// src/pharmacy/b2b/B2BSales.js        (route: pharmacy/b2b-sale — see pharmacyRoutes.jsx)
//
// B2B sale: selling to other pharmacies, not only to your own patients or branches.
//
//   New invoice       type or pick the buyer (any pharmacy), add medicines by the STRIP or by SINGLE
//                     TABLETS, issue a GST tax invoice (pharmacy.b2b_sales.create)
//
// Nothing here has its own table: invoices are pharmacy_sales rows, payments are pharmacy_payments
// rows. The buyers you sold to before are offered again when you start the next invoice.
//
// Opening an invoice shows its lines and payments, and downloads or sends it as a PDF.
// Issuing one opens it straight away so the PDF is one click.
//
// The new-invoice form, an opened invoice and the Send screen all open IN the page, in place of the
// list, each with a Back arrow — not as popups. (Small yes/no questions such as "Cancel this
// invoice?" and "Remove this payment?" stay as little popups.)
//
// A thin shell: the header, then the shared B2BInvoiceList doing the work. The page never
// scrolls — it measures where it starts and fills the rest of the window; only the invoice rows
// scroll, inside the list.
//
// Branches: with several branches, staff see their own branch's invoices (a chip shows which); the
// admin can look at all branches or one (<BranchPicker>). The new-invoice form asks the admin which
// branch the stock goes out from.
//
// Needs pharmacy.b2b_sales.view.

import { ColorRoot } from "../../theme/appColors";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Alert, Box, Button, Snackbar, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import useAccess, { AccessDenied } from "../../hooks/useAccess";
import B2BInvoiceList from "./B2BInvoiceList";
import B2BCreateInvoice from "./B2BCreateInvoice";
import B2BInvoiceDialog from "./B2BInvoiceDialog";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";

const SHELL_HEIGHT = "calc(100dvh - var(--b2b-sales-offset, 0px))";

/** Sizes the page to the rest of the window so the BROWSER never scrolls (same hook as Purchase Orders). */
function useFitsWindow(fallback) {
  const ref = useRef(null);
  const lastTop = useRef(-1);
  const [height, setHeight] = useState(fallback);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top));
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

function B2BSalesPage() {
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const { loading: accessLoading, can } = useAccess();
  const br = usePharmacyBranch({ allowAll: true });

  const canView = can("pharmacy.b2b_sales.view");
  const canCreate = can("pharmacy.b2b_sales.create");

  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [justIssued, setJustIssued] = useState(null); // the invoice just made — opened for the PDF
  const [toast, setToast] = useState(null);
  const [viewing, setViewing] = useState(false); // an invoice from the list is open (the list shows it itself)

  // the form and an opened invoice take the place of the list on this page (the list stays
  // mounted behind them, so its filters and page are still there when you come back)
  const covered = creating || !!justIssued;      // the list is hidden behind a full page section
  const headerHidden = covered || viewing;

  if (!accessLoading && !canView) {
    return (
      <Box sx={{ height: shellHeight, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>
        <AccessDenied what="B2B sales" />
      </Box>
    );
  }

  return (
    <Box
      ref={shellRef}
      sx={{
        height: shellHeight,
        maxHeight: "86vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          display: headerHidden ? "none" : "flex",
          flexShrink: 0,
          px: { xs: 2, md: 3 },
          py: { xs: 1.25, md: 1.5 },
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em" }} noWrap>
            B2B sale
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", lg: "block" } }} noWrap>
            Sell strips or single tablets to other pharmacies, with a GST invoice
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          <BranchPicker state={br} />
          {canCreate && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<AddIcon />}
              onClick={() => setCreating(true)}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              New invoice
            </Button>
          )}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: covered ? "none" : "flex", flexDirection: "column" }}>
        <B2BInvoiceList inline canView={canView} reloadKey={reloadKey} onViewing={setViewing} branchParams={br.params} />
      </Box>

      <B2BCreateInvoice
        inline
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(invoice, message) => {
          setCreating(false);
          setReloadKey((k) => k + 1);
          setToast(message || `Invoice ${invoice.invoice_number} issued`);
          setJustIssued(invoice);
        }}
      />

      {/* the invoice just made, ready to download or send */}
      <B2BInvoiceDialog
        inline
        invoice={justIssued}
        onClose={() => setJustIssued(null)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      <Snackbar open={!!toast} autoHideDuration={4500} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js. */
export default function B2BSales() {
  return (
    <ColorRoot>
      <B2BSalesPage />
    </ColorRoot>
  );
}