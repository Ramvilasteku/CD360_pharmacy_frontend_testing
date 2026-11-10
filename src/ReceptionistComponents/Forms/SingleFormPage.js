import React, { useEffect, useState } from "react";

import { useParams, useNavigate, useSearchParams } from "react-router-dom";

import { getFormById } from "./formApi";

import DynamicForm from "./DynamicForm";
import ClientIdGate from "./ClientIdGate";
import RegistrationStart from "./RegistrationStart";
import { FormSkeleton } from "./Skeleton";


/*
  Registration vs everything else:

    form_type contains "registration"
        -> no client exists yet; the patient fills the form and
           submitForm() creates the clients row.

    anything else
        -> ClientIdGate first. The patient enters their Client ID or
           registered email, we load their record, and DynamicForm shows
           the known details read-only and asks only for the rest.

  The QR token is passed down to DynamicForm because the server reads
  admin_id from it at submit time.


  BACK BUTTON
  -----------
  Fixed to the top right, on every state of this page — skeleton, error,
  the Client ID gate, and the form itself. A patient who picks the wrong
  form from the dropdown otherwise has nowhere to go but the browser's
  own back button, which is easy to miss on a phone in a waiting room.

  It is NOT navigate(-1). History on this page is unreliable: the QR link
  is often the first entry in the tab, so "back" would leave the app
  entirely. It goes somewhere known instead:

    on the form, after the gate  -> back to the gate (clears the client,
                                    so a patient who typed the wrong
                                    Client ID can correct it)
    everywhere else              -> the form list for this same QR token


  DOCTOR VIEW
  -----------
  Add ?scope=doctor to the URL and DynamicForm renders the fields marked
  doctorOnly in the schema as well:

    /forms/<token>/<admin_id>/<form_id>?scope=doctor

  This is what makes a form like "Additional Clinic Forms" complete —
  most of it (Norwood staging, session tracker, treatment plan, billing)
  is clinician-only, so a patient sees just the photography consent
  while a clinician on the clinic's own device sees the whole thing.

  IMPORTANT — THIS IS NOT ACCESS CONTROL.
  This route is public: it is reached by scanning a QR code, with no
  login. A patient who edits their address bar can add ?scope=doctor and
  see the clinician fields. That is acceptable for a tablet on the
  reception desk, and NOT acceptable as a permission boundary.
*/


/*
  Fixed rather than placed inside the card: the card is centred by
  df-page and its header is a solid teal block, so a button inside it
  would have to fight that layout on every screen size. Fixed keeps it
  reachable while the patient scrolls a long form.
*/
const BackButton = ({ onClick, label }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label={label}
        style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 30,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            border: "1px solid #cfe0e0",
            borderRadius: 22,
            background: "#ffffff",
            color: "#1f4e4e",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
        }}
    >
        <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
        {label}
    </button>
);


const SingleFormPage = () => {

    const { token, admin_id, form_id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /*
      Registration forms only. null = the question hasn't been answered
      yet, "new" = fill everything, "existing" = identify first, then
      fill only what's left.
    */
    const [regPath, setRegPath] = useState(null);

    // ?scope=doctor  (also accepts ?scope=clinician)
    const scope = (searchParams.get("scope") || "").toLowerCase();
    const showDoctorFields = scope === "doctor" || scope === "clinician";

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await getFormById(admin_id, form_id);
                if (!cancelled) setForm(res.data);
            } catch (err) {
                console.log(err);
                if (!cancelled) {
                    setError(
                        err.response?.data?.message || err.message || "Unknown error"
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [admin_id, form_id]);

    // After a successful submit, back to the form list for this same QR
    // token so the patient can fill another one (registration, then consent).
    const handleSubmitted = () => navigate(`/forms/${token}`);

    const formList = () => navigate(`/forms/${token}`);

    /*
      One step back, not out of the app. Dropping the resolved client
      returns to the gate rather than the form list, which is what a
      patient who mistyped their Client ID actually wants.
    */
    const goBack = () => {
        // On the form with a client resolved -> back to the gate.
        if (client) {
            setClient(null);
            return;
        }
        // On the gate, or on a blank registration form -> back to the question.
        if (regPath) {
            setRegPath(null);
            return;
        }
        formList();
    };

    const backLabel = client || regPath ? "Back" : "All forms";

    // A card-shaped placeholder, so the page doesn't jump when the real
    // form arrives — see Skeleton.jsx.
    if (loading) {
        return (
            <>
                <BackButton onClick={formList} label="All forms" />
                <FormSkeleton sections={2} fields={4} />
            </>
        );
    }

    if (error) {
        return (
            <>
                <BackButton onClick={formList} label="All forms" />
                <div className="df-page">
                    <div className="df-card">
                        <div className="df-empty">
                            <h2>Could not open this form</h2>
                            <p>{error}</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (!form) {
        return (
            <>
                <BackButton onClick={formList} label="All forms" />
                <div className="df-page">
                    <div className="df-card">
                        <div className="df-empty">
                            <h2>Form not found</h2>
                            <p>Please go back and choose a form from the list.</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Contains-match: form_type is free text, so "Yoga registration",
    // "Patient registration" and "registration" all count.
    const isRegistration = String(form.form_type || "")
        .toLowerCase()
        .includes("registration");

    /*
      REGISTRATION FORMS

      Ask first whether they already have a Client ID:

        not answered yet          -> RegistrationStart
        "existing", no client yet -> ClientIdGate
        "existing", client loaded -> the form, details locked, rest open
        "new"                     -> the form, everything blank

      A registration form submitted WITH a client_id is handled on the
      server as an existing patient completing the form; nothing is
      created and the duplicate check is skipped.
    */
    if (isRegistration) {

        if (!regPath) {
            return (
                <>
                    <BackButton onClick={formList} label="All forms" />
                    <RegistrationStart
                        formName={form.form_name}
                        onNew={() => setRegPath("new")}
                        onExisting={() => setRegPath("existing")}
                    />
                </>
            );
        }

        if (regPath === "existing" && !client) {
            return (
                <>
                    <BackButton onClick={goBack} label="Back" />
                    <ClientIdGate
                        token={token}
                        formName={form.form_name}
                        onResolved={setClient}
                    />
                </>
            );
        }

        return (
            <>
                <BackButton onClick={goBack} label={backLabel} />
                <DynamicForm
                    form={form}
                    client={client}
                    qrToken={token}
                    showDoctorFields={showDoctorFields}
                    onSubmitted={handleSubmitted}
                />
            </>
        );
    }

    // EVERY OTHER FORM — the gate always comes first.
    if (!client) {
        return (
            <>
                <BackButton onClick={formList} label="All forms" />
                <ClientIdGate
                    token={token}
                    formName={form.form_name}
                    onResolved={setClient}
                />
            </>
        );
    }

    return (
        <>
            <BackButton onClick={goBack} label={backLabel} />
            <DynamicForm
                form={form}
                client={client}
                qrToken={token}
                showDoctorFields={showDoctorFields}
                onSubmitted={handleSubmitted}
            />
        </>
    );
};

export default SingleFormPage;