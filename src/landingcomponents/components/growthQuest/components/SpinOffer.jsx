import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuest } from '../context/QuestContext';
import { SEGMENTS, WEIGHTS } from '../data';
import { WHEEL_COLORS } from '../theme';
import { OFFER_DAYS } from '../config';
import { prefersReduced } from '../utils/storage';
import Sound from '../utils/sound';
import { submitSpin, checkSpin, sheetsConfigured } from '../services/sheetsApi';
import { AwardSection, Reveal, ScrollLink, cx } from './common';

const SEGA = 360 / SEGMENTS.length;
const okName = (v) => v.trim().length > 1;
const okMob = (v) => /^[0-9]{10}$/.test(v);
const okEm = (v) => /\S+@\S+\.\S+/.test(v);

function pickDisc() {
  const tot = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (const k of Object.keys(WEIGHTS)) { r -= WEIGHTS[k]; if (r <= 0) return +k; }
  return 10;
}
function makeCode(d) {
  const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for (let i = 0; i < 4; i++) t += s[(Math.random() * s.length) | 0];
  return 'CD360-' + d + '-' + t;
}
const restAngle = (d) => {
  const idx = SEGMENTS.indexOf(d);
  return idx >= 0 ? 360 * 6 - (idx * SEGA + SEGA / 2) : 0;
};
const wheelBg = 'conic-gradient(' + WHEEL_COLORS.map((c, i) => c + ' ' + i * SEGA + 'deg ' + (i + 1) * SEGA + 'deg').join(',') + ')';

