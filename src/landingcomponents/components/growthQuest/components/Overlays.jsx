import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useQuest } from '../context/QuestContext';
import { LEVELS, BADGE_DEFS } from '../data';
import { CONFETTI_COLORS } from '../theme';
import { prefersReduced } from '../utils/storage';
import { cx } from './common';

/* ---------------- HUD ---------------- */
export function Hud() {
  const { game, clinicName, openShare, openLeaderboard, muted, toggleSound } = useQuest();
  const [tucked, setTucked] = useState(() => window.innerWidth < 600);
  const { gp, level } = game;
  const cur = LEVELS[level].min;
  const next = level < LEVELS.length - 1 ? LEVELS[level + 1].min : gp;
  const span = next - cur || 1;
  const pct = level < LEVELS.length - 1 ? Math.min(100, ((gp - cur) / span) * 100) : 100;

  return (
    <>
      <div className={cx('ccgs-hud', tucked && 'ccgs-tucked')} aria-live="polite">
        <div className="ccgs-hud-top">
          <div className="ccgs-hud-lvl">
            <div className="ccgs-hud-badge">{level + 1}</div>
            <div className="ccgs-hud-lvl-txt">
              <div className="ccgs-k ccgs-hud-name">{clinicName || 'Clinic Level'}</div>
              <div className="ccgs-v">{LEVELS[level].name}</div>
            </div>
          </div>
          <div className="ccgs-hud-gp">
            <div className="ccgs-n">{gp}</div>
            <div className="ccgs-l">GP</div>
          </div>
        </div>
        <div className="ccgs-hud-bar"><i style={{ width: pct + '%' }} /></div>
        <div className="ccgs-hud-foot">
          <div className="ccgs-hud-badges">
            {Object.keys(BADGE_DEFS).map((id) => {
              const b = BADGE_DEFS[id];
              const on = game.badges.has(id);
              return (
                <div key={id} className={cx('ccgs-hud-chip', on && 'ccgs-on')}
                  title={b.name + ' — ' + b.desc + (on ? ' ✓' : ' (locked)')}>{b.icon}</div>
              );
            })}
          </div>
          <div className="ccgs-hud-tools">
            <button className="ccgs-hud-ic" title="Sound on/off" aria-label="Toggle sound" onClick={toggleSound}>{muted ? '🔇' : '🔊'}</button>
            <button className="ccgs-hud-ic" title="Share your score" aria-label="Share your score" onClick={openShare}>📤</button>
            <button className="ccgs-hud-ic" title="Leaderboard" aria-label="Leaderboard" onClick={openLeaderboard}>🏆</button>
          </div>
          <button className="ccgs-hud-toggle" onClick={() => setTucked(true)}>hide</button>
        </div>
      </div>
      <button className={cx('ccgs-hud-tab', tucked && 'ccgs-show')} aria-label="Show growth stats" onClick={() => setTucked(false)}>
        ◆ <span>{gp}</span> GP
      </button>
    </>
  );
}

/* ---------------- Toasts ---------------- */
export function Toasts() {
  const { toasts } = useQuest();
  return (
    <div className="ccgs-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={cx('ccgs-toast', t.gold && 'ccgs-gold')}>
          <div className="ccgs-ic">{t.icon || (t.gold ? '🏆' : '✦')}</div>
          <div>
            <div className="ccgs-t">{t.title}</div>
            {t.sub && <div className="ccgs-s">{t.sub}</div>}
          </div>
          {t.n ? <div className="ccgs-plus">+{t.n}</div> : null}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Level up ---------------- */
export function LevelUp() {
  const { levelUp, closeLevelUp } = useQuest();
  return (
    <div className={cx('ccgs-levelup', levelUp && 'ccgs-show')}>
      <div className="ccgs-levelup-card">
        <div className="ccgs-burst">⚡</div>
        <div className="ccgs-k">Level Up</div>
        <div className="ccgs-v">{levelUp ? levelUp.name : 'Rising Practice'}</div>
        <div className="ccgs-d">{levelUp ? levelUp.desc : ''}</div>
        <button className="ccgs-btn ccgs-btn-primary" onClick={closeLevelUp}>Keep growing →</button>
      </div>
    </div>
  );
}

/* ---------------- Confetti ---------------- */
export const Confetti = forwardRef(function Confetti(_, ref) {
  const cvRef = useRef(null);
  const parts = useRef([]);
  const raf = useRef(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const size = () => {
      if (!cvRef.current) return;
      cvRef.current.width = window.innerWidth;
      cvRef.current.height = window.innerHeight;
    };
    size();
    window.addEventListener('resize', size);
    return () => { window.removeEventListener('resize', size); cancelAnimationFrame(raf.current); };
  }, []);

  useImperativeHandle(ref, () => ({
    burst(count) {
      if (prefersReduced() || !cvRef.current) return;
      setShow(true);
      const W = window.innerWidth;
      const H = window.innerHeight;
      for (let i = 0; i < count; i++) {
        parts.current.push({
          x: W / 2 + (Math.random() - 0.5) * 220, y: H / 2 + (Math.random() - 0.5) * 80,
          vx: (Math.random() - 0.5) * 11, vy: Math.random() * -13 - 3, g: 0.32, r: Math.random() * 6 + 3,
          c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 120,
        });
      }
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    },
  }));

  function tick() {
    const cv = cvRef.current;
    if (!cv) { raf.current = 0; return; }
    const cx2 = cv.getContext('2d');
    cx2.clearRect(0, 0, cv.width, cv.height);
    parts.current.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      cx2.save(); cx2.translate(p.x, p.y); cx2.rotate(p.rot); cx2.fillStyle = p.c;
      cx2.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6); cx2.restore();
    });
    parts.current = parts.current.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
    if (parts.current.length) raf.current = requestAnimationFrame(tick);
    else { raf.current = 0; cx2.clearRect(0, 0, cv.width, cv.height); setShow(false); }
  }

  return <canvas ref={cvRef} className={cx('ccgs-confetti', show && 'ccgs-show')} />;
});
