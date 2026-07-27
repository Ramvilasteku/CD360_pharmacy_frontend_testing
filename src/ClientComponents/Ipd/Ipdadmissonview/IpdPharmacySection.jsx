import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

export default function IpdPharmacySection({ ipdId }) {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {

      setLoading(true);

      const res = await axios.get(
        `${API}/getall/ipd-pharmacy?ipd_id=${ipdId}`,
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
    fetchData();
  }, [fetchData]);

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <div className="ipd-section">

      <div className="ipd-section-header">
        <h3 className="ipd-section-title">
          Pharmacy Issues
        </h3>
      </div>

      <div className="ipd-section-table-wrap">

        {loading ? (
          <p className="text-center">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-center">No medicines found.</p>
        ) : (

          <table className="ipd-section-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>Medicine</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th>Issue Date</th>
              </tr>
            </thead>

            <tbody>

              {rows.map((row) => (

                <tr key={row.id}>

                  <td>{row.id}</td>

                  <td>{row.medicine_name}</td>

                  <td>{row.quantity}</td>

                  <td>₹{row.unit_price}</td>

                  <td>
                    ₹{row.total_price}
                  </td>

                  <td>
                    {formatDate(
                      row.issue_date
                    )}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

    </div>
  );
}