// src/redux/dashboard/components/ExpiringSoonTable.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function ExpiringSoonTable({ widget, data, loading }) {
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
            <th className="px-4 py-3 font-medium">Medicine</th>
            <th className="px-4 py-3 font-medium">Batch · qty</th>
            <th className="px-4 py-3 font-medium">Expiry</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td colSpan={3} className="px-4 py-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </td>
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center py-8 text-gray-400">
                No items expiring soon
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.medicine_name}</div>
                  {row.manufacturer && (
                    <div className="text-xs text-gray-500">{row.manufacturer}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {row.batch_number} · {row.quantity_available}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
                    {new Date(row.expiry_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}