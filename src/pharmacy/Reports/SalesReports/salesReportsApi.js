// src/components/pharmacy/reports/sales/salesReportsApi.js
// Thin wrapper over /api/pharmacy/sales-reports endpoints.
// One `buildRequest` that both JSON fetch and file download share.

import axios from "axios";

const BASE = `${process.env.REACT_APP_URL}/api/pharmacy/sales-reports`;

const buildRequest = (sel) => {
  const params = {};
  if (sel.group_by) params.group_by = sel.group_by;
  // Branch chosen in the report header. Absent = every branch (admins only; staff are
  // always pinned to their own branch by the server).
  if (sel.branch) params.branch = sel.branch;

  let path;
  switch (sel.period) {
    case "daily":
      path = "/daily";
      if (sel.date) params.date = sel.date;
      break;
    case "range":
      path = "/range";
      params.start = sel.start;
      params.end = sel.end;
      break;
    case "monthly":
      path = "/monthly";
      params.year = sel.year;
      params.month = sel.month;
      break;
    case "yearly":
      path = "/yearly";
      params.year = sel.year;
      break;
    default: // custom shortcuts: today, yesterday, week, month, quarter, year
      path = "/custom";
      params.period = sel.period;
  }
  return { url: `${BASE}${path}`, params };
};

export const fetchReport = async (selection) => {
  const { url, params } = buildRequest(selection);
  const res = await axios.get(url, { params, withCredentials: true });
  return res.data;
};

export const downloadReport = async (selection, format) => {
  const { url, params } = buildRequest(selection);
  const res = await axios.get(url, {
    params: { ...params, format },
    withCredentials: true,
    responseType: "blob",
  });
  const ext = format === "excel" ? "xlsx" : format;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([res.data]));
  link.download = `sales_report_${Date.now()}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};