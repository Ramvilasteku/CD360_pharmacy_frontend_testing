/*
====================================================================
RegistrationStart.jsx

Shown before a REGISTRATION form, asking the one question that decides
what the patient has to type:

    "Have you filled a form here before?"

    No  -> the full form, every field blank
    Yes -> the Client ID gate, then the same form with their details
           already filled in and locked, asking only for the rest

WHY THIS EXISTS
---------------
Reception hands one QR code to everybody. A returning patient scans it,
picks the registration form because it is the obvious one, and re-types
their name, mobile, address and date of birth — and only at the end
learns the email is already registered and the whole thing is refused.

Asking first costs one tap and saves that entire journey. It also stops
the duplicate being attempted at all, rather than catching it at the end.
====================================================================
*/

import React from "react";

import "./DynamicForm.css";

const RegistrationStart = ({ formName, onNew, onExisting }) => {

    const card = {
        border: "1px solid #d9e6e6",
        borderRadius: 10,
        padding: "18px 20px",
        background: "#fff",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        display: "block",
        marginBottom: 14
    };

    const heading = {
        fontSize: 16,
        fontWeight: 700,
        color: "#1f4e4e",
        marginBottom: 4
    };

    const sub = {
        fontSize: 13,
        color: "#7c8a8d",
        lineHeight: 1.5
    };

    return (
        <div className="df-page">
            <div className="df-card">

                <div className="df-header">
                    <h2>{formName || "Registration"}</h2>
                    <p>Have you filled in a form at this clinic before?</p>
                </div>

                <div className="df-body">
                    <div className="df-section">

                        <button type="button" style={card} onClick={onNew}>
                            <div style={heading}>No — this is my first time</div>
                            <div style={sub}>
                                Fill in the full form. We’ll create your record and email
                                you a Client ID to use next time.
                            </div>
                        </button>

                        <button
                            type="button"
                            style={{ ...card, background: "#f4f8f8", marginBottom: 0 }}
                            onClick={onExisting}
                        >
                            <div style={heading}>Yes — I already have a Client ID</div>
                            <div style={sub}>
                                Enter your Client ID or registered email. Your details will
                                be filled in for you and you’ll only answer what’s left.
                            </div>
                        </button>

                        <p style={{ color: "#7c8a8d", fontSize: 13, marginTop: 16 }}>
                            Not sure? Ask at the reception desk — they can look up your
                            Client ID.
                        </p>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default RegistrationStart;