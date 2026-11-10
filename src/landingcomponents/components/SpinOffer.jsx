import React, { useEffect, useRef, useState } from 'react';
import { useQuest } from '../context/QuestContext';
import { LEVELS } from '../data';
import { THEME } from '../theme';
import { LB_KEY, SHARE_URL } from '../config';
import { readJSON, writeJSON } from '../utils/storage';
import Sound from '../utils/sound';
import { addLeaderboardRun, getLeaderboardTop, sheetsConfigured } from '../services/sheetsApi';
import { cx } from './common';

/* ================= SHARE CARD ================= */
function rr(x, px, py, w, h, r) {
  if (x.roundRect) { x.beginPath(); x.roundRect(px, py, w, h, r); return; }
  x.beginPath();
  x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
}

function drawShareCard(cv, data) {
  const x = cv.getContext('2d'); const W = cv.width; const H = cv.height;
  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#EAF2FF');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow1 = x.createRadialGradient(W * 0.86, H * 0.08, 0, W * 0.86, H * 0.08, 440);
  glow1.addColorStop(0, `rgba(${THEME.primaryRgb},.16)`); glow1.addColorStop(1, `rgba(${THEME.primaryRgb},0)`);
  x.fillStyle = glow1; x.fillRect(0, 0, W, H);
  const glow2 = x.createRadialGradient(W * 0.08, H * 0.95, 0, W * 0.08, H * 0.95, 440);
  glow2.addColorStop(0, `rgba(${THEME.skyRgb},.14)`); glow2.addColorStop(1, `rgba(${THEME.skyRgb},0)`);
  x.fillStyle = glow2; x.fillRect(0, 0, W, H);
  // brand
  const lg = x.createLinearGradient(70, 64, 124, 118);
  lg.addColorStop(0, THEME.primary); lg.addColorStop(1, THEME.primaryDeep);
  x.fillStyle = lg; rr(x, 70, 64, 54, 54, 14); x.fill();
  x.fillStyle = '#FFFFFF'; x.font = '700 30px "Space Grotesk", sans-serif';
  x.textAlign = 'center'; x.fillText('C', 97, 102);
  x.textAlign = 'left';
  x.fillStyle = THEME.text; x.font = '600 30px "Space Grotesk", sans-serif';
  x.fillText('CareDesk360', 142, 92);
  x.fillStyle = THEME.muted; x.font = '700 15px "Space Mono", monospace';
  x.fillText('G R O W T H   Q U E S T', 142, 116);
  // headline number
  const ng = x.createLinearGradient(70, 220, 760, 420);
  ng.addColorStop(0, THEME.primary); ng.addColorStop(1, THEME.sky);
  x.fillStyle = ng; x.font = '700 210px "Space Grotesk", sans-serif';
  x.fillText(String(data.big), 64, 400);
  x.fillStyle = THEME.muted; x.font = '700 20px "Space Mono", monospace';
  x.fillText(data.unit, 74, 444);
  // level pill
  x.font = '600 42px "Space Grotesk", sans-serif';
  const lvlLabel = '⚡ ' + data.lvl;
  const lw = x.measureText(lvlLabel).width;
  x.fillStyle = `rgba(${THEME.primaryRgb},.10)`; rr(x, 64, 486, lw + 64, 76, 38); x.fill();
  x.strokeStyle = `rgba(${THEME.primaryRgb},.45)`; x.lineWidth = 2; rr(x, 64, 486, lw + 64, 76, 38); x.stroke();
  x.fillStyle = THEME.primary; x.fillText(lvlLabel, 96, 538);
  // right column stats
  x.textAlign = 'right';
  x.fillStyle = THEME.accent; x.font = '700 54px "Space Mono", monospace';
  x.fillText(data.gp + ' GP', W - 70, 392);
  x.fillStyle = THEME.muted; x.font = '500 24px "Inter", sans-serif';
  x.fillText(data.badges + ' / 7 badges earned', W - 70, 432);
  x.fillStyle = THEME.muted2; x.font = '500 22px "Inter", sans-serif';
  x.fillText('caredesk360.com', W - 70, 556);
  x.textAlign = 'left';
}

