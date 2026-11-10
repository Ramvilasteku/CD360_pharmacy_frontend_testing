// src/pharmacy/b2b/SendB2BInvoiceDialog.js
//
// Sends one B2B invoice to the buyer as a PDF.
//
//   Everywhere   Email — the PDF is attached and goes to the buyer's address on file
//                (or one you type), with a message you can change first. Download the PDF too.
//   On a phone   WhatsApp — two ways: a chat with the buyer that carries a link to the PDF,
//                or the PDF file itself handed to the phone's share sheet so it goes as an
//                attachment (you pick the buyer's chat there).
//
// Backend: routes/pharmacy/pharmacyB2BSales.js @ /api/pharmacy/b2b-sales
//   GET  /send-info/:id     buyer email / phone, the default subject and message
//   GET  /pdf/:id           the PDF (?download=1)
//   POST /send-email/:id    { to, cc, subject, message }
//   POST /share-link/:id    a 30-day link to the PDF + the WhatsApp text
//
// Needs pharmacy.sales.view; the Email part also needs pharmacy.sales.create or .edit.
//
// Usage
//   <SendB2BInvoiceDialog
//     invoice={{ id: 12, invoice_number: "B2B-2026-0012", buyer_name: "Sri Sai Medicals" }}
//     onClose={() => setSending(null)}
//     onSent={({ id, to }) => …}          // optional: the email went
//   />
//   Render it only when there is an invoice to send — `invoice` being null closes it.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Link, Skeleton, Stack, TextField, Typography, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import IosShareIcon from "@mui/icons-material/IosShare";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import useAccess from "../../hooks/useAccess";
import { ColorRoot, cssVar } from "../../theme/appColors";

const API_BASE = process.env.REACT_APP_SITE_URL || "";
const B2B_API = `${API_BASE}/api/pharmacy/b2b-sales`;
const http = axios.create({ withCredentials: true });

