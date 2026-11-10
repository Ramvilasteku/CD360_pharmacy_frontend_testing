// src/components/pharmacy/reports/sales/TransactionsTable.jsx
// All transactions paged at 10/page. Per-row icons open invoice + receipt PDFs.

import React, { useState } from "react";
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Typography, Chip, Pagination, Stack, IconButton, Tooltip,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { money, fmtDate } from "./formatters";

const PAGE_SIZE = 10;
const API = process.env.REACT_APP_URL;

const statusColor = {
  completed: "success",
  cancelled: "default",
  returned: "warning",
  partially_returned: "warning",
  draft: "info",
  pending: "info",
};

const openPdf = (id, kind) => {
  window.open(`${API}/api/pharmacy/sales-reports/${id}/${kind}/pdf`, "_blank");
};

export default function TransactionsTable({ rows = [] }) {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Paper elevation={0}
      sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ p: 2, pb: 1 }}>
        Transactions ({total.toLocaleString("en-IN")})
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell sx={{ fontWeight: 700 }}>SALE #</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>CUSTOMER</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>TOTAL</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>PAID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>METHOD</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>DOCS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center"
                  sx={{ py: 4, color: "text.secondary" }}>
                  No transactions
                </TableCell>
              </TableRow>
            ) : paged.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{t.sale_number}</TableCell>
                <TableCell>{fmtDate(t.sale_date)}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {t.customer_name || "Walk-in"}
                  </Typography>
                  {t.customer_phone && (
                    <Typography variant="caption" color="text.secondary">
                      {t.customer_phone}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {money(t.grand_total)}
                </TableCell>
                <TableCell align="right">{money(t.paid_amount)}</TableCell>
                <TableCell>
                  <Chip label={t.payment_method} size="small" variant="outlined"
                    sx={{ textTransform: "capitalize", height: 20, fontSize: 11 }} />
                </TableCell>
                <TableCell>
                  <Chip label={t.status} size="small"
                    color={statusColor[t.status] || "default"}
                    sx={{ textTransform: "capitalize", height: 20, fontSize: 11 }} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Invoice PDF">
                    <IconButton size="small" onClick={() => openPdf(t.id, "invoice")}>
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Receipt PDF">
                    <IconButton size="small" onClick={() => openPdf(t.id, "receipt")}>
                      <ReceiptIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {total > PAGE_SIZE && (
        <Stack direction="row" justifyContent="center" sx={{ py: 2 }}>
          <Pagination
            count={Math.ceil(total / PAGE_SIZE)} page={page}
            onChange={(_, v) => setPage(v)}
            shape="rounded" color="primary"
          />
        </Stack>
      )}
    </Paper>
  );
}