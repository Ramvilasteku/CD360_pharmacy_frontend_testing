/*
====================================================================
ClientIdGate.jsx

Shown before any non-registration form. The patient identifies
themselves with EITHER their Client ID or the email they registered
with; their record is loaded and handed to DynamicForm, which shows the
known details read-only and asks only for the remaining fields. Those
remaining answers are what ends up in form_submissions.

WHY EITHER
----------
The Client ID arrives by email at registration and on a slip from
reception, so some patients have it to hand and some don't. An email
address is the one thing they can always remember. One field takes both:
if it contains "@" the server looks up by email, otherwise by id.

THE MOBILE NUMBER IS OPTIONAL
-----------------------------
Client ids are "3" followed by 8 random digits, so there is no short
sequence to walk. The mobile stays here as a second check for anyone who
has it: the server verifies it WHEN GIVEN and rejects a wrong one, but
accepts a blank. See REQUIRE_MOBILE_MATCH in form.controller.js.

Registration forms never reach this screen: there is no client yet,
which is the point of registering.
====================================================================
*/

import React, { useState } from "react";

import { lookupClient } from "./formApi";

import "./DynamicForm.css";

const ClientIdGate = ({ token, formName, onResolved }) => {

    const [identifier, setIdentifier] = useState("");
    const [mobile, setMobile] = useState("");
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        if (e) e.preventDefault();

        const who = identifier.trim();

        if (!who) {
            setError("Please enter your Client ID or registered email.");
            return;
        }

        try {
            setChecking(true);
            setError("");

            const res = await lookupClient(token, {
                // `identifier` is what the server reads now; client_id is sent
                // too so an older deployed backend still works unchanged.
                identifier: who,
                client_id: who,
                mobile: mobile.trim()
            });

            onResolved(res.data.client);

        } catch (err) {
            console.log("Client lookup failed", err);
            setError(
                err.response?.data?.message ||
                "Could not verify those details. Please check with reception."
            );
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="df-page">
            <div className="df-card">

                <div className="df-header">
                    <h2>{formName || "Patient form"}</h2>
                    <p>Enter your Client ID or registered email to load this form.</p>
                </div>

                <form className="df-body" onSubmit={submit}>
                    <div className="df-section">
                        <div className="df-field-grid">

                            <div className="df-field df-field-full">
                                <span className="df-label">
                                    Client ID or registered email
                                    <span className="df-required">*</span>
                                </span>
                                <input
                                    className="df-input"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck="false"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="312345678  or  you@example.com"
                                />
                            </div>

                            {/* <div className="df-field">
                                <span className="df-label">
                                    Registered mobile number{" "}
                                    <span style={{ color: "#7c8a8d", fontWeight: 400 }}>
                                        (optional)
                                    </span>
                                </span>
                                <input
                                    className="df-input"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="10-digit number"
                                />
                            </div> */}

                        </div>

                        {error && (
                            <p style={{ color: "#c0392b", marginTop: 12 }}>{error}</p>
                        )}

                        <p style={{ color: "#7c8a8d", fontSize: 13, marginTop: 12 }}>
                            Don’t have a Client ID? Please complete the registration form
                            first, or ask at the reception desk.
                        </p>
                    </div>

                    <div className="df-submit-bar">
                        <button
                            className="df-submit-btn"
                            type="submit"
                            disabled={checking || !identifier.trim()}
                        >
                            {checking ? "Checking…" : "Continue"}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default ClientIdGate;