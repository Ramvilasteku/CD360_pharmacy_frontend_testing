import { useEffect, useState } from "react";
import axios from "axios";

export default function RoleModuleManager() {

  const [initialLoaded, setInitialLoaded] = useState(false);
  const [selectedRole, setSelectedRole] = useState("doctor");

  // ✅ Modules assigned to selected role
  const [selectedModules, setSelectedModules] = useState([]);

  // ✅ All modules created by admin
  const [allModules, setAllModules] = useState([]);

  // ✅ Admin allowed modules
  const [adminModules, setAdminModules] = useState([]);

  // ✅ Modal state
  const [showModal, setShowModal] = useState(false);

  const API = process.env.REACT_APP_SITE_URL;

  // 📘 Descriptions
  const MODULE_DESCRIPTIONS = {
    appointments:
      "Manage appointments, bookings and patient scheduling.",

    attendance:
      "Maintain attendance and leave management.",

    documents:
      "Upload, manage and download documents.",

    bills:
      "Create and manage billing and invoices.",

    clients:
      "Manage patients and client records.",

    prescriptions:
      "Create and manage prescriptions.",

    ipd:
      "Manage IPD admissions and inpatient details.",
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
  if(initialLoaded){
    fetchRoleModules(selectedRole);
  }
}, [selectedRole, initialLoaded]);

  // ✅ Fetch all modules + admin allowed modules
  const fetchInitialData = async () => {
  try {
    const [allRes, adminRes] = await Promise.all([
      axios.get(`${API}/api/all-modules`, {
        withCredentials: true,
      }),

      axios.get(`${API}/api/modules`, {
        withCredentials: true,
      }),
    ]);

    console.log("===== ALL MODULES =====");
    console.log(allRes.data);

    console.log("===== ADMIN ALLOWED MODULES =====");
    console.log(adminRes.data);


    setAllModules(allRes.data || []);

    setAdminModules(
      Array.isArray(adminRes.data)
        ? adminRes.data
        : []
    );

    setInitialLoaded(true);

  } catch(err){
    console.log("Initial API Error:", err);
  }
};

  // ✅ Fetch selected role modules
 const fetchRoleModules = async (role) => {
  try {

    console.log("Fetching role modules for:", role);

    const res = await axios.get(
      `${API}/api/role-modules/${role}`,
      {
        withCredentials:true,
      }
    );


    console.log(
      "===== ROLE MODULE RESPONSE ====="
    );

    console.log(res.data);


    setSelectedModules(
      res?.data?.modules || []
    );


  } catch(err){

    console.log(
      "Role module API error:",
      err.response?.data || err.message
    );

    setSelectedModules([]);
  }
};

  // ✅ Toggle module
  const handleToggle = async (key) => {
    let updatedModules = [];

    if (selectedModules.includes(key)) {
      updatedModules = selectedModules.filter((m) => m !== key);
    } else {
      updatedModules = [...selectedModules, key];
    }

    setSelectedModules(updatedModules);

    try {
      await axios.post(
        `${API}/api/role-modules`,
        {
          role: selectedRole,
          module_keys: updatedModules,
        },
        {
          withCredentials: true,
        }
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Open modal
  const handleLockedModule = () => {
    setShowModal(true);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: 30,
        padding: "20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1000px" }}>
        <h2 style={{ marginBottom: 20 }}>Role Module Access</h2>

        {/* Role Dropdown */}
        <div style={{ marginBottom: 25 }}>
          <label>Select Role</label>

          <br />

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              marginTop: 8,
              padding: "10px",
              borderRadius: "8px",
              width: "220px",
              border: "1px solid #ccc",
            }}
          >
            <option value="doctor">Doctor</option>
            <option value="receptionist">Receptionist</option>
          </select>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: "20px",
          }}
        >
          {allModules.map((module) => {
            const isAllowed =
              Array.isArray(adminModules) &&
              adminModules.includes(module.module_key);

            const isSelected = selectedModules.includes(
              module.module_key
            );

            return (
              <div
                key={module.id}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "18px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "170px",
                  border: isAllowed
                    ? "1px solid #e5e7eb"
                    : "1px solid #dfd5d5",
                }}
              >
                {/* Top */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      textTransform: "capitalize",
                      fontSize: "18px",
                    }}
                  >
                    {module.module_name}
                  </h4>

                  {/* Toggle OR Lock */}
                  {isAllowed ? (
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          handleToggle(module.module_key)
                        }
                      />

                      <span className="slider round"></span>
                    </label>
                  ) : (
                    <button
                      onClick={handleLockedModule}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "40px",
                      }}
                    >
                      🔒
                    </button>
                  )}
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: "1.5",
                    marginBottom: "10px",
                  }}
                >
                  {MODULE_DESCRIPTIONS[module.module_key] ||
                    "Module access configuration."}
                </p>
              </div>
            );
          })}
        </div>

        {/* ✅ Center Modal */}
        {showModal && (
          <div className="modalOverlay">
            <div className="modalBox">
              <div style={{ fontSize: "45px", marginBottom: "10px" }}>
                🔒
              </div>

              <h3 style={{ marginBottom: "10px" }}>
                Access Restricted
              </h3>

              <p
                style={{
                  color: "#666",
                  lineHeight: "1.6",
                  marginBottom: "20px",
                }}
              >
                Please contact Administrator for this module access.
              </p>

              <button
                onClick={() => setShowModal(false)}
                className="closeBtn"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Toggle CSS */}
        <style>
          {`
            .switch {
              position: relative;
              display: inline-block;
              width: 42px;
              height: 22px;
            }

            .switch input {
              opacity: 0;
              width: 0;
              height: 0;
            }

            .slider {
              position: absolute;
              cursor: pointer;
              inset: 0;
              background-color: #ccc;
              transition: 0.3s;
              border-radius: 34px;
            }

            .slider:before {
              position: absolute;
              content: "";
              height: 16px;
              width: 16px;
              left: 3px;
              bottom: 3px;
              background-color: white;
              transition: 0.3s;
              border-radius: 50%;
            }

            input:checked + .slider {
              background-color: #3f6f7a;
            }

            input:checked + .slider:before {
              transform: translateX(20px);
            }

            /* ✅ Modal */
            .modalOverlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.45);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
            }

            .modalBox {
              background: white;
              width: 90%;
              max-width: 400px;
              border-radius: 16px;
              padding: 30px 25px;
              text-align: center;
              box-shadow: 0 10px 35px rgba(0,0,0,0.2);
              animation: popup 0.25s ease;
            }

            .closeBtn {
              border: none;
              background: #3f6f7a;
              color: white;
              padding: 10px 22px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
            }

            .closeBtn:hover {
              opacity: 0.9;
            }

            @keyframes popup {
              from {
                transform: scale(0.8);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}