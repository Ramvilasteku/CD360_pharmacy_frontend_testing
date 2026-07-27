import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

export default function IpdBillsSection({ ipdId }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBill = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API}/get/ipd-bill/${ipdId}`,
        { withCredentials: true }
      );

      setBill(res.data.data || null);
    } catch (err) {
      // 404 simply means no bill yet for this IPD
      if (err.response?.status !== 404) {
        console.error(err);
      }
      setBill(null);
    } finally {
      setLoading(false);
    }
  }, [ipdId]);

  useEffect(() => {
    if (!ipdId) return;
    fetchBill();
  }, [fetchBill, ipdId]);

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined) return "—";

    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const statusClass = (status) => {
    switch (status) {
      case "paid":
        return "ipd-bill-status paid";
      case "partial":
        return "ipd-bill-status partial";
      case "pending":
        return "ipd-bill-status unpaid";
      default:
        return "ipd-bill-status";
    }
  };

  return (
    <div className="ipd-section">
      <div className="ipd-section-header">
        <h3 className="ipd-section-title">Bill</h3>
      </div>

      <div className="ipd-section-table-wrap">
        {loading ? (
          <p className="ipd-section-empty">Loading...</p>
        ) : !bill ? (
          <p className="ipd-section-empty">No bill found.</p>
        ) : (
          <table className="ipd-section-table">
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Total Amount</th>
                <th>Discount (%)</th>
                <th>GST (%)</th>
                <th>Taxable Amount</th>
                <th>Grand Total</th>
                <th>Paid Amount</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Updated Date</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>{bill.bill_id}</td>
                <td>{formatMoney(bill.total_amount)}</td>
                <td>{bill.discount ?? "—"}%</td>
                <td>{bill.gst_percentage ?? "—"}%</td>
                <td>{formatMoney(bill.taxable_amount)}</td>
                <td>{formatMoney(bill.grand_total)}</td>
                <td>{formatMoney(bill.paid_amount)}</td>
                <td>{formatMoney(bill.balance_amount)}</td>
                <td>
                  <span className={statusClass(bill.bill_status)}>
                    {bill.bill_status || "—"}
                  </span>
                </td>
                <td>{formatDate(bill.created_at)}</td>
                <td>{formatDate(bill.updated_at)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}