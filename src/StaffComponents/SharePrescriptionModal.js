import { useEffect, useRef, useState } from "react";


export default function SharePrescriptionModal({
  open = false,
  prescriptionId = null,
  onClose = () => {},
  base = "",
}) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | ok | err
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  const isValid = /^[6-9]\d{9}$/.test(phone); // Indian mobile: 10 digits, starts 6-9

  /* reset + focus each time it opens */
  useEffect(() => {
    if (open) {
      setPhone("");
      setStatus("idle");
      setMessage("");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && status !== "sending") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, status, onClose]);

  if (!open) return null;

  const onPhoneChange = (e) => {
    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
    if (status === "err" || status === "ok") {
      setStatus("idle");
      setMessage("");
    }
  };

  const submit = async () => {
    if (!isValid) {
      setStatus("err");
      setMessage("Enter a valid 10-digit number starting 6–9.");
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch(
        `${base}/api/prescriptions/${prescriptionId}/share-whatsapp`,
        {
          method: "POST",
          credentials: "include", // sends the auth cookie
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("ok");
        setMessage(`Prescription sent to +91 ${phone}.`);
        setTimeout(onClose, 1400);
      } else {
        setStatus("err");
        setMessage(data.message || "Couldn't send. Please try again.");
      }
    } catch {
      setStatus("err");
      setMessage("Network error. Check your connection and try again.");
    }
  };

  const sending = status === "sending";

  return (
    <>
      <style>{css}</style>
      <div
        className="rx-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rxTitle"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !sending) onClose();
        }}
      >
        <div className="rx-modal">
          <div className="rx-head">
            <div>
              <h2 id="rxTitle">Share prescription</h2>
              <p>Send the PDF to any WhatsApp number</p>
            </div>
            <button
              className="rx-close"
              aria-label="Close"
              onClick={onClose}
              disabled={sending}
            >
              &times;
            </button>
          </div>

          <div className="rx-body">
            <label className="rx-label" htmlFor="rxPhone">
              Recipient WhatsApp number
            </label>
            <div className="rx-inputwrap">
              <span className="rx-cc">+91</span>
              <input
                id="rxPhone"
                ref={inputRef}
                className="rx-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit number"
                autoComplete="off"
                value={phone}
                onChange={onPhoneChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid && !sending) submit();
                }}
                disabled={sending}
              />
            </div>
            <p className="rx-hint">
              Enter a 10-digit Indian mobile number. The patient's own copy is
              sent separately.
            </p>

            {message && (
              <div className={`rx-msg show ${status === "ok" ? "ok" : "err"}`}>
                {message}
              </div>
            )}

            <div className="rx-actions">
              <button
                className="rx-btn rx-btn-ghost"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                className="rx-btn rx-btn-send"
                onClick={submit}
                disabled={!isValid || sending}
              >
                {sending ? (
                  <>
                    <span className="rx-spin" />
                    Sending
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const css = `
  .rx-overlay{position:fixed;inset:0;background:rgba(26,46,53,.55);
    display:flex;align-items:center;justify-content:center;padding:20px;z-index:1000;}
  .rx-modal{width:100%;max-width:400px;background:#fff;border-radius:12px;
    overflow:hidden;box-shadow:0 18px 50px rgba(26,46,53,.28);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
    animation:rx-pop .16s ease-out;}
  @keyframes rx-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.rx-modal{animation:none}}
  .rx-head{background:#3f6f7a;color:#fff;padding:16px 20px;
    display:flex;align-items:center;justify-content:space-between;}
  .rx-head h2{margin:0;font-size:15px;font-weight:700;letter-spacing:.2px}
  .rx-head p{margin:2px 0 0;font-size:11.5px;opacity:.85}
  .rx-close{background:transparent;border:none;color:#fff;font-size:22px;
    line-height:1;cursor:pointer;padding:2px 4px;opacity:.85}
  .rx-close:hover:not(:disabled){opacity:1}
  .rx-close:disabled{opacity:.4;cursor:not-allowed}
  .rx-body{padding:20px}
  .rx-label{display:block;font-size:11px;font-weight:700;color:#3f6f7a;
    text-transform:uppercase;letter-spacing:.8px;margin-bottom:7px}
  .rx-inputwrap{display:flex;align-items:stretch;border:1.5px solid #c8dde0;
    border-radius:9px;overflow:hidden;transition:border-color .15s}
  .rx-inputwrap:focus-within{border-color:#3f6f7a}
  .rx-cc{background:#eef6f7;color:#1a2e35;font-size:14px;font-weight:600;
    display:flex;align-items:center;padding:0 12px;border-right:1.5px solid #c8dde0}
  .rx-input{flex:1;border:none;outline:none;padding:12px 14px;font-size:15px;
    letter-spacing:1px;color:#1a2e35;width:100%}
  .rx-input::placeholder{letter-spacing:normal;color:#7a9ba3}
  .rx-input:disabled{background:#f4fafb}
  .rx-hint{margin:8px 2px 0;font-size:11.5px;color:#7a9ba3}
  .rx-msg{margin-top:14px;padding:11px 13px;border-radius:9px;font-size:13px;line-height:1.4}
  .rx-msg.ok{background:#e8f5ee;color:#2e7d5b}
  .rx-msg.err{background:#fbeced;color:#b23b3b}
  .rx-actions{display:flex;gap:10px;margin-top:20px}
  .rx-btn{flex:1;padding:12px;border-radius:9px;font-size:14px;font-weight:600;
    cursor:pointer;border:1.5px solid transparent;transition:background .15s,opacity .15s}
  .rx-btn-ghost{background:#fff;border-color:#c8dde0;color:#1a2e35}
  .rx-btn-ghost:hover:not(:disabled){background:#eef6f7}
  .rx-btn-send{background:#3f6f7a;color:#fff}
  .rx-btn-send:hover:not(:disabled){background:#2d5560}
  .rx-btn:disabled{opacity:.55;cursor:not-allowed}
  .rx-spin{width:15px;height:15px;border:2px solid rgba(255,255,255,.4);
    border-top-color:#fff;border-radius:50%;display:inline-block;vertical-align:-2px;
    margin-right:7px;animation:rx-rot .6s linear infinite}
  @keyframes rx-rot{to{transform:rotate(360deg)}}
`;