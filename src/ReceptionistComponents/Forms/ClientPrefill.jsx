/*
====================================================================
ClientPrefill.jsx

The read-only "we already know this about you" block, shown at the top
of every non-registration form once the Client ID gate has resolved a
patient.

WHY IT WAS REBUILT
------------------
The old version used bare <div>/<h3>/<label>/<input> with no className,
so it rendered as unstyled browser defaults — mismatched input widths,
labels jammed against boxes — inside an otherwise styled card. It now
uses the same df- classes as DynamicForm, so it reads as part of the
same form.

WHAT IT SHOWS
-------------
Only fields the clinic actually holds: anything empty is skipped rather
than rendered as a blank box. The Client ID is shown first and
deliberately emphasised — it is the number the patient needs to open
any other form, and this screen is the one place they can reliably
re-read it.

These values come from the `clients` row and are the single source of
truth, which is why they are read-only here: corrections go through
reception, not through a patient form.
====================================================================
*/

import React from "react";

// Renders in this order, skipping anything the clinic doesn't hold.
const FIELDS = [
    { key: "name", label: "Name" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "gender", label: "Gender" },
    { key: "dob", label: "Date of Birth" },
    { key: "blood_group", label: "Blood Group" },
    { key: "address", label: "Address", full: true }
];

// gender is stored lowercase in the enum ("female"); show it capitalised.
const display = (key, value) => {
    if (key === "gender") {
        return String(value).charAt(0).toUpperCase() + String(value).slice(1);
    }
    return value;
};

const ClientPrefill = ({ client }) => {

    if (!client) return null;

    const present = FIELDS.filter(
        (f) => client[f.key] !== null &&
               client[f.key] !== undefined &&
               String(client[f.key]).trim() !== ""
    );

    return (
        <div>

            <div className="df-section-header">
                <span className="df-section-badge">✓</span>
                <h3 className="df-section-title">Patient Details</h3>
            </div>

            {client.id && (
                <div
                    style={{
                        background: "#f4f8f8",
                        border: "1px solid #d9e6e6",
                        borderRadius: 8,
                        padding: "12px 16px",
                        marginBottom: 16
                    }}
                >
                    <span className="df-label" style={{ marginBottom: 2 }}>
                        Your Client ID
                    </span>
                    <div
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: 1,
                            color: "#1f4e4e"
                        }}
                    >
                        {client.id}
                    </div>
                    <span style={{ color: "#7c8a8d", fontSize: 12 }}>
                        Keep this for your next visit.
                    </span>
                </div>
            )}

            <div className="df-field-grid">
                {present.map((f) => (
                    <div
                        key={f.key}
                        className={f.full ? "df-field df-field-full" : "df-field"}
                    >
                        <span className="df-label">{f.label}</span>
                        <input
                            className="df-input"
                            value={display(f.key, client[f.key])}
                            readOnly
                            tabIndex={-1}
                            style={{
                                background: "#f7f9f9",
                                color: "#4a5a5c",
                                cursor: "default"
                            }}
                        />
                    </div>
                ))}
            </div>

            <p style={{ color: "#7c8a8d", fontSize: 13, marginTop: 12 }}>
                These details come from your clinic record. If anything is wrong,
                please tell reception — you don’t need to fill them in again below.
            </p>

        </div>
    );
};

export default ClientPrefill;