export default function SpinOffer() {
  const { game, offer, setOffer, spinLead, setSpinLead, setClinicName, openShare } = useQuest();

  const [name, setName] = useState(spinLead ? spinLead.name || '' : '');
  const [mobile, setMobile] = useState(spinLead ? spinLead.mobile || '' : '');
  const [email, setEmail] = useState(spinLead ? spinLead.email || '' : '');
  const [consent, setConsent] = useState(false);
  const [bad, setBad] = useState({});
  const [msgs, setMsgs] = useState({});
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [wheel, setWheel] = useState(() => (offer ? { deg: restAngle(offer.discount), tr: 'none' } : { deg: 0, tr: '' }));
  const [left, setLeft] = useState(null);
  const timer = useRef(null);

  /* ---- save spin to Google Sheets (retried on next load if it failed) ---- */
  const syncSpin = useCallback(async (o) => {
    if (!o || o.synced || !sheetsConfigured()) return;
    try {
      const res = await submitSpin({
        name: o.name, mobile: o.mobile, email: o.email,
        discount: o.discount, code: o.code,
        spun_at: new Date(o.spunAt).toISOString(),
        expires_at: new Date(o.expiresAt).toISOString(),
      });
      if (res.duplicate && res.offer) {
        const existing = { ...o, discount: +res.offer.discount, code: res.offer.code, expiresAt: +res.offer.expiresAt, spunAt: +res.offer.spunAt, synced: true };
        setOffer(existing);
        setWheel({ deg: restAngle(existing.discount), tr: 'none' });
        game.toast('Welcome back', 'This mobile already has an active code', null, true, '🎟️');
      } else {
        setOffer({ ...o, synced: true });
      }
    } catch (e) {
      /* stays synced:false in localStorage → retried on next visit */
    }
  }, [setOffer, game]);

  useEffect(() => { if (offer && !offer.synced) syncSpin(offer); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- countdown ---- */
  useEffect(() => {
    if (!offer) { setLeft(null); return undefined; }
    const tick = () => {
      let diff = offer.expiresAt - Date.now();
      if (diff <= 0) {
        setOffer(null);
        setExpired(true);
        setUnlocked(false);
        setSpinning(false);
        setWheel({ deg: 0, tr: 'none' });
        return;
      }
      const dd = Math.floor(diff / 864e5); diff -= dd * 864e5;
      const hh = Math.floor(diff / 36e5); diff -= hh * 36e5;
      const mm = Math.floor(diff / 6e4); diff -= mm * 6e4;
      const ss = Math.floor(diff / 1e3);
      setLeft([[dd, 'days'], [hh, 'hrs'], [mm, 'min'], [ss, 'sec']]);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offer, setOffer]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const valid = { name: okName(name), mobile: okMob(mobile), email: okEm(email) };
  const readyCount = Object.values(valid).filter(Boolean).length;

  const fieldCls = (k) => cx(valid[k] && 'ccgs-good', !valid[k] && bad[k] && 'ccgs-bad');

  const unlock = async () => {
    const nextBad = { name: !valid.name, mobile: !valid.mobile, email: !valid.email };
    setBad(nextBad);
    setMsgs({
      name: valid.name ? '' : 'Please enter your name',
      mobile: valid.mobile ? '' : 'Enter a valid 10-digit mobile number',
      email: valid.email ? '' : 'Enter a valid email address',
    });
    let ok = valid.name && valid.mobile && valid.email;
    if (!consent) { game.toast('One more thing', 'Please accept the consent to spin', null, false, '⚠️'); ok = false; }
    if (!ok) return;

    const lead = { name: name.trim(), mobile: mobile.trim(), email: email.trim() };

    /* one spin per clinic: ask the sheet if this mobile already has an active code */
    if (sheetsConfigured()) {
      setChecking(true);
      try {
        const res = await checkSpin(lead.mobile);
        if (res.exists && res.offer) {
          const existing = {
            ...lead, discount: +res.offer.discount, code: res.offer.code,
            spunAt: +res.offer.spunAt, expiresAt: +res.offer.expiresAt, synced: true,
          };
          setSpinLead(lead);
          setClinicName(lead.name);
          setWheel({ deg: restAngle(existing.discount), tr: 'none' });
          setOffer(existing);
          setExpired(false);
          setChecking(false);
          game.toast('Welcome back', 'This mobile already has an active code', null, true, '🎟️');
          return;
        }
      } catch (e) { /* network issue → let them spin, the sheet dedupes on save */ }
      setChecking(false);
    }

    setSpinLead(lead);
    setClinicName(lead.name);
    setUnlocked(true);
    game.once('gate', 30, 'Details locked in', 'The wheel is yours — spin it', true);
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const d = pickDisc();
    setWheel({ deg: restAngle(d), tr: 'transform 4.2s cubic-bezier(.12,.75,.16,1)' });
    Sound.ticks();
    timer.current = setTimeout(() => {
      const spunAt = Date.now();
      const o = {
        discount: d, code: makeCode(d), spunAt, expiresAt: spunAt + OFFER_DAYS * 86400000,
        ...(spinLead || {}), synced: false,
      };
      setOffer(o);
      setExpired(false);
      game.once('spin', 80, d + '% OFF unlocked', 'Growth reward secured — valid 7 days', true);
      game.unlock('lucky');
      game.burst(60);
      Sound.win();
      syncSpin(o);
    }, prefersReduced() ? 150 : 4300);
  };

  const copyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(offer.code).then(
        () => game.toast('Code copied', offer.code, null, true, '📋'),
        () => game.toast('Copy failed', 'Please note it down', null, false, '⚠️'),
      );
    } else game.toast('Copy not available', 'Please note it down', null, false, '⚠️');
  };

  const phase = offer ? 'won' : unlocked ? 'ready' : 'gate';
  const hub = phase === 'won' ? offer.discount + '%' : phase === 'ready' ? 'SPIN\nNOW' : 'SPIN\n10–20%';
  const sub = phase === 'won'
    ? 'Locked in for 7 days — claim it on your growth call.'
    : phase === 'ready'
      ? 'You’re in — give it a spin. Every spin wins.'
      : expired ? 'Your previous code expired — spin again for a fresh one.' : 'Fill your details below to unlock the wheel — every spin wins.';

  return (
    <AwardSection awardId="offer" className="ccgs-section ccgs-offer">
      <div className="ccgs-wrap">
        <div className="ccgs-offer-grid">
          <Reveal>
            <div className="ccgs-eyebrow">Spin &amp; save</div>
            <h2>Spin the wheel.<br /><span className="ccgs-g">Unlock your discount.</span></h2>
            <p className="ccgs-lede">Every spin wins between 10% and 20% off a selected plan. Enter your details to unlock the wheel — your reward stays valid for 7 days.</p>
            <div className="ccgs-offer-stats">
              <div className="ccgs-ostat"><div className="ccgs-n">10–20%</div><div className="ccgs-l">Guaranteed discount</div></div>
              <div className="ccgs-ostat"><div className="ccgs-n">1 spin</div><div className="ccgs-l">Per clinic</div></div>
              <div className="ccgs-ostat"><div className="ccgs-n">7 days</div><div className="ccgs-l">To claim</div></div>
            </div>
            <p className="ccgs-offer-terms"><b>How it works:</b> share your name, mobile and email to unlock the wheel — you'll instantly win a discount code between 10% and 20%. One spin per clinic; mention your code on the growth call to redeem it. Applies to selected plans, exclusive of GST and ad budget.</p>
          </Reveal>

          <Reveal className="ccgs-spinner-card">
            <div className="ccgs-offer-badge">LIMITED</div>
            <div className="ccgs-quiz-step" style={{ marginBottom: 6 }}>{phase === 'won' ? '🎉 Reward unlocked' : '🎡 Your growth reward'}</div>
            <div className="ccgs-spin-sub">{sub}</div>
            <div className="ccgs-wheel-box">
              <div className="ccgs-wheel-ptr">▼</div>
              <div className="ccgs-wheel" style={{ background: wheelBg, transform: 'rotate(' + wheel.deg + 'deg)', transition: wheel.tr || undefined }}>
                <div className="ccgs-wheel-lbls">
                  {SEGMENTS.map((v, i) => {
                    const a = i * SEGA + SEGA / 2;
                    return (
                      <div key={v} className="ccgs-wheel-lbl"
                        style={{ transform: 'rotate(' + a + 'deg) translate(0,-84px) rotate(' + -a + 'deg) translate(-50%,-50%)' }}>{v}%</div>
                    );
                  })}
                </div>
              </div>
              <div className="ccgs-wheel-hub">{hub}</div>
            </div>

            {phase === 'gate' && (
              <div className="ccgs-spin-gate">
                <div className="ccgs-gfield">
                  <label htmlFor="ccgs-gName">👨‍⚕️ Full name</label>
                  <div className="ccgs-gin">
                    <input id="ccgs-gName" type="text" placeholder="Dr. …" autoComplete="name" className={fieldCls('name')}
                      value={name} onChange={(e) => setName(e.target.value)} onBlur={(e) => setClinicName(e.target.value)} />
                    <span className="ccgs-ok">✓</span>
                  </div>
                  <div className="ccgs-gmsg">{msgs.name}</div>
                </div>
                <div className="ccgs-gfield">
                  <label htmlFor="ccgs-gMobile">📱 Mobile number</label>
                  <div className="ccgs-gin">
                    <input id="ccgs-gMobile" type="tel" placeholder="10-digit mobile" inputMode="numeric" maxLength={10} autoComplete="tel"
                      className={fieldCls('mobile')} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} />
                    <span className="ccgs-ok">✓</span>
                  </div>
                  <div className="ccgs-gmsg">{msgs.mobile}</div>
                </div>
                <div className="ccgs-gfield">
                  <label htmlFor="ccgs-gEmail">✉️ Email address</label>
                  <div className="ccgs-gin">
                    <input id="ccgs-gEmail" type="email" placeholder="you@clinic.com" autoComplete="email" className={fieldCls('email')}
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                    <span className="ccgs-ok">✓</span>
                  </div>
                  <div className="ccgs-gmsg">{msgs.email}</div>
                </div>
                <label className="ccgs-gconsent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>I agree to be contacted by CareDesk360 about this offer and my growth consultation.</span>
                </label>
                <div className="ccgs-gate-meter">
                  <div className="ccgs-bar"><i style={{ width: (readyCount / 3) * 100 + '%' }} /></div>
                  <span>{readyCount} of 3 ready</span>
                </div>
                <button className="ccgs-btn ccgs-btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={unlock} disabled={checking}>
                  {checking ? 'Checking…' : '🔓 Unlock the wheel'}
                </button>
              </div>
            )}

            {phase === 'ready' && (
              <div className="ccgs-spin-ready">
                <button className="ccgs-btn ccgs-btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={spin} disabled={spinning}>
                  {spinning ? 'Spinning…' : '🎡 Spin now'}
                </button>
                <div className="ccgs-ghint">Good luck — every spin wins at least 10% off.</div>
              </div>
            )}

            {phase === 'won' && (
              <div className="ccgs-spin-won">
                <div className="ccgs-won-kicker">🎉 Congratulations, you won</div>
                <div className="ccgs-won-big">{offer.discount}% OFF</div>
                <div className="ccgs-coupon"><span className="ccgs-code">{offer.code}</span><button onClick={copyCode}>Copy</button></div>
                <div className="ccgs-cd-label">Offer expires in</div>
                <div className="ccgs-cd-boxes">
                  {(left || []).map(([n, u]) => (
                    <div className="ccgs-cd-box" key={u}><div className="ccgs-n">{String(n).padStart(2, '0')}</div><div className="ccgs-u">{u}</div></div>
                  ))}
                </div>
                <ScrollLink to="growth-call-form" className="ccgs-btn ccgs-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>Claim on my growth call ↗</ScrollLink>
                <button className="ccgs-btn ccgs-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={openShare}>📤 Share your luck with a peer</button>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </AwardSection>
  );
}
