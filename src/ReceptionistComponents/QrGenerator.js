import React, { useEffect, useState } from "react";
// Aliased on import: the local handlers below share these names.
import { getMyQR, generateQR as createQR } from "./Forms/Api";

const QrGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [qrImage, setQrImage] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    checkExistingQR();
  }, []);

  // Check if a QR already exists
  const checkExistingQR = async () => {
    try {
      const res = await getMyQR();

      if (res.data.success && res.data.qr) {
        setQrImage(res.data.qrImage);
        setQrUrl(res.data.qr.qr_url);
      }
    } catch (error) {
      // Log the real status — a 401 here looks identical to "no code yet"
      console.log("my-qr failed:", error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        setNotice("Your session has expired. Sign in again to manage the QR code.");
      }
    } finally {
      setChecking(false);
    }
  };

  // Generate QR
  const generateQR = async () => {
    try {
      setLoading(true);
      setNotice("");

      const res = await createQR();

      setQrImage(res.data.qrImage);
      setQrUrl(res.data.qr.qr_url);
    } catch (error) {
      const status = error.response?.status;
      console.log("generate failed:", status, error.response?.data);

      if (status === 401) {
        setNotice("Your session has expired. Sign in again, then generate the code.");
      } else if (status === 403) {
        setNotice("Your account does not have permission to generate a QR code.");
      } else {
        setNotice(
          error.response?.data?.message ||
            "The QR code could not be generated. Check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = "hospital-qr.png";
    link.click();
  };

  const shareQR = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Hospital QR Code",
          text: "Scan this QR code to fill hospital forms",
          url: qrUrl,
        });
      } else {
        await navigator.clipboard.writeText(qrUrl);
        setNotice("Link copied to clipboard.");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="qr-page">
      <style>{css}</style>

      <section className="qr-card">
        <header className="qr-head">
          <span className="qr-eyebrow">Patient intake</span>
          <h2 className="qr-title">Hospital QR code</h2>
          <p className="qr-sub">
            Patients scan this code to open your intake forms. One code per hospital.
          </p>
        </header>

        {checking ? (
          <Skeleton />
        ) : (
          <>
            {!qrImage && (
              <div className="qr-empty">
                <div className="qr-empty-art" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <p className="qr-empty-text">No code yet. Generate one to start collecting forms.</p>
                <button
                  onClick={generateQR}
                  disabled={loading}
                  className="qr-btn qr-btn-primary"
                >
                  {loading ? "Generating…" : "Generate QR code"}
                </button>
              </div>
            )}

            {qrImage && (
              <div className="qr-box">
                <div className="qr-frame">
                  <img src={qrImage} alt="Hospital QR code" className="qr-img" />
                </div>

                <p className="qr-url" title={qrUrl}>
                  {qrUrl}
                </p>

                <div className="qr-actions">
                  <button onClick={downloadQR} className="qr-btn qr-btn-primary">
                    Download PNG
                  </button>
                  <button onClick={shareQR} className="qr-btn qr-btn-ghost">
                    Share link
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {notice && <p className="qr-notice">{notice}</p>}
      </section>
    </div>
  );
};

/* ---------- Skeleton loader ---------- */

const Skeleton = () => (
  <div className="qr-box" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading your QR code</span>

    <div className="qr-frame">
      <div className="sk sk-qr" />
    </div>

    <div className="sk sk-line" />

    <div className="qr-actions">
      <div className="sk sk-btn" />
      <div className="sk sk-btn" />
    </div>
  </div>
);

/* ---------- Styles ---------- */

const css = `
.qr-page {
  --ink: #0f2027;
  --muted: #5a6b73;
  --line: #dfe6e9;
  --surface: #ffffff;
  --bg: #f2f6f7;
  --accent: #0e7c86;
  --accent-dark: #0a5d65;

  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: clamp(16px, 5vw, 56px) clamp(14px, 4vw, 32px);
  background: var(--bg);
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--ink);
}
.qr-page *, .qr-page *::before, .qr-page *::after { box-sizing: border-box; }

.qr-card {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: clamp(20px, 5vw, 36px);
  box-shadow: 0 1px 2px rgba(15, 32, 39, .04), 0 12px 32px rgba(15, 32, 39, .06);
}

.qr-head { text-align: center; margin-bottom: clamp(20px, 5vw, 28px); }

.qr-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 10px;
}

.qr-title {
  margin: 0 0 8px;
  font-size: clamp(20px, 5vw, 26px);
  font-weight: 650;
  letter-spacing: -.01em;
}

.qr-sub {
  margin: 0;
  font-size: clamp(13px, 3.4vw, 14px);
  line-height: 1.55;
  color: var(--muted);
}

/* Shared QR area */
.qr-box { display: flex; flex-direction: column; align-items: center; }

.qr-frame {
  width: clamp(180px, 62vw, 250px);
  aspect-ratio: 1 / 1;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}

.qr-img { width: 100%; height: 100%; object-fit: contain; display: block; }

.qr-url {
  width: 100%;
  margin: 16px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

/* Buttons */
.qr-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 20px;
}

.qr-btn {
  flex: 1;
  min-height: 44px;
  padding: 12px 18px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease, transform .12s ease;
}
.qr-btn:active { transform: translateY(1px); }
.qr-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.qr-btn:disabled { opacity: .6; cursor: not-allowed; }

.qr-btn-primary { background: var(--accent); color: #fff; }
.qr-btn-primary:hover:not(:disabled) { background: var(--accent-dark); }

.qr-btn-ghost { background: #fff; color: var(--ink); border-color: var(--line); }
.qr-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

/* Empty state */
.qr-empty { display: flex; flex-direction: column; align-items: center; }
.qr-empty-art {
  width: clamp(96px, 26vw, 116px);
  aspect-ratio: 1 / 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 18px;
}
.qr-empty-art span {
  border: 2px solid var(--line);
  border-radius: 6px;
}
.qr-empty-art span:last-child { border-style: dashed; border-color: var(--accent); }
.qr-empty-text {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--muted);
  text-align: center;
  max-width: 30ch;
  line-height: 1.55;
}
.qr-empty .qr-btn { flex: 0 0 auto; width: 100%; max-width: 260px; }

.qr-notice {
  margin: 18px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
  text-align: center;
}

/* Skeleton */
.sk {
  position: relative;
  overflow: hidden;
  background: #e8eef0;
  border-radius: 8px;
}
.sk::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent);
  animation: sk-shimmer 1.4s infinite;
}
.sk-qr { width: 100%; height: 100%; border-radius: 6px; }
.sk-line { width: 70%; height: 12px; margin-top: 18px; }
.sk-btn { flex: 1; height: 44px; border-radius: 10px; }

@keyframes sk-shimmer { 100% { transform: translateX(100%); } }

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* Phones: stack the actions so tap targets stay wide */
@media (max-width: 400px) {
  .qr-actions { flex-direction: column; }
  .qr-card { border-radius: 14px; }
}

/* Tablet and up */
@media (min-width: 768px) {
  .qr-card { max-width: 520px; }
  .qr-frame { width: 260px; }
}

/* Desktop */
@media (min-width: 1200px) {
  .qr-frame { width: 280px; }
  .qr-url { font-size: 13px; }
}

@media (prefers-reduced-motion: reduce) {
  .sk::after { animation: none; }
  .qr-btn { transition: none; }
}
`;

export default QrGenerator;