import React, { useEffect, useRef, useState } from 'react';
import { useQuest } from '../context/QuestContext';
import { TIME_SLOTS, QUESTIONS, BADGE_DEFS } from '../data';
import {
  BOOKING_KEY, QUIZ_KEY, REFRESH_AFTER_BOOKING_MS, WHATSAPP_NUMBER, CONTACT_EMAIL,
} from '../config';
import { readJSON, writeJSON, removeKeys, clean } from '../utils/storage';
import Sound from '../utils/sound';
import { submitBooking } from '../services/sheetsApi';
import { AwardSection, Reveal, cx } from './common';

const EMPTY = { name: '', phone: '', time: '', clinic: '', location: '', agree: false };
const slug = (k) => k.toLowerCase().replace(/[^a-z0-9]+/g, '_');

/* Row for the "GrowthCalls" sheet — keys must match COLUMNS.GrowthCalls in Code.gs */
function buildBookingRow(form, quiz, offer, game) {
  const answers = (quiz && quiz.answers) || [];
  const row = {
    submitted_at: new Date().toISOString(),
    doctor_name: form.name.trim(),
    phone: form.phone.trim(),
    preferred_time: form.time,
    clinic_name: form.clinic.trim(),
    location: form.location.trim(),
    consent: form.agree ? 'Yes' : 'No',
    quiz_status: quiz && quiz.done ? 'Completed' : answers.length ? 'Partial (' + answers.length + '/' + QUESTIONS.length + ')' : 'Not taken',
    quiz_raw_score: answers.length ? answers.reduce((s, a) => s + a.points, 0) + '/' + QUESTIONS.length * 4 : '',
    growth_score: quiz && quiz.done ? quiz.pct : '',
    score_tier: quiz && quiz.done ? quiz.tier : '',
    recommended_plan: quiz && quiz.done ? quiz.rec : '',
    quiz_completed_at: (quiz && quiz.completedAt) || '',
    spin_code: offer ? offer.code : '',
    spin_discount: offer ? offer.discount + '%' : '',
    gp: game.gp,
    level: game.levelInfo.name,
    badges: Object.keys(BADGE_DEFS).filter((id) => game.badges.has(id)).map((id) => BADGE_DEFS[id].name).join(', '),
    page_url: window.location.href,
  };
  QUESTIONS.forEach((q) => {
    const a = answers.find((x) => x.k === q.k);
    row['q_' + slug(q.k) + '_answer'] = a ? a.answer : '';
    row['q_' + slug(q.k) + '_points'] = a ? a.points : '';
  });
  return row;
}

