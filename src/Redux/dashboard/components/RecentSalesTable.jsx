// src/redux/dashboard/components/RecentSalesTable.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function RecentSalesTable({ widget, data, loading }) {
  const navigate = useNavigate();
  const rows = data?.rows || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{widget.title}</h3>
        {widget.action && (
          <button
            onClick={() => navigate(widget.action.path)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {widget.action.label} →
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 font-medium">Bill</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Paid</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td colSpan={4} className="px-4 py-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-8 text-gray-400">
                No sales yet
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">
                  #{row.sale_number}
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">
                    {row.customer_name || "Walk-in"}
                  </div>
                  {row.customer_phone && (
                    <div className="text-xs text-gray-500">{row.customer_phone}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  ₹{Number(row.grand_total).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3">
                  <PaymentBadge status={row.payment_status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaymentBadge({ status }) {
  const styles = {
    paid: "bg-green-100 text-green-700",
    partial: "bg-orange-100 text-orange-700",
    unpaid: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}