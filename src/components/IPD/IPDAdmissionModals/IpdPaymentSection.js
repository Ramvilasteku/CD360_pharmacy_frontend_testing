import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

export default function IpdPaymentsSection({ ipdId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API}/getall/payments?ipd_id=${ipdId}`,
        { withCredentials: true }
      );

      setRows(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [ipdId]);

  useEffect(() => {
    if (!ipdId) return;
    fetchPayments();
  }, [fetchPayments, ipdId]);

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

  const methodLabel = (method) => {
    if (!method) return "—";
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  return (
    <div className="ipd-section">
      <div className="ipd-section-header">
        <h3 className="ipd-section-title">Payments</h3>
      </div>

      <div className="ipd-section-table-wrap">
        {loading ? (
          <p className="ipd-section-empty">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="ipd-section-empty">No payments found.</p>
        ) : (
          <table className="ipd-section-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Claim Amount</th>
                <th>Bill Total</th>
                <th>Running Balance</th>
                <th>Bill Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.patient_name || "—"}</td>
                  <td>{methodLabel(row.payment_method)}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>
                    {row.payment_method === "insurance"
                      ? formatMoney(row.claim_amount)
                      : "—"}
                  </td>
                  <td>{formatMoney(row.grand_total)}</td>
                  <td>{formatMoney(row.running_balance)}</td>
                  <td>{row.bill_status || "—"}</td>
                  <td>{formatDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}