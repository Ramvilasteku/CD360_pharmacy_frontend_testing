import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const FormSelection = () => {
  const { qrToken } = useParams();

  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState("");
  const [forms, setForms] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await axios.get(
        `http://192.168.1.21:5000/api/forms/${qrToken}`
      );

      if (res.data.success) {
        setHospital(res.data.hospital_name);
        setForms(res.data.forms);
        setShowModal(true);
      }
    } catch (err) {
      console.log(err);
      alert("Invalid QR Code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5f5f5"
        }}
      >
        {loading ? (
          <h2>Loading...</h2>
        ) : (
          <h2>{hospital}</h2>
        )}
      </div>

      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2>{hospital}</h2>

            <p>Select a Form</p>

            {forms.map((form) => (
              <button
                key={form.id}
                style={styles.button}
                onClick={() => alert(form.type)}
              >
                {form.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },

  modal: {
    width: "90%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 12,
    padding: 25,
    textAlign: "center"
  },

  button: {
    width: "100%",
    marginTop: 12,
    padding: 15,
    border: "none",
    borderRadius: 8,
    background: "#0C635B",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16
  }
};

export default FormSelection;