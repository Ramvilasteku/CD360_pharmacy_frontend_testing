// src/components/pharmacy/sales/utils/generateInvoicePdf.js
//
// Generates a GST-compliant Indian pharmacy invoice as a PDF.
// Uses jsPDF + jspdf-autotable (lightweight, pure client-side, no server load).
//
// npm install jspdf jspdf-autotable
//
// Takes the FULL invoice data returned by GET /:id/invoice (not the lightweight view).

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

const safe = (v, fallback = "—") => (v == null || v === "" ? fallback : String(v));

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(String(s).replace(" ", "T"));
  return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/**
 * Generate and trigger download of a PDF invoice.
 * @param {object} invoice — the data payload from GET /:id/invoice
 */
export async function generateInvoicePdf(invoice) {
  // A4 portrait, mm units
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 15;

  // ─── Header: Pharmacy name + invoice meta ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(safe(invoice.pharmacy?.name, "Pharmacy"), marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  y += 5;
  if (invoice.pharmacy?.address) {
    doc.text(invoice.pharmacy.address, marginX, y);
    y += 4;
  }
  if (invoice.pharmacy?.phone) {
    doc.text(`Phone: ${invoice.pharmacy.phone}`, marginX, y);
    y += 4;
  }
  if (invoice.pharmacy?.email) {
    doc.text(`Email: ${invoice.pharmacy.email}`, marginX, y);
    y += 4;
  }

  // Right-aligned invoice meta
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(invoice.invoice_type || "TAX INVOICE", pageWidth - marginX, 15, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${invoice.invoice_number}`, pageWidth - marginX, 20, { align: "right" });
  doc.text(`Date: ${formatDate(invoice.invoice_date)}`, pageWidth - marginX, 24, { align: "right" });
  if (invoice.is_cancelled) {
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text("CANCELLED", pageWidth - marginX, 29, { align: "right" });
    doc.setTextColor(0);
  }

  // Separator
  y = Math.max(y, 30) + 2;
  doc.setDrawColor(220);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // ─── Customer + Doctor ───
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("BILLED TO", marginX, y);
  doc.text("PAYMENT", pageWidth / 2 + 10, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(safe(invoice.customer?.name), marginX, y);
  doc.text(safe(invoice.payment?.method, "—").toUpperCase(), pageWidth / 2 + 10, y);
  y += 4;

  doc.setFontSize(9);
  doc.setTextColor(90);
  if (invoice.customer?.phone) {
    doc.text(invoice.customer.phone, marginX, y);
  }
  doc.text(
    `Status: ${safe(invoice.payment?.status, "—").toUpperCase()}`,
    pageWidth / 2 + 10, y
  );
  y += 4;
  if (invoice.prescription?.doctor_name) {
    doc.text(`Dr. ${invoice.prescription.doctor_name}`, marginX, y);
    y += 4;
  }
  y += 2;

  // ─── Items table ───
  doc.setTextColor(0);
  autoTable(doc, {
    startY: y,
    head: [["#", "Medicine", "HSN", "Batch", "Exp", "Qty", "MRP", "Rate", "GST", "Total"]],
    body: invoice.items.map((it) => [
      it.sl_no,
      `${it.medicine_name}${it.strength ? `\n${it.strength}` : ""}`,
      safe(it.hsn_code, ""),
      safe(it.batch_number),
      formatDate(it.expiry_date),
      it.quantity,
      money(it.mrp).replace("Rs. ", ""),
      money(it.unit_price).replace("Rs. ", ""),
      `${it.gst_percentage}%`,
      money(it.total_amount).replace("Rs. ", ""),
    ]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: marginX, right: marginX },
  });

  y = doc.lastAutoTable.finalY + 4;

  // ─── GST breakdown table (legal requirement) ───
  if (invoice.gst_breakup?.length) {
    autoTable(doc, {
      startY: y,
      head: [["GST %", "Taxable Amount", "CGST %", "CGST ₹", "SGST %", "SGST ₹"]],
      body: invoice.gst_breakup.map((g) => [
        `${g.gst_rate}%`,
        money(g.taxable_amount).replace("Rs. ", ""),
        `${g.cgst_rate}%`,
        money(g.cgst_amount).replace("Rs. ", ""),
        `${g.sgst_rate}%`,
        money(g.sgst_amount).replace("Rs. ", ""),
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, halign: "right" },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 8,
        halign: "right",
      },
      columnStyles: { 0: { halign: "left" } },
      margin: { left: marginX, right: pageWidth / 2 },
      tableWidth: pageWidth / 2 - marginX - 4,
    });
  }

  // ─── Totals block (right side) ───
  const totalsStartY = doc.lastAutoTable.finalY - (invoice.gst_breakup?.length ? 20 : -2);
  const totalsX = pageWidth / 2 + 4;
  const labelCol = totalsX + 2;
  const valueCol = pageWidth - marginX - 2;

  let ty = Math.max(y, totalsStartY);
  const addTotalsRow = (label, val, bold = false, color) => {
    if (bold) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (color) doc.setTextColor(...color); else doc.setTextColor(0);
    doc.text(label, labelCol, ty);
    doc.text(val, valueCol, ty, { align: "right" });
    ty += 5;
  };

  addTotalsRow("Subtotal", money(invoice.totals.subtotal).replace("Rs. ", ""));
  if (invoice.totals.discount_amount > 0) {
    addTotalsRow("Discount", `- ${money(invoice.totals.discount_amount).replace("Rs. ", "")}`, false, [220, 38, 38]);
  }
  addTotalsRow("Taxable Amount", money(invoice.totals.taxable_amount).replace("Rs. ", ""));
  addTotalsRow("CGST", money(invoice.totals.cgst_amount).replace("Rs. ", ""));
  addTotalsRow("SGST", money(invoice.totals.sgst_amount).replace("Rs. ", ""));

  // Grand total — highlighted row
  doc.setDrawColor(180);
  doc.line(totalsX, ty - 2, pageWidth - marginX, ty - 2);
  addTotalsRow("Grand Total", money(invoice.totals.grand_total).replace("Rs. ", ""), true);
  doc.line(totalsX, ty - 2, pageWidth - marginX, ty - 2);

  ty += 1;
  addTotalsRow("Paid", money(invoice.payment.paid_amount).replace("Rs. ", ""));
  if (invoice.payment.due_amount > 0) {
    addTotalsRow("Due", money(invoice.payment.due_amount).replace("Rs. ", ""), true, [220, 38, 38]);
  }

  // ─── Amount in words ───
  y = Math.max(doc.lastAutoTable.finalY || y, ty) + 4;
  if (invoice.totals.amount_in_words) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(90);
    const wordsText = `Amount in words: ${invoice.totals.amount_in_words}`;
    const wrapped = doc.splitTextToSize(wordsText, pageWidth - marginX * 2);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 4 + 2;
  }

  // ─── Notes ───
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text("Notes:", marginX, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    const notesWrapped = doc.splitTextToSize(invoice.notes, pageWidth - marginX * 2);
    doc.text(notesWrapped, marginX, y);
    y += notesWrapped.length * 4 + 2;
  }

  // ─── Footer: terms + signature ───
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 25;

  doc.setDrawColor(220);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100);
  const terms = invoice.terms || [
    "Goods once sold cannot be returned without proper receipt",
    "All disputes subject to local jurisdiction",
    "E-invoice generated electronically",
  ];
  terms.forEach((t, i) => doc.text(`${i + 1}. ${t}`, marginX, footerY + 5 + i * 3));

  // Signature
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Served by: ${safe(invoice.sold_by)}`, pageWidth - marginX, footerY + 5, { align: "right" });
  doc.text("Authorised Signatory", pageWidth - marginX, footerY + 18, { align: "right" });

  // ─── Save ───
  const filename = `invoice-${invoice.invoice_number || "sale"}.pdf`;
  doc.save(filename);
}
