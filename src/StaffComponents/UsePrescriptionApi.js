import { useState, useEffect } from "react";

const API = `${process.env.REACT_APP_SITE_URL}/api`;

export function usePrescriptionAPI() {
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [availableTests, setAvailableTests]         = useState([]);
  const [patients, setPatients]                     = useState([]);
  const [doctors, setDoctors]                       = useState([]);
  const [currentUser, setCurrentUser]               = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const fetches = [
      fetch(`${API}/medicines`,         { headers }).then(r => r.json()),
      fetch(`${API}/tests`,             { headers }).then(r => r.json()),
      fetch(`${API}/patients`,          { headers }).then(r => r.json()),
      fetch(`${API}/staff/self`,        { headers }).then(r => r.json()),
      fetch(`${API}/staff?role=doctor`, { headers }).then(r => r.json()),
    ];

    Promise.all(fetches)
      .then(([meds, tests, pats, self, docs]) => {
        if (meds.success)  setAvailableMedicines(meds.data);
        if (tests.success) setAvailableTests(tests.data);
        if (pats.success)  setPatients(pats.data);
        if (self.success)  setCurrentUser(self.data);
        if (docs.success)  setDoctors(docs.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Send mail internally (not exported) ──────────────────────────────────
  const sendMailById = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/prescriptions/send-mail/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      return await res.json();
    } catch (err) {
      console.error("Send mail error:", err);
      return { success: false, message: "Server error" };
    }
  };

  // ── Save prescription → auto send mail on success ─────────────────────
  const savePrescription = async (payload) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("SAVE RESPONSE:", data);

      if (data.success) {
        const prescriptionId =
          data?.data?.prescription_id || null;

        // ── Auto send mail after successful save ──────────────────────────
        if (prescriptionId) {
          const mailRes = await sendMailById(prescriptionId);
          if (mailRes.success) {
            console.log("✅ Mail sent automatically after save");
          } else {
            console.warn("⚠ Prescription saved but mail failed:", mailRes.message);
          }
        }
      }

      return data;

    } catch (err) {
      console.error("Save error:", err);
      return { success: false, message: "Server error" };
    }
  };

  return {
    availableMedicines,
    availableTests,
    patients,
    doctors,
    currentUser,
    loading,
    error,
    savePrescription,
  };
}