// src/components/pharmacy/categories/categoriesUtils.js
//
// Shared helpers used across Categories, CategoryFormDialog, and BulkUploadDialog.

import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────
   CSV parser — handles quoted strings and embedded commas.
   Returns array of lowercase-keyed objects.
───────────────────────────────────────────────────────────────── */
export const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || "").trim();
    });
    return row;
  });
};

/* ─────────────────────────────────────────────────────────────
   Excel parser — dynamic import so a missing `xlsx` package
   doesn't crash the page. CSV always works without it.
───────────────────────────────────────────────────────────────── */
export const parseExcel = async (file) => {
  let XLSX;
  try {
    XLSX = await import("xlsx");
  } catch {
    throw new Error(
      "Excel support needs the 'xlsx' package.\nRun: npm install xlsx"
    );
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
  return rows.map((r) => {
    const n = {};
    Object.keys(r).forEach((k) => {
      n[k.toLowerCase().trim()] = String(r[k] ?? "").trim();
    });
    return n;
  });
};

/* ─────────────────────────────────────────────────────────────
   Download the CSV template so users know the expected shape.
───────────────────────────────────────────────────────────────── */
export const downloadCSVTemplate = () => {
  const csv =
    "category_name,description\n" +
    "Antibiotics,For bacterial infections\n" +
    "Pain Relief,Analgesics and anti-inflammatories\n" +
    "Vitamins & Supplements,";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pharmacy_categories_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ─────────────────────────────────────────────────────────────
   Debounce hook — delay a value by N ms (default 400).
───────────────────────────────────────────────────────────────── */
export const useDebounced = (value, ms = 400) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};