/* ---------- helpers ---------- */
const inr = (n) =>
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMAIL_RE = /^[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']+$/;
const splitEmails = (v) => String(v || "").split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
const emailsOk = (v) => {
  const l = splitEmails(v);
  return l.length > 0 && l.every((e) => EMAIL_RE.test(e));
};

/* Same rule the server uses: digits only, with a country code (a bare 10-digit number is Indian). */
function waNumber(raw) {
  let d = String(raw || "").replace(/\D+/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10) d = `91${d}`;
  else if (d.length === 11 && d.startsWith("0")) d = `91${d.slice(1)}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

const isPhoneBrowser = () =>
  typeof navigator !== "undefined" &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "") ||
    (/Macintosh/i.test(navigator.userAgent || "") && (navigator.maxTouchPoints || 0) > 1));

/* A failed blob request carries its JSON error as a Blob. */
async function apiMessage(err, fallback) {
  const d = err?.response?.data;
  if (d && typeof Blob !== "undefined" && d instanceof Blob) {
    try {
      return JSON.parse(await d.text()).message || fallback;
    } catch (_) {
      return fallback;
    }
  }
  return d?.message || err?.message || fallback;
}

async function fetchPdf(id, download) {
  const r = await http.get(`${B2B_API}/pdf/${id}`, { params: download ? { download: 1 } : undefined, responseType: "blob" });
  return r.data;
}

function Section({ icon, title, children }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, p: { xs: 1.75, sm: 2 } }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        {icon}
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

/* ================================================================== */
function SendB2BInvoiceDialogInner({ invoice, onClose, onSent }) {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const phone = narrow || isPhoneBrowser();      // WhatsApp is offered on phones
  const { canAny } = useAccess();
  const canEmail = canAny("pharmacy.sales.create", "pharmacy.sales.edit");

  const id = invoice?.id;
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // email
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentNote, setSentNote] = useState(null);       // { severity, text }

  // pdf
  const [downloading, setDownloading] = useState(false);
  const [pdfNote, setPdfNote] = useState(null);

  // whatsapp
  const [waPhone, setWaPhone] = useState("");
  const [share, setShare] = useState(null);             // { url, message }
  const [shareError, setShareError] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);         // the PDF as a File, ready for the share sheet
  const [canShareFile, setCanShareFile] = useState(false);

  /* ---------- load who it goes to ---------- */
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    setInfo(null);
    setError(null);
    setSentNote(null);
    setPdfNote(null);
    setShare(null);
    setShareError(null);
    setPdfFile(null);
    setCanShareFile(false);
    setShowCc(false);
    setCc("");
    setLoading(true);
    http
      .get(`${B2B_API}/send-info/${id}`)
      .then((r) => {
        if (!alive) return;
        const d = r.data.data;
        setInfo(d);
        setTo(d.buyer?.email || "");
        setSubject(d.default_subject || "");
        setMessage(d.default_message || "");
        setWaPhone(d.whatsapp_phone || "");
      })
      .catch(async (e) => {
        const m = await apiMessage(e, "Couldn't load the sending details");
        if (alive) setError(m);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  /* ---------- phone: get the link and the file ready BEFORE the tap, so that
     the WhatsApp button is a plain link and the share sheet opens straight from the
     tap (browsers refuse both if there is a network wait in between) ---------- */
  useEffect(() => {
    if (!phone || !info || info.status === "cancelled") return undefined;
    let alive = true;
    http
      .post(`${B2B_API}/share-link/${info.id}`)
      .then((r) => alive && setShare(r.data.data))
      .catch(async (e) => {
        const m = await apiMessage(e, "Couldn't make the WhatsApp link");
        if (alive) setShareError(m);
      });
    fetchPdf(info.id)
      .then((blob) => {
        if (!alive) return;
        const file = new File([blob], `${info.invoice_number}.pdf`, { type: "application/pdf" });
        setPdfFile(file);
        try {
          setCanShareFile(!!(navigator.canShare && navigator.canShare({ files: [file] })));
        } catch (_) {
          setCanShareFile(false);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [phone, info]);

  /* ---------- actions ---------- */
  const sendEmail = async () => {
    setSending(true);
    setSentNote(null);
    try {
      const r = await http.post(`${B2B_API}/send-email/${info.id}`, {
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        message,
      });
      setSentNote({ severity: "success", text: r.data.message || "Sent" });
      if (onSent) onSent({ id: info.id, to: r.data.data?.to || splitEmails(to) });
    } catch (e) {
      setSentNote({ severity: "error", text: await apiMessage(e, "Couldn't send the email") });
    } finally {
      setSending(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    setPdfNote(null);
    try {
      const blob = await fetchPdf(info.id, true);
      const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${info.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (e) {
      setPdfNote(await apiMessage(e, "Couldn't get the PDF"));
    } finally {
      setDownloading(false);
    }
  };

  const shareFile = async () => {
    try {
      await navigator.share({ files: [pdfFile], title: subject || info.invoice_number, text: share?.message ? share.message.split("\n").slice(0, 3).join("\n") : info.invoice_number });
    } catch (e) {
      if (e?.name !== "AbortError") setShareError("Couldn't open the share sheet on this phone — use the WhatsApp button instead");
    }
  };

  /* the WhatsApp chat: the buyer's number if we have one, otherwise WhatsApp asks who */
  const waHref = useMemo(() => {
    if (!share) return null;
    const n = waNumber(waPhone);
    return `https://wa.me/${n || ""}?text=${encodeURIComponent(share.message)}`;
  }, [share, waPhone]);

  const cancelled = info?.status === "cancelled";
  const emailValid = emailsOk(to) && (!cc.trim() || emailsOk(cc));
  const close = useCallback(() => onClose && onClose(), [onClose]);

  return (
    <Dialog open={!!invoice} onClose={close} maxWidth="sm" fullWidth fullScreen={narrow}>
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 1, pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }} noWrap>
            Send {invoice?.invoice_number}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontWeight: 400 }} noWrap>
            {[info?.buyer?.name || invoice?.buyer_name, info ? `₹${inr(info.grand_total)}` : null].filter(Boolean).join("  ·  ")}
          </Typography>
        </Box>
        <IconButton size="small" onClick={close} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading || (!info && !error) ? (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={190} />
            <Skeleton variant="rounded" height={70} />
          </Stack>
        ) : error ? (
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {cancelled && (
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, fontSize: 13 }}>
                This invoice is cancelled, so it can't be sent.
              </Alert>
            )}

            {/* ---------------- email ---------------- */}
            {canEmail && (
              <Section icon={<EmailOutlinedIcon sx={{ fontSize: 20, color: "primary.main" }} />} title="Email the PDF">
                {!info.buyer?.email && (
                  <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, fontSize: 12.5, mb: 1.5, py: 0 }}>
                    {info.buyer?.name || "This buyer"} has no email address on file — type one below.
                  </Alert>
                )}
                <Stack spacing={1.5}>
                  <TextField
                    label="To"
                    size="small"
                    fullWidth
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={cancelled}
                    placeholder="buyer@example.com"
                    error={!!to.trim() && !emailsOk(to)}
                    helperText={!!to.trim() && !emailsOk(to) ? "Enter a valid email address (separate several with commas)" : undefined}
                    inputProps={{ inputMode: "email", autoCapitalize: "off" }}
                  />
                  {showCc ? (
                    <TextField
                      label="Cc"
                      size="small"
                      fullWidth
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      disabled={cancelled}
                      error={!!cc.trim() && !emailsOk(cc)}
                      helperText={!!cc.trim() && !emailsOk(cc) ? "One of these isn't a valid email address" : undefined}
                      inputProps={{ inputMode: "email", autoCapitalize: "off" }}
                    />
                  ) : (
                    <Link component="button" type="button" underline="hover" onClick={() => setShowCc(true)} sx={{ alignSelf: "flex-start", fontSize: 12.5 }}>
                      Add Cc
                    </Link>
                  )}
                  <TextField label="Subject" size="small" fullWidth value={subject} onChange={(e) => setSubject(e.target.value)} disabled={cancelled} />
                  <TextField label="Message" size="small" fullWidth multiline minRows={4} maxRows={10} value={message} onChange={(e) => setMessage(e.target.value)} disabled={cancelled} />
                </Stack>
                <Collapse in={!!sentNote}>
                  {sentNote && (
                    <Alert severity={sentNote.severity} variant="outlined" sx={{ borderRadius: 2, fontSize: 13, mt: 1.5 }}>
                      {sentNote.text}
                    </Alert>
                  )}
                </Collapse>
                <Button
                  variant="contained"
                  disableElevation
                  fullWidth={narrow}
                  disabled={!emailValid || sending || cancelled}
                  onClick={sendEmail}
                  startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <EmailOutlinedIcon />}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, mt: 1.5 }}
                >
                  {sentNote?.severity === "success" ? "Send again" : "Send email"}
                </Button>
              </Section>
            )}

            {/* ---------------- whatsapp (phones) ---------------- */}
            {phone && (
              <Section icon={<WhatsAppIcon sx={{ fontSize: 20, color: cssVar("whatsapp") }} />} title="WhatsApp">
                <Stack spacing={1.5}>
                  <TextField
                    label="Buyer's WhatsApp number"
                    size="small"
                    fullWidth
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    disabled={cancelled}
                    placeholder="98765 43210"
                    inputProps={{ inputMode: "tel" }}
                    error={!!waPhone.trim() && !waNumber(waPhone)}
                    helperText={
                      !!waPhone.trim() && !waNumber(waPhone)
                        ? "That doesn't look like a full number"
                        : waPhone.trim()
                        ? "Country code defaults to +91"
                        : "Leave empty and WhatsApp will ask who to send it to"
                    }
                  />
                  <Button
                    component="a"
                    href={waHref || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    disableElevation
                    disabled={!waHref || cancelled}
                    startIcon={!share && !shareError ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon />}
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, bgcolor: cssVar("whatsapp"), color: cssVar("white"), "&:hover": { bgcolor: `color-mix(in srgb, ${cssVar("whatsapp")} 88%, black)` } }}
                  >
                    Send on WhatsApp
                  </Button>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mt: "-4px !important" }}>
                    Opens a chat with a link to the PDF. The link stays valid for {share?.expires_in_days || 30} days.
                  </Typography>
                  {canShareFile && (
                    <>
                      <Button
                        variant="outlined"
                        disabled={cancelled}
                        onClick={shareFile}
                        startIcon={<IosShareIcon />}
                        sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                      >
                        Share the PDF file
                      </Button>
                      <Typography sx={{ fontSize: 12, color: "text.secondary", mt: "-4px !important" }}>
                        Attaches the PDF itself — choose WhatsApp, then the buyer.
                      </Typography>
                    </>
                  )}
                  {shareError && (
                    <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, fontSize: 12.5, py: 0 }}>
                      {shareError}
                    </Alert>
                  )}
                </Stack>
              </Section>
            )}

           
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={close} sx={{ textTransform: "none" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SendB2BInvoiceDialog(props) {
  return (
    <ColorRoot>
      <SendB2BInvoiceDialogInner {...props} />
    </ColorRoot>
  );
}
