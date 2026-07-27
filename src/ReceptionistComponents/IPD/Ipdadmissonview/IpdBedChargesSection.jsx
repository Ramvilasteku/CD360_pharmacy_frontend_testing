// IpdBedChargesSection.jsx

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const EMPTY_FORM = {
  charge_type: "full_day",
  hours_used: "",
  rate_per_day: "",
  charge_amount: "",
};

export default function IpdBedChargesSection({
  ipdId, refreshKey,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [editRow, setEditRow] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [submitting, setSubmitting] =
    useState(false);

  // prevent duplicate API calls
  const isGeneratingRef = useRef(false);
  const [showForm, setShowForm] = useState(false);

  // 1. Add this useEffect inside the section component, where `showForm` is
//    whatever boolean state controls the popup open/close:
 
useEffect(() => {
  if (showForm) {
    // Lock the body AND the idm-overlay behind it
    document.body.style.overflow = "hidden";
 
    const overlay = document.querySelector(".idm-overlay");
    if (overlay) overlay.classList.add("scroll-locked");
  } else {
    document.body.style.overflow = "";
 
    const overlay = document.querySelector(".idm-overlay");
    if (overlay) overlay.classList.remove("scroll-locked");
  }
 
  // Cleanup on unmount
  return () => {
    document.body.style.overflow = "";
    const overlay = document.querySelector(".idm-overlay");
    if (overlay) overlay.classList.remove("scroll-locked");
  };
}, [showForm]);

  /* =========================================================
     FETCH CHARGES
  ========================================================= */
  const fetchCharges = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API}/getall/bed-charges`,
        {
          params: { ipd_id: ipdId },
          withCredentials: true,
        }
      );

      setRows(res.data.data || []);
    } catch (err) {
      console.error(
        "FETCH BED CHARGES ERROR:",
        err
      );
    } finally {
      setLoading(false);
    }
  }, [ipdId]);

  /* =========================================================
     AUTO GENERATE CHARGES
  ========================================================= */
//   const generateCharges = useCallback(async () => {

//   if (isGeneratingRef.current) return;

//   try {
//     isGeneratingRef.current = true;

//     await axios.post(
//       `${API}/post/bed-charges`,
//       { ipd_id: ipdId },
//       {
//         withCredentials: true,
//         timeout: 30000,
//       }
//     );

//     // refresh updated charges
//     await fetchCharges();

//   } catch (err) {
//     console.error(
//       "AUTO GENERATE ERROR:",
//       err.response?.data || err
//     );
//   } finally {
//     isGeneratingRef.current = false;
//   }

// }, [ipdId, fetchCharges]);
  /* =========================================================
     INITIAL LOAD + AUTO REFRESH
  ========================================================= */
useEffect(() => {
  if (!ipdId) return;

  fetchCharges();

}, [ipdId, refreshKey, fetchCharges]);

  /* =========================================================
     EDIT
  ========================================================= */
  const openEdit = (row) => {
    setEditRow(row);

    setForm({
      charge_type: row.charge_type,
      hours_used: row.hours_used,
      rate_per_day: row.rate_per_day,
      charge_amount: row.charge_amount,
    });

    setShowModal(true);
  };

  /* =========================================================
     DELETE
  ========================================================= */
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this bed charge?"
      )
    ) {
      return;
    }

    try {
      await axios.delete(
        `${API}/delete/bed-charges/${id}`,
        {
          withCredentials: true,
        }
      );

      fetchCharges();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Delete failed"
      );
    }
  };

  /* =========================================================
     UPDATE
  ========================================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editRow) return;

    try {
      setSubmitting(true);

      await axios.put(
        `${API}/update/bed-charges/${editRow.id}`,
        {
          rate_per_day: form.rate_per_day,
        },
        {
          withCredentials: true,
        }
      );

      alert("Updated successfully");

      setShowModal(false);

      fetchCharges();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Update failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ipd-section">
      {/* =========================================
          HEADER
      ========================================= */}
      <div className="ipd-section-header">
        <h3 className="ipd-section-title">
          IPD Bed Charges
        </h3>
      </div>

      {/* =========================================
          TABLE
      ========================================= */}
      <div className="ipd-section-table-wrap">
        {loading ? (
          <p className="ipd-section-empty">
            Loading...
          </p>
        ) : rows.length === 0 ? (
          <p className="ipd-section-empty">
            No bed charges found.
          </p>
        ) : (
          <table className="ipd-section-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Bed</th>
                <th>Type</th>
                <th>Hours</th>
                <th>Rate/Day</th>
                <th>Amount</th>
                
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>

                  <td>{r.charge_date}</td>

                  <td>{r.bed_number}</td>

                  <td>{r.charge_type}</td>

                  <td>{r.hours_used}</td>

                  <td>
                    ₹{r.rate_per_day}
                  </td>

                  <td>
                    ₹{r.charge_amount}
                  </td>

                  {/* <td>
                    <button
                      className="ipd-act-btn edit"
                      onClick={() =>
                        openEdit(r)
                      }
                    >
                      Edit
                    </button>

                   
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* =========================================
          EDIT MODAL
      ========================================= */}
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
            {/* HEADER */}
            <div className="ipd-sub-header">
              <h4 className="ipd-sub-title">
                Edit Bed Charge
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

            {/* FORM */}
            <form onSubmit={handleSubmit}>
              <div className="ipd-sub-body">
                {/* TYPE */}
                <div className="ipd-form-group">
                  <label>
                    Charge Type
                  </label>

                  <select
                    value={form.charge_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        charge_type:
                          e.target.value,
                      })
                    } 
                    disabled
                  >
                    <option value="hourly">
                      Hourly
                    </option>

                    <option value="half_day">
                      Half Day
                    </option>

                    <option value="full_day">
                      Full Day
                    </option>
                  </select>
                </div>

                {/* HOURS */}
                <div className="ipd-form-group">
                  <label>
                    Hours Used
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={form.hours_used}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hours_used:
                          e.target.value,
                      })
                    }
                     disabled
                  />
                </div>

                {/* RATE */}
                <div className="ipd-form-group">
                  <label>
                    Rate Per Day
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={form.rate_per_day}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rate_per_day:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* AMOUNT */}
                <div className="ipd-form-group">
                  <label>
                    Charge Amount
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={form.charge_amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        charge_amount:
                          e.target.value,
                      })
                    } 
                    disabled
                  />
                </div>
              </div>

              {/* FOOTER */}
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
                    : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}