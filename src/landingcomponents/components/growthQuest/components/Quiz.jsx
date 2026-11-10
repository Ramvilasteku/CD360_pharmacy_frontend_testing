import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuest } from '../context/QuestContext';
import { QUESTIONS, quizOutcome } from '../data';
import { THEME, SCORE_BAR_COLORS } from '../theme';
import { Reveal, ScrollLink, cx } from './common';

const MAX = QUESTIONS.length * 4;
const KEYS = ['A', 'B', 'C', 'D'];
const DASH = 314.16;

export default function Quiz() {
  const { game, quiz, setQuiz, openShare } = useQuest();
  const answers = quiz.answers || [];
  const qi = Math.min(answers.length, QUESTIONS.length - 1);
  const item = QUESTIONS[qi];
  const running = answers.reduce((s, a) => s + a.points, 0);
  const pct = quiz.done ? quiz.pct : Math.max(0, Math.min(100, (running / MAX) * 100));

  const pick = ([label, points]) => {
    const next = [...answers, { k: item.k, q: item.q, answer: label, points }];
    if (next.length < QUESTIONS.length) {
      setQuiz({ answers: next, done: false, updatedAt: new Date().toISOString() });
      return;
    }
    const raw = next.reduce((s, a) => s + a.points, 0);
    const p = Math.round((raw / MAX) * 100);
    const o = quizOutcome(p);
    setQuiz({
      answers: next, done: true, raw, max: MAX, pct: p,
      tier: o.tier, title: o.title, desc: o.desc, rec: o.rec,
      completedAt: new Date().toISOString(),
    });
    game.once('quiz', 150, 'Growth Score complete', 'Score: ' + p + '/100 — ' + o.title, true);
    game.unlock('diagnostician');
    game.burst(50);
  };

  const retake = () => setQuiz({ answers: [], done: false });

  return (
    <section className="ccgs-section ccgs-quiz" id="ccgs-quiz">
      <div className="ccgs-wrap">
        <div className="ccgs-quiz-grid">
          <Reveal className="ccgs-gauge-wrap">
            <svg className="ccgs-gauge" viewBox="0 0 240 150">
              <defs>
                <linearGradient id="ccgs-gg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor={THEME.soft} />
                  <stop offset="0.5" stopColor={THEME.sky} />
                  <stop offset="1" stopColor={THEME.primary} />
                </linearGradient>
              </defs>
              <path d="M20,140 A100,100 0 0 1 220,140" fill="none" stroke={`rgba(${THEME.shadowRgb},.1)`} strokeWidth="16" strokeLinecap="round" />
              <path d="M20,140 A100,100 0 0 1 220,140" fill="none" stroke="url(#ccgs-gg)" strokeWidth="16" strokeLinecap="round"
                strokeDasharray="314.16" strokeDashoffset={DASH - (DASH * pct) / 100}
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
              <g style={{ transition: 'transform 1s cubic-bezier(.2,.8,.2,1)', transformOrigin: '120px 140px', transform: 'rotate(' + (-90 + pct * 1.8) + 'deg)' }}>
                <line x1="120" y1="140" x2="120" y2="58" stroke={THEME.text} strokeWidth="3" strokeLinecap="round" />
                <circle cx="120" cy="140" r="8" fill={THEME.text} />
              </g>
            </svg>
            <div className="ccgs-gauge-num">
              <div className="ccgs-n">{Math.round(pct)}</div>
              <div className="ccgs-l">Growth Score</div>
            </div>
            <div className="ccgs-gauge-tier">{quiz.done ? quiz.tier : 'Answer to reveal →'}</div>
          </Reveal>

          <Reveal className="ccgs-quiz-card">
            <div className="ccgs-eyebrow">Clinic Growth Score</div>
            {!quiz.done && (
              <div>
                <div className="ccgs-quiz-step">Question {qi + 1} of {QUESTIONS.length}</div>
                <div className="ccgs-quiz-q">{item.q}</div>
                <div className="ccgs-quiz-opts">
                  {item.opts.map((o, idx) => (
                    <button key={qi + '-' + idx} className="ccgs-qopt" onClick={() => pick(o)}>
                      <span className="ccgs-k">{KEYS[idx]}</span>{o[0]}
                    </button>
                  ))}
                </div>
                <div className="ccgs-quiz-prog"><i style={{ width: (answers.length / QUESTIONS.length) * 100 + '%' }} /></div>
              </div>
            )}
            <div className={cx('ccgs-quiz-result', quiz.done && 'ccgs-show')}>
              {quiz.done && (
                <>
                  <div className="ccgs-eyebrow">Your diagnosis</div>
                  <h3>{quiz.title}</h3>
                  <p>{quiz.desc}</p>
                  <div className="ccgs-quiz-rec">
                    <div className="ccgs-l">Recommended starting point</div>
                    <div className="ccgs-v">{quiz.rec}</div>
                  </div>
                  <ScoreViz answers={answers} pct={quiz.pct} />
                  <ScrollLink to="offer" className="ccgs-btn ccgs-btn-gold" style={{ width: '100%', justifyContent: 'center' }}>🎡 Spin the wheel — claim your discount</ScrollLink>
                  <div className="ccgs-res-row">
                    <button className="ccgs-btn ccgs-btn-ghost" onClick={openShare}>📤 Challenge a peer</button>
                    <button className="ccgs-btn ccgs-btn-ghost" onClick={retake}>Retake ↻</button>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---- score breakdown bars + 6-month projection ---- */
function ScoreViz({ answers, pct }) {
  const [grown, setGrown] = useState(false);
  const lineRef = useRef(null);

  useEffect(() => {
    let a; let b;
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setGrown(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, []);

  const gain = Math.min(65, Math.round((100 - pct) * 0.55 + 12));
  const W = 320; const H = 132; const P = 14; const months = 6;
  const xs = (i) => P + (i * (W - 2 * P)) / months;
  const bv = (i) => 20 + i * 3.4;
  const gv = (i) => 20 + Math.pow(i, 1.22) * 3.4 * (1 + gain / 26);
  const vmax = gv(months) * 1.12;
  const Y = (v) => H - P - (v / vmax) * (H - 2 * P);
  let dA = 'M'; let dB = 'M';
  for (let i = 0; i <= months; i++) {
    dB += (i ? ' L' : '') + xs(i).toFixed(1) + ' ' + Y(bv(i)).toFixed(1);
    dA += (i ? ' L' : '') + xs(i).toFixed(1) + ' ' + Math.max(P, Y(gv(i))).toFixed(1);
  }
  const areaA = dA + ' L' + xs(months) + ' ' + (H - P) + ' L' + xs(0) + ' ' + (H - P) + ' Z';
  const endY = Math.max(P, Y(gv(months)));

  useLayoutEffect(() => {
    const p = lineRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    p.style.transition = 'none';
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.3,.7,.2,1) .3s';
    p.style.strokeDashoffset = '0';
  }, [dA]);

  return (
    <div className="ccgs-score-viz">
      <div className="ccgs-sv-h">Where you stand <span>· navy ◆ = top clinics</span></div>
      <div>
        {answers.map((a, i) => (
          <div className="ccgs-sbar" key={a.k}>
            <span className="ccgs-l">{a.k}</span>
            <span className="ccgs-t">
              <i style={{ background: SCORE_BAR_COLORS[i % SCORE_BAR_COLORS.length], width: grown ? (a.points / 4) * 100 + '%' : 0 }} />
              <span className="ccgs-bm" title="Top clinics" />
            </span>
            <span className="ccgs-v">{a.points}/4</span>
          </div>
        ))}
      </div>
      <div className="ccgs-sv-h" style={{ marginTop: 20 }}>Your 6-month booking projection</div>
      <svg className="ccgs-proj-chart" viewBox="0 0 320 132" preserveAspectRatio="none" aria-label="Projected bookings with CareDesk360 vs current path">
        <defs>
          <linearGradient id="ccgs-pgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`rgba(${THEME.primaryRgb},.30)`} />
            <stop offset="1" stopColor={`rgba(${THEME.primaryRgb},0)`} />
          </linearGradient>
        </defs>
        {[1, 2, 3].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={P + (g * (H - 2 * P)) / 4} y2={P + (g * (H - 2 * P)) / 4} stroke={`rgba(${THEME.shadowRgb},.08)`} strokeWidth="1" />
        ))}
        <path d={areaA} fill="url(#ccgs-pgrad)" opacity="0">
          <animate attributeName="opacity" to="1" dur="1.2s" begin="0.5s" fill="freeze" />
        </path>
        <path d={dB} fill="none" stroke={THEME.muted2} strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" />
        <path ref={lineRef} d={dA} fill="none" stroke={THEME.primary} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={xs(months)} cy={endY.toFixed(1)} r="5" fill={THEME.primary}>
          <animate attributeName="r" values="5;7;5" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <text x={xs(months) - 6} y={(endY - 10).toFixed(1)} textAnchor="end" fontSize="11" fontWeight="700" fill={THEME.accent} fontFamily="monospace">+{gain}%</text>
        <text x={P} y={H - 2} fontSize="9" fill={THEME.muted2} fontFamily="monospace">NOW</text>
        <text x={W - P} y={H - 2} textAnchor="end" fontSize="9" fill={THEME.muted2} fontFamily="monospace">6 MONTHS</text>
      </svg>
      <div className="ccgs-proj-legend">
        <span className="ccgs-pl ccgs-a">● With CareDesk360</span>
        <span className="ccgs-pl ccgs-b">● Current path</span>
        <span className="ccgs-pl ccgs-c">+{gain}% bookings</span>
      </div>
    </div>
  );
}
