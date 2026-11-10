import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import { LEVELS, BADGE_DEFS } from '../data';
import { QUIZ_KEY, OFFER_KEY, NAME_KEY } from '../config';
import { readJSON, writeJSON, readText, writeText, removeKeys } from '../utils/storage';
import Sound from '../utils/sound';

const QuestContext = createContext(null);
export const useQuest = () => useContext(QuestContext);

const EMPTY_QUIZ = { answers: [], done: false };

function loadOffer() {
  const o = readJSON(OFFER_KEY);
  if (o && o.expiresAt > Date.now()) return o;
  if (o) removeKeys(OFFER_KEY);
  return null;
}

export function QuestProvider({ children }) {
  /* ---------------- game engine (refs = always-current values) ---------------- */
  const gpRef = useRef(0);
  const levelRef = useRef(0);
  const badgesRef = useRef(new Set());
  const awardedRef = useRef(new Set());
  const [, force] = useReducer((x) => x + 1, 0);

  const [toasts, setToasts] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const confettiRef = useRef(null);
  const toastId = useRef(0);

  const burst = useCallback((count) => {
    if (confettiRef.current) confettiRef.current.burst(count);
  }, []);

  const toast = useCallback((title, sub, n, gold, icon) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, title, sub, n, gold, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3300);
    if (icon === '⚠️') Sound.error();
  }, []);

  const add = useCallback((n, title, sub, gold) => {
    gpRef.current += n;
    toast(title, sub, n, gold);
    let lv = 0;
    LEVELS.forEach((L, i) => { if (gpRef.current >= L.min) lv = i; });
    if (lv > levelRef.current) {
      levelRef.current = lv;
      setLevelUp(LEVELS[lv]);
      burst(80);
      Sound.level();
    }
    Sound.point();
    force();
  }, [toast, burst]);

  const once = useCallback((key, n, title, sub, gold) => {
    if (awardedRef.current.has(key)) return false;
    awardedRef.current.add(key);
    add(n, title, sub, gold);
    return true;
  }, [add]);

  const unlock = useCallback((id) => {
    if (badgesRef.current.has(id)) return;
    badgesRef.current.add(id);
    const b = BADGE_DEFS[id];
    toast('Badge unlocked · ' + b.name, b.desc, null, true, b.icon);
    burst(30);
    Sound.badge();
    force();
  }, [toast, burst]);

  /* ---------------- personalisation ---------------- */
  const [clinicName, setClinicNameState] = useState(() => readText(NAME_KEY) || '');
  const setClinicName = useCallback((n) => {
    const v = String(n || '').trim();
    if (!v) return;
    setClinicNameState(v);
    writeText(NAME_KEY, v);
  }, []);

  /* ---------------- quiz (kept in localStorage until booking) ---------------- */
  const [quiz, setQuizState] = useState(() => readJSON(QUIZ_KEY) || EMPTY_QUIZ);
  const setQuiz = useCallback((q) => {
    setQuizState(q);
    if (q && q.answers && q.answers.length) writeJSON(QUIZ_KEY, q);
    else removeKeys(QUIZ_KEY);
  }, []);

  /* ---------------- spin reward (kept 7 days) ---------------- */
  const [offer, setOfferState] = useState(loadOffer);
  const [spinLead, setSpinLead] = useState(() => {
    const o = loadOffer();
    return o ? { name: o.name, mobile: o.mobile, email: o.email } : null;
  });
  const setOffer = useCallback((o) => {
    setOfferState(o);
    if (o) writeJSON(OFFER_KEY, o);
    else removeKeys(OFFER_KEY);
  }, []);

  /* ---------------- modals + sound ---------------- */
  const [shareOpen, setShareOpen] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const openShare = useCallback(() => { setShareOpen(true); Sound.click(); }, []);
  const openLeaderboard = useCallback(() => { setLbOpen(true); Sound.click(); }, []);
  const toggleSound = useCallback(() => {
    const m = Sound.toggle();
    setMuted(m);
    toast(m ? 'Sound off' : 'Sound on', m ? 'Effects muted' : 'Arcade mode restored', null, false, m ? '🔇' : '🔊');
  }, [toast]);

  useEffect(() => {
    const resume = () => Sound.resume();
    window.addEventListener('pointerdown', resume, { once: true });
    return () => window.removeEventListener('pointerdown', resume);
  }, []);

  const gp = gpRef.current;
  const level = levelRef.current;
  const badgeCount = badgesRef.current.size;

  const value = useMemo(() => ({
    game: {
      gp, level, levelInfo: LEVELS[level], badges: badgesRef.current, badgeCount,
      add, once, unlock, toast, burst,
    },
    toasts, levelUp, closeLevelUp: () => setLevelUp(null), confettiRef,
    clinicName, setClinicName,
    quiz, setQuiz,
    offer, setOffer, spinLead, setSpinLead,
    shareOpen, setShareOpen, openShare,
    lbOpen, setLbOpen, openLeaderboard,
    muted, toggleSound,
  }), [gp, level, badgeCount, add, once, unlock, toast, burst, toasts, levelUp, clinicName, setClinicName,
    quiz, setQuiz, offer, setOffer, spinLead, shareOpen, openShare, lbOpen, openLeaderboard, muted, toggleSound]);

  return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
}
