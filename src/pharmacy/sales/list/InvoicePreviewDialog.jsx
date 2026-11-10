// src/components/pharmacy/sales/list/InvoicePreviewDialog.jsx
//
// Centered modal invoice preview. Features:
//   - Fetches lightweight data from GET /:id/view
//   - Shows pharmacy header, customer, items table, totals
//   - Download PDF button → generates PDF client-side
//   - Print button → native browser print
//   - Lazy-loaded (so the main bundle stays small)

import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  Dialog, DialogContent, IconButton, Box, Stack, Typography, Button,
  CircularProgress, Divider, Alert, Chip, Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import { generateInvoicePdf } from "../utils/generateInvoicePdf";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(String(s).replace(" ", "T"));
  return isNaN(d) ? "—" : d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

export default function InvoicePreviewDialog({ open, saleId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  // ─── Fetch lightweight view data ───
  useEffect(() => {
    if (!open || !saleId) return;

    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);

    (async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_URL}/api/pharmacy/sales/${saleId}/view`,
          { withCredentials: true, signal: controller.signal }
        );
        setData(res.data.data);
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load sale details");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, saleId]);

  // ─── Download PDF (uses full invoice endpoint for GST breakdown) ───
  const handleDownload = useCallback(async () => {
    if (!saleId) return;
    setDownloading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/pharmacy/sales/${saleId}/invoice`,
        { withCredentials: true }
      );
      await generateInvoicePdf(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  }, [saleId]);

  // ─── Print (uses the on-screen content via window.print scoped to a div) ───
  const handlePrint = useCallback(() => {
    const el = printRef.current;
    if (!el) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${data?.sale_number || ""}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { padding: 8px; border-bottom: 1px solid #eee; text-align: left; font-size: 13px; }
            th { background: #f8fafc; }
            .right { text-align: right; }
            .total-row td { font-weight: 700; }
            h2 { margin: 0 0 4px; }
            .muted { color: #64748b; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>${el.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [data?.sale_number]);

  const invoice = data;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: "95vh", sm: "90vh" },
        },
      }}
    >
      {/* Header bar */}
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider",
        bgcolor: "background.paper", position: "sticky", top: 0, zIndex: 2,
      }}>
        <Typography variant="h6" fontWeight={700}>
          {invoice?.sale_number ? `Invoice ${invoice.sale_number}` : "Invoice"}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {invoice && (
            <>
              
              <Button
                size="small"
                variant="contained"
                disableElevation
                startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={downloading}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              >
                {downloading ? "Preparing..." : "Download PDF"}
              </Button>
            </>
          )}
          <IconButton onClick={onClose} aria-label="Close" size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

        {invoice && (
          <Box ref={printRef}>
            <InvoiceBody invoice={invoice} />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Invoice body (same markup for screen + print) ───────────── */

function InvoiceBody({ invoice }) {
  return (
    <Box sx={{ color: "text.primary" }}>
      {/* Pharmacy header */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="flex-start">
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={invoice.pharmacy.logo || undefined}
            sx={{ width: 56, height: 56, bgcolor: "primary.main" }}
          >
            <LocalPharmacyIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {invoice.pharmacy.name}
            </Typography>
            {invoice.pharmacy.address && (
              <Typography variant="caption" color="text.secondary" display="block">
                {invoice.pharmacy.address}
              </Typography>
            )}
            {invoice.pharmacy.phone && (
              <Typography variant="caption" color="text.secondary">
                📞 {invoice.pharmacy.phone}
              </Typography>
            )}
          </Box>
        </Stack>

        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
          <Typography variant="caption" color="text.secondary">TAX INVOICE</Typography>
          <Typography fontWeight={700}>{invoice.sale_number}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(invoice.sale_date)}
          </Typography>
          {invoice.is_cancelled && (
            <Chip size="small" label="CANCELLED" color="error" sx={{ mt: 0.5, fontWeight: 700 }} />
          )}
          {invoice.is_returned && (
            <Chip size="small" label="RETURNED" color="warning" sx={{ mt: 0.5, fontWeight: 700 }} />
          )}
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5 }} />

      {/* Customer + payment */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            BILLED TO
          </Typography>
          <Typography fontWeight={600}>{invoice.customer.name}</Typography>
          {invoice.customer.phone && (
            <Typography variant="caption" color="text.secondary">
              {invoice.customer.phone}
            </Typography>
          )}
          {invoice.doctor_name && (
            <Typography variant="caption" color="text.secondary" display="block">
              Dr. {invoice.doctor_name}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, textAlign: { sm: "right" } }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            PAYMENT
          </Typography>
          <Typography fontWeight={600} sx={{ textTransform: "uppercase" }}>
            {invoice.payment.method || "—"}
          </Typography>
          <Chip
            size="small"
            label={invoice.payment.status?.toUpperCase() || "—"}
            color={
              invoice.payment.status === "paid" ? "success"
                : invoice.payment.status === "partial" ? "warning"
                  : "error"
            }
            sx={{ fontWeight: 700 }}
          />
        </Box>
      </Stack>

      {/* Items table */}
      <Box
        component="table"
        sx={{
          width: "100%", borderCollapse: "collapse", mt: 1,
          "& th, & td": { px: 1.25, py: 1, borderBottom: 1, borderColor: "divider", fontSize: 13 },
          "& th": { bgcolor: "action.hover", textAlign: "left", fontWeight: 700, fontSize: 12 },
          "& td.right, & th.right": { textAlign: "right" },
        }}
      >
        <thead>
          <tr>
            <th>#</th>
            <th>Medicine</th>
            <th>Batch</th>
            <th className="right">Qty</th>
            <th className="right">Rate</th>
            <th className="right">GST</th>
            <th className="right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.sl_no}>
              <td>{it.sl_no}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                {(it.strength || it.dosage_form) && (
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    {it.strength} {it.dosage_form}
                  </div>
                )}
              </td>
              <td>
                <div>{it.batch_number || "—"}</div>
                {it.expiry_date && (
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    Exp {formatDate(it.expiry_date).split(",")[0]}
                  </div>
                )}
              </td>
              <td className="right">{it.quantity}</td>
              <td className="right">{money(it.unit_price)}</td>
              <td className="right">{it.gst_pct}%</td>
              <td className="right">{money(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </Box>

      {/* Totals block */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
        <Box sx={{ width: { xs: "100%", sm: 320 } }}>
          <TotalsRow label="Subtotal" value={money(invoice.totals.subtotal)} />
          {invoice.totals.discount > 0 && (
            <TotalsRow
              label="Discount"
              value={`− ${money(invoice.totals.discount)}`}
              valueColor="error.main"
            />
          )}
          <TotalsRow label="Tax (GST)" value={money(invoice.totals.tax)} />
          <Divider sx={{ my: 1 }} />
          <TotalsRow label="Grand Total" value={money(invoice.totals.grand_total)} bold />
          <TotalsRow label="Paid" value={money(invoice.totals.paid)} muted />
          {invoice.totals.due > 0 && (
            <TotalsRow label="Due" value={money(invoice.totals.due)} valueColor="error.main" bold />
          )}
        </Box>
      </Box>

      {invoice.notes && (
        <Box sx={{ mt: 3, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            NOTES
          </Typography>
          <Typography variant="body2">{invoice.notes}</Typography>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3, textAlign: "center" }}>
        Served by {invoice.sold_by} · Thank you for your purchase
      </Typography>
    </Box>
  );
}

function TotalsRow({ label, value, bold, muted, valueColor }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      sx={{ py: 0.5, color: muted ? "text.secondary" : "text.primary" }}
    >
      <Typography variant="body2" fontWeight={bold ? 700 : 500}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={bold ? 700 : 500}
        sx={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