export function ShareModal() {
  const { game, quiz, shareOpen, setShareOpen } = useQuest();
  const cvRef = useRef(null);
  const quizDone = !!(quiz && quiz.done);
  const gs = quizDone ? quiz.pct : 0;
  const lvl = LEVELS[game.level].name;
  const head = quizDone ? 'I scored ' + gs + ' — ' + lvl : 'I earned ' + game.gp + ' GP — ' + lvl;
  const shareText = head + ' on the CareDesk360 Growth Quest 🚀 What’s your clinic’s growth score? ' + SHARE_URL;

  useEffect(() => {
    if (!shareOpen || !cvRef.current) return;
    drawShareCard(cvRef.current, {
      big: quizDone ? gs : game.gp,
      unit: quizDone ? 'GROWTH SCORE / 100' : 'GROWTH POINTS',
      lvl, gp: game.gp, badges: game.badgeCount,
    });
  }, [shareOpen, quizDone, gs, game.gp, game.badgeCount, lvl]);

  const close = () => setShareOpen(false);
  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(
        () => game.toast('Copied to clipboard', 'Paste it anywhere', null, true, '📋'),
        () => game.toast('Copy failed', 'Long-press to copy instead', null, false, '⚠️'),
      );
    }
  };
  const nativeShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'CareDesk360 Growth Quest', text: shareText }); } catch (e) { /* cancelled */ } } else copy();
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = cvRef.current.toDataURL('image/png');
    a.download = 'caredesk360-growth-score.png';
    a.click();
    game.toast('Card downloaded', 'Share it with your network', null, true, '🖼️');
  };

  return (
    <div className={cx('ccgs-gmodal', shareOpen && 'ccgs-show')} role="dialog" aria-modal="true" aria-label="Share your score"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="ccgs-gmodal-card">
        <button className="ccgs-gmodal-x" aria-label="Close" onClick={close}>✕</button>
        <div className="ccgs-eyebrow">Share your run</div>
        <h3>{head}</h3>
        <canvas ref={cvRef} className="ccgs-share-canvas" width="1200" height="630" />
        <div className="ccgs-share-stats">{game.gp} GP · {game.badgeCount}/7 badges · Level {game.level + 1} of {LEVELS.length}</div>
        <div className="ccgs-share-actions">
          <a className="ccgs-btn ccgs-btn-primary" target="_blank" rel="noopener noreferrer" href={'https://wa.me/?text=' + encodeURIComponent(shareText)}>💬 WhatsApp a peer</a>
          <button className="ccgs-btn ccgs-btn-primary" onClick={nativeShare}>📤 Share</button>
          <button className="ccgs-btn ccgs-btn-ghost" onClick={copy}>Copy text</button>
          <button className="ccgs-btn ccgs-btn-ghost" onClick={download}>Download card</button>
        </div>
      </div>
    </div>
  );
}

/* ================= LEADERBOARD (Google Sheet "Leaderboard") ================= */
const lbLocal = () => readJSON(LB_KEY, []) || [];
const MEDAL = ['🥇', '🥈', '🥉'];

export function LeaderboardModal() {
  const { game, quiz, lbOpen, setLbOpen, clinicName, spinLead } = useQuest();
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  const [me, setMe] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (sheetsConfigured()) {
      try {
        const top = await getLeaderboardTop(10);
        setRows(top.map((e) => ({ name: e.name, gp: +e.gp, level: e.level })));
        return;
      } catch (e) { /* fall back to local */ }
    }
    setRows(lbLocal().sort((a, b) => b.gp - a.gp).slice(0, 10));
  };

  useEffect(() => {
    if (!lbOpen) return;
    if (!name) setName(clinicName || (spinLead && spinLead.name) || '');
    load();
  }, [lbOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRun = async () => {
    const n = name.trim();
    if (!n) { game.toast('Add your name', 'So the board knows who to cheer for', null, false, '⚠️'); return; }
    const entry = {
      name: n,
      mobile: (spinLead && spinLead.mobile) || '',
      gp: game.gp,
      level: LEVELS[game.level].name,
      growth_score: quiz && quiz.done ? quiz.pct : '',
      at: Date.now(),
    };
    setMe({ name: entry.name, gp: entry.gp });
    setAdding(true);
    if (sheetsConfigured()) {
      try { await addLeaderboardRun({ ...entry, added_at: new Date(entry.at).toISOString() }); } catch (e) { /* keep local */ }
    }
    const a = lbLocal(); a.push(entry); writeJSON(LB_KEY, a);
    setAdding(false);
    game.once('lb', 15, 'On the board!', 'Your run is on the leaderboard', true);
    load();
  };

  return (
    <div className={cx('ccgs-gmodal', lbOpen && 'ccgs-show')} role="dialog" aria-modal="true" aria-label="Leaderboard"
      onClick={(e) => { if (e.target === e.currentTarget) setLbOpen(false); }}>
      <div className="ccgs-gmodal-card">
        <button className="ccgs-gmodal-x" aria-label="Close" onClick={() => setLbOpen(false)}>✕</button>
        <div className="ccgs-eyebrow">🏆 Growth leaderboard</div>
        <h3>Top clinic growth runs</h3>
        <ol className="ccgs-lb-list">
          {!rows.length && <div className="ccgs-lb-empty">No runs yet — be the first on the board!</div>}
          {rows.map((r, i) => (
            <li key={i + r.name + r.gp} className={cx('ccgs-lb-row', me && r.name === me.name && r.gp === me.gp && 'ccgs-me')}>
              <span className="ccgs-lb-rank">{MEDAL[i] || '#' + (i + 1)}</span>
              <span className="ccgs-lb-name">{r.name}</span>
              {r.level && <span className="ccgs-lb-lv">{r.level}</span>}
              <span className="ccgs-lb-gp">{r.gp} GP</span>
            </li>
          ))}
        </ol>
        <div className="ccgs-lb-submit">
          <input placeholder="Your name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="ccgs-btn ccgs-btn-primary" onClick={addRun} disabled={adding}>{adding ? 'Adding…' : 'Add my run'}</button>
        </div>
        <div className="ccgs-form-note">
          {sheetsConfigured() ? 'Live leaderboard — scores are shared across clinics.' : 'Scores are saved on this device. Connect the growth API to go live.'}
        </div>
      </div>
    </div>
  );
}

/* ================= SPIN FAB ================= */
export function SpinFab() {
  const { offer, shareOpen, lbOpen } = useQuest();
  const [show, setShow] = useState(false);
  const dismissed = useRef(false);
  const offerInView = useRef(false);
  const stateRef = useRef({ offer, shareOpen, lbOpen });
  stateRef.current = { offer, shareOpen, lbOpen };

  useEffect(() => {
    const sync = () => {
      const s = stateRef.current;
      setShow(!dismissed.current && !offerInView.current && window.scrollY > 420 && !s.offer && !s.shareOpen && !s.lbOpen);
    };
    let io;
    const target = document.getElementById('ccgs-offer');
    if (target && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => { offerInView.current = es[0].isIntersecting; sync(); }, { threshold: 0.15 });
      io.observe(target);
    }
    window.addEventListener('scroll', sync, { passive: true });
    const id = setInterval(sync, 1500);
    return () => { if (io) io.disconnect(); window.removeEventListener('scroll', sync); clearInterval(id); };
  }, []);

  useEffect(() => {
    if (offer || shareOpen || lbOpen) setShow(false);
  }, [offer, shareOpen, lbOpen]);

  return (
    <a href="#ccgs-offer" className={cx('ccgs-spin-fab', show && 'ccgs-show')}
      onClick={(e) => {
        e.preventDefault();
        dismissed.current = true;
        setShow(false);
        Sound.click();
        const el = document.getElementById('ccgs-offer');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }}>
      <span className="ccgs-w">🎡</span> Spin &amp; win up to 20% off
    </a>
  );
}