export default function BookingForm() {
  const { game, quiz, offer, spinLead, setClinicName } = useQuest();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(readJSON(BOOKING_KEY) || {}) }));
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [secs, setSecs] = useState(null);
  const reloadTimer = useRef(null);

  /* draft kept in localStorage until the booking is saved */
  useEffect(() => { if (!done) writeJSON(BOOKING_KEY, form); }, [form, done]);

  /* prefill from the spin gate */
  useEffect(() => {
    if (!spinLead) return;
    setForm((f) => ({ ...f, name: f.name || spinLead.name || '', phone: f.phone || spinLead.mobile || '' }));
  }, [spinLead]);

  useEffect(() => () => { clearInterval(reloadTimer.current); }, []);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErr((e) => ({ ...e, [k]: false }));
  };

  const phoneDigits = form.phone.replace(/[^0-9]/g, '');
  const n = [form.name.trim(), phoneDigits.length >= 10, form.time, form.agree].filter(Boolean).length;
  const pct = Math.round((n / 4) * 100);

  const submit = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name || !phone || !form.time || !form.agree) {
      game.toast('Almost there', 'Fill name, phone, pick a time and consent', null, false, '⚠️');
      setErr({ name: !name, phone: !phone, time: !form.time, agree: !form.agree });
      return;
    }
    if (saving) return;

    const activeOffer = offer && offer.expiresAt > Date.now() ? offer : null;
    setSaving(true);
    try {
      await submitBooking(buildBookingRow(form, quiz, activeOffer, game));
    } catch (e) {
      setSaving(false);
      game.toast('Could not save your request', 'Check your connection and try again', null, false, '⚠️');
      return;
    }

    /* saved → clear quiz + booking (spin reward is kept) */
    removeKeys(QUIZ_KEY, BOOKING_KEY);

    const codeLine = activeOffer ? activeOffer.discount + '% code ' + activeOffer.code : '';
    const msg = 'Hello CareDesk360! I’m ' + name + ' (' + phone + '). I’d like to book a growth call — preferred time: ' + form.time + '.'
      + (form.clinic ? ' Clinic: ' + form.clinic + (form.location ? ', ' + form.location : '') + '.' : (form.location ? ' Location: ' + form.location + '.' : ''))
      + (codeLine ? ' My spin-wheel reward: ' + codeLine + '.' : '');

    setClinicName(name);
    setDone({
      name: clean(name), phone: clean(phone), time: form.time, clinic: clean(form.clinic), location: clean(form.location), codeLine,
      wa: 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg),
      mail: 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Growth call request — ' + name) + '&body=' + encodeURIComponent(msg),
    });
    setSaving(false);
    game.once('form', 120, 'Growth call booked!', 'You reached your final growth level', true);
    game.unlock('committed');
    game.burst(90);
    Sound.win();

    /* refresh the page after the success screen */
    const until = Date.now() + REFRESH_AFTER_BOOKING_MS;
    setSecs(Math.ceil(REFRESH_AFTER_BOOKING_MS / 1000));
    reloadTimer.current = setInterval(() => {
      const s = Math.ceil((until - Date.now()) / 1000);
      if (s <= 0) { clearInterval(reloadTimer.current); window.location.reload(); } else setSecs(s);
    }, 250);
  };

  const ok = { color: 'var(--ccgs-primary)' };
  const bullet = { display: 'flex', gap: 11, alignItems: 'center', fontSize: 14, color: 'var(--ccgs-muted)' };
  const redBorder = { borderColor: 'var(--ccgs-danger)' };

  return (
    <AwardSection awardId="growth-call-form" className="ccgs-section ccgs-form-section">
      <div className="ccgs-wrap">
        <Reveal className="ccgs-eyebrow">Your next growth chapter</Reveal>
        <Reveal as="h2" className="ccgs-big">Let's plan your clinic's next stage of growth.</Reveal>
        <Reveal as="p" className="ccgs-lede" style={{ marginBottom: 8 }}>Share a convenient time to speak. Our healthcare growth team will understand your needs and recommend the right technology, visibility and patient-engagement plan.</Reveal>

        <div className="ccgs-form-grid" style={{ marginTop: 36 }}>
          <Reveal className="ccgs-form-card">
            <div className="ccgs-quiz-step">Plans start at</div>
            <div className="ccgs-price">₹3,999<small>/month</small></div>
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={bullet}><span style={ok}>✓</span> Free growth consultation</div>
              <div style={bullet}><span style={ok}>✓</span> Tailored plan recommendation</div>
              <div style={bullet}><span style={ok}>✓</span> Marketing + tech under one team</div>
              <div style={bullet}><span style={ok}>✓</span> Spin-wheel discount applies at booking</div>
            </div>
            <div className="ccgs-pill-note" style={{ marginTop: 22, width: '100%' }}>
              <span style={{ color: 'var(--ccgs-accent)' }}>🏆</span>&nbsp;Booking a call awards <b style={{ color: 'var(--ccgs-accent)' }}>+120 GP</b> — your final growth level.
            </div>
          </Reveal>

          <Reveal className="ccgs-form-card">
            {!done && (
              <div>
                <div className="ccgs-quiz-q">Book your <span style={ok}>growth call</span></div>
                <div className="ccgs-form-note" style={{ marginTop: 6 }}>Submit once to save your request. WhatsApp and email are optional after your enquiry is saved.</div>
                {offer && (
                  <div className="ccgs-form-offer-note">🎁 Your <b>{offer.discount}% code {offer.code}</b> will be applied to your selected plan on the call.</div>
                )}
                <div className="ccgs-frow">
                  <label>Doctor name <span className="ccgs-req">*</span></label>
                  <input type="text" placeholder="Dr. …" autoComplete="name" className={cx(form.name.trim() && 'ccgs-good')}
                    style={err.name ? redBorder : undefined} value={form.name}
                    onChange={(e) => set('name', e.target.value)} onBlur={(e) => setClinicName(e.target.value)} />
                </div>
                <div className="ccgs-frow">
                  <label>Phone number <span className="ccgs-req">*</span></label>
                  <input type="tel" placeholder="+91 …" autoComplete="tel" className={cx(phoneDigits.length >= 10 && 'ccgs-good')}
                    style={err.phone ? redBorder : undefined} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div className="ccgs-frow">
                  <label>Best time for the call <span className="ccgs-req">*</span></label>
                  <div className="ccgs-chip-row" style={err.time ? { outline: '1.5px solid var(--ccgs-danger)', borderRadius: 12 } : undefined}>
                    {TIME_SLOTS.map((t) => (
                      <button key={t.val} type="button" className={cx('ccgs-chip', form.time === t.val && 'ccgs-on')}
                        onClick={() => { set('time', t.val); Sound.click(); }}>
                        {t.icon} {t.label}<span>{t.range}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ccgs-frow">
                  <label>Clinic name <span style={{ color: 'var(--ccgs-muted-2)' }}>optional</span></label>
                  <input type="text" placeholder="Your clinic" value={form.clinic} onChange={(e) => set('clinic', e.target.value)} />
                </div>
                <div className="ccgs-frow">
                  <label>Location <span style={{ color: 'var(--ccgs-muted-2)' }}>optional</span></label>
                  <input type="text" placeholder="City / area" value={form.location} onChange={(e) => set('location', e.target.value)} />
                </div>
                <label className="ccgs-fcheck" style={err.agree ? { color: 'var(--ccgs-danger)' } : undefined}>
                  <input type="checkbox" checked={form.agree} onChange={(e) => set('agree', e.target.checked)} />
                  <span>I agree to be contacted by CareDesk360 about this growth consultation request.</span>
                </label>
                <div className="ccgs-fmeter">
                  <div className="ccgs-fmeter-top"><span>Booking strength</span><span>{pct}%{pct === 100 ? ' — ready to book!' : ''}</span></div>
                  <div className="ccgs-fmeter-bar"><i style={{ width: pct + '%' }} /></div>
                </div>
                <button className="ccgs-btn ccgs-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }} onClick={submit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save & book growth call ↗'}
                </button>
                <div className="ccgs-form-note">Saving keeps your enquiry with us — then send it on WhatsApp or email with one tap, pre-filled with your details and discount code.</div>
              </div>
            )}

            <div className={cx('ccgs-form-done', done && 'ccgs-show')}>
              {done && (
                <>
                  <div className="ccgs-big">🎉</div>
                  <h3>Request saved!</h3>
                  <p style={{ color: 'var(--ccgs-muted)', fontSize: 14.5 }}>Our growth team will reach out at your chosen time. Send your request now so it lands at the front of the queue:</p>
                  <div className="ccgs-fd-summary">
                    👨‍⚕️ <b>{done.name}</b> · 📱 <b>{done.phone}</b><br />
                    🕑 {done.time}{done.clinic ? ' · 🏥 ' + done.clinic : ''}{done.location ? ' · 📍 ' + done.location : ''}
                    {done.codeLine && (<><br />🎁 <span className="ccgs-cd">{done.codeLine}</span></>)}
                  </div>
                  <div className="ccgs-fd-actions">
                    <a className="ccgs-btn ccgs-btn-primary" href={done.wa} target="_blank" rel="noopener noreferrer">💬 Send on WhatsApp ↗</a>
                    <a className="ccgs-btn ccgs-btn-ghost" href={done.mail}>✉️ Send by email</a>
                  </div>
                  {secs != null && <div className="ccgs-refresh-note">Page refreshes in {secs}s</div>}
                </>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </AwardSection>
  );
}
