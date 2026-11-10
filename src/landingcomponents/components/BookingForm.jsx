import React, { useEffect, useRef, useState } from 'react';
import { useQuest } from '../context/QuestContext';
import { JOURNEY } from '../data';
import { THEME } from '../theme';
import { prefersReduced } from '../utils/storage';
import { Reveal, ScrollLink, cx } from './common';

/* ---------------- NAV ---------------- */
export function Nav() {
  const { game } = useQuest();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className="ccgs-nav" id="ccgs-top" style={{ borderBottomColor: scrolled ? 'var(--ccgs-line-strong)' : 'var(--ccgs-line)' }}>
      <div className="ccgs-nav-in">
        <ScrollLink to="top" className="ccgs-brand"><span className="ccgs-logo">C</span>CareDesk360</ScrollLink>
        <div className="ccgs-nav-links">
          <ScrollLink to="quiz">Your score</ScrollLink>
          <ScrollLink to="platform">Growth stack</ScrollLink>
          <ScrollLink to="comparison">Compare</ScrollLink>
          <ScrollLink to="offer">🎡 Spin &amp; Win</ScrollLink>
        </div>
        <div className="ccgs-nav-cta">
          <span className="ccgs-nav-mini ccgs-mono">Lv.{game.level + 1} · {game.gp} GP</span>
          <ScrollLink to="quiz" className="ccgs-btn ccgs-btn-primary">🩺 Check your clinic score</ScrollLink>
        </div>
      </div>
    </nav>
  );
}

/* ---------------- HERO ---------------- */
const PULSE_D = 'M0,110 L40,110 L52,110 L58,70 L66,130 L74,92 L110,92 L120,92 L128,58 L136,120 L144,80 L185,80 L196,80 L204,44 L212,104 L220,66 L262,66 L272,66 L280,34 L288,92 L296,54 L340,54 L352,54 L360,26 L368,78 L376,42 L400,42';

export function Hero() {
  const { game } = useQuest();
  const pathRef = useRef(null);
  const dotRef = useRef(null);
  const [done, setDone] = useState([]);

  useEffect(() => {
    if (prefersReduced() || !pathRef.current) return undefined;
    const path = pathRef.current;
    const len = path.getTotalLength();
    let t = 0;
    let id;
    const move = () => {
      t = (t + 0.0016) % 1;
      const p = path.getPointAtLength(t * len);
      if (dotRef.current) { dotRef.current.setAttribute('cx', p.x); dotRef.current.setAttribute('cy', p.y); }
      id = requestAnimationFrame(move);
    };
    move();
    return () => cancelAnimationFrame(id);
  }, []);

  const activate = (stage) => {
    if (done.includes(stage)) return;
    const next = [...done, stage];
    setDone(next);
    game.add(15, stage + ' activated', 'Patient journey engine');
    if (next.length === 4) {
      game.unlock('journey');
      game.add(25, 'Growth engine online', 'Discover → Book → Visit → Return', true);
    }
  };

  return (
    <>
      <header className="ccgs-hero ccgs-wrap">
        <div className="ccgs-hero-grid">
          <div>
            <div className="ccgs-hero-tag"><span className="ccgs-dot" />Hyderabad's fast-growing healthcare growth partner</div>
            <h1>Hello Doctor,<br />meet <span className="ccgs-accent">CareDesk360.</span></h1>
            <p className="ccgs-sub">Smart clinic management, patient engagement and complete growth support — brought together in one connected healthcare ecosystem. Explore the page to level up your clinic and unlock your growth score.</p>
            <div className="ccgs-hero-cta">
              <ScrollLink to="quiz" className="ccgs-btn ccgs-btn-primary">🩺 Check your clinic score →</ScrollLink>
              <ScrollLink to="offer" className="ccgs-btn ccgs-btn-ghost">🎡 Spin &amp; win 10–20% off ↓</ScrollLink>
            </div>
            <div className="ccgs-hero-stats">
              <div className="ccgs-hstat"><div className="ccgs-n">100+</div><div className="ccgs-l">Clinics partnered</div></div>
              <div className="ccgs-hstat"><div className="ccgs-n">₹3,999</div><div className="ccgs-l">Plans start monthly</div></div>
              <div className="ccgs-hstat"><div className="ccgs-n">One</div><div className="ccgs-l">Connected partner</div></div>
            </div>
          </div>

          <Reveal className="ccgs-console">
            <div className="ccgs-console-head">
              <span className="ccgs-lbl">Clinic growth desk</span>
              <span className="ccgs-live"><i /> Everything in sync</span>
            </div>
            <div className="ccgs-vitals">
              <svg viewBox="0 0 400 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ccgs-pg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={THEME.sky} />
                    <stop offset="1" stopColor={THEME.primary} />
                  </linearGradient>
                </defs>
                <line className="ccgs-grid-lines" x1="0" y1="37" x2="400" y2="37" />
                <line className="ccgs-grid-lines" x1="0" y1="75" x2="400" y2="75" />
                <line className="ccgs-grid-lines" x1="0" y1="113" x2="400" y2="113" />
                <path ref={pathRef} className="ccgs-pulse-path" d={PULSE_D} />
                <circle ref={dotRef} className="ccgs-pulse-dot" r="4" cx="0" cy="110" />
              </svg>
              <div className="ccgs-rise ccgs-mono">▲ growth trending</div>
            </div>

            <div className="ccgs-journey">
              {JOURNEY.map((j) => (
                <button key={j.stage} className={cx('ccgs-jstage', done.includes(j.stage) && 'ccgs-done')} onClick={() => activate(j.stage)}>
                  <span className="ccgs-ji">{j.ji}</span><span className="ccgs-jt">{j.stage}</span>
                  <span className="ccgs-js">{j.js}</span><span className="ccgs-check">✓</span>
                </button>
              ))}
            </div>
            <div className="ccgs-jhint">
              {done.length === 4
                ? '✓ Full patient journey activated — your growth engine is live.'
                : 'Tap each stage of the patient journey to activate your growth engine →'}
            </div>

            <div className="ccgs-console-metrics">
              <div className="ccgs-cmetric"><div className="ccgs-l">Appointments</div><div className="ccgs-v">Organised</div></div>
              <div className="ccgs-cmetric"><div className="ccgs-l">WhatsApp</div><div className="ccgs-v">Automated</div></div>
              <div className="ccgs-cmetric"><div className="ccgs-l">Visibility</div><div className="ccgs-v">Strengthened</div></div>
            </div>
          </Reveal>
        </div>
      </header>

      <div className="ccgs-marquee">
        <div className="ccgs-marquee-track">
          {[0, 1].flatMap((r) => ['Smart operations', 'Stronger visibility', 'Better patient experience', 'Connected growth']
            .map((t) => <span key={r + t}>{t}</span>))}
        </div>
      </div>
    </>
  );
}
