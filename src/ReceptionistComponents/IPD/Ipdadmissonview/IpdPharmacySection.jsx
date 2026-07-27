import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import ProtectedActionButton from "../../components/ProtectedActionButton";

const API = process.env.REACT_APP_API_URL;

const EMPTY_FORM = {
  medicine_name: "",
  quantity: "",
  unit_price: "",
  issue_date: "",
};

export default function IpdPharmacySection({ ipdId }) {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [submitting, setSubmitting] = useState(false);

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

  const getTodayDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
};

  const openAdd = () => {
  setEditRow(null);

  setForm({
    ...EMPTY_FORM,
    issue_date: getTodayDate(),
  });

  setShowModal(true);
};


  const formatDateForInput = (utcDate) => {
  const date = new Date(utcDate);

  date.setMinutes(
    date.getMinutes() - date.getTimezoneOffset()
  );

  return date.toISOString().split("T")[0];
};


 const openEdit = (row) => {
  setEditRow(row);

  setForm({
    medicine_name: row.medicine_name,
    quantity: row.quantity,
    unit_price: row.unit_price,
    issue_date: row.issue_date
      ? formatDateForInput(row.issue_date)
      : "",
  });

  setShowModal(true);
};

  const handleDelete = async (id) => {

    if (!window.confirm("Delete this medicine?")) {
      return;
    }

    try {

      await axios.delete(
        `${API}/delete/pharmacy/${id}`,
        { withCredentials: true }
      );

      fetchData();

    } catch (err) {

      alert(
        err.response?.data?.message ||
        "Delete failed"
      );
    }
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      setSubmitting(true);

      if (editRow) {

        await axios.put(
          `${API}/update/pharmacy/${editRow.id}`,
          form,
          { withCredentials: true }
        );

        alert("Updated successfully");

      } else {

        await axios.post(
          `${API}/post/pharmacy`,
          {
            ipd_id: ipdId,
            ...form,
          },
          {
            withCredentials: true,
          }
        );

        alert("Medicine issued successfully");
      }

      setShowModal(false);

      fetchData();

    } catch (err) {

      alert(
        err.response?.data?.message ||
        "Failed"
      );

    } finally {
      setSubmitting(false);
    }
  };

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

        <ProtectedActionButton
  ipdId={ipdId}
  hideWhenDischarged={true}
  className="ipd-section-add-btn"
  onClick={openAdd}
>
  + Add
</ProtectedActionButton>
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
                <th>Actions</th>
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

                 <td>
                  <ProtectedActionButton
                    ipdId={ipdId}
                    hideWhenDischarged={true}
                    className="ipd-act-btn edit"
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </ProtectedActionButton>

                  <ProtectedActionButton
                    ipdId={ipdId}
                    hideWhenDischarged={true}
                    className="ipd-act-btn delete"
                    onClick={() => handleDelete(row.id)}
                  >
                    Delete
                  </ProtectedActionButton>
                </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

      {showModal && (

        <div
          className="ipd-sub-overlay"
          onClick={() =>
            setShowModal(false)
          }
        >
          <div
            className="ipd-sub-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="ipd-sub-header">

              <h4>
                {editRow
                  ? "Edit Medicine"
                  : "Issue Medicine"}
              </h4>

              <button
                className="idm-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ✕
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="ipd-sub-body">

                <div className="ipd-form-group">
                  <label>
                    Medicine Name
                  </label>

                  <input
                    required
                    value={form.medicine_name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        medicine_name:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="ipd-form-group">
                  <label>Quantity</label>

                  <input
                    type="number"
                    required
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="ipd-form-group">
                  <label>
                    Unit Price
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unit_price:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div className="ipd-form-group">
                  <label>
                    Issue Date
                  </label>

                  <input
                    type="date"
                    value={
                      form.issue_date
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        issue_date:
                          e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <div className="ipd-sub-footer">

                <button
                  type="button"
                  className="ipd-btn-cancel"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ipd-btn-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Please wait..."
                    : editRow
                    ? "Update"
                    : "Issue Medicine"}
                </button>

              </div>

            </form>

          </div>
        </div>

      )}

    </div>
  );
}