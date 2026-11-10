/* Synthesized sound effects (Web Audio) — no files, mute toggle. */
const Sound = (() => {
  let ctx = null;
  let muted = false;
  const ensure = () => {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const blip = (f, d, type, g, w = 0) => {
    const c = ensure();
    if (!c || muted) return;
    const at = c.currentTime + w;
    const o = c.createOscillator();
    const ga = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, at);
    ga.gain.setValueAtTime(0.0001, at);
    ga.gain.linearRampToValueAtTime(g || 0.09, at + 0.012);
    ga.gain.exponentialRampToValueAtTime(0.0001, at + d);
    o.connect(ga).connect(c.destination);
    o.start(at);
    o.stop(at + d + 0.05);
  };
  return {
    resume() { ensure(); },
    point() { blip(880, 0.09, 'triangle', 0.06); },
    click() { blip(520, 0.05, 'sine', 0.05); },
    badge() { blip(660, 0.12, 'square', 0.045); blip(990, 0.16, 'square', 0.045, 0.09); },
    level() { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.18, 'triangle', 0.07, i * 0.1)); },
    win() { [784, 988, 1319].forEach((f, i) => blip(f, 0.2, 'triangle', 0.08, i * 0.11)); blip(1568, 0.34, 'sine', 0.05, 0.34); },
    ticks() {
      const c = ensure();
      if (!c || muted) return;
      let t = 0;
      for (let i = 0; i < 26; i++) { blip(900 - i * 14, 0.03, 'square', 0.04, t); t += 0.05 + i * 0.007; }
    },
    error() { blip(150, 0.22, 'sawtooth', 0.07); },
    toggle() { muted = !muted; if (!muted) { ensure(); blip(700, 0.08, 'triangle', 0.07); } return muted; },
    isMuted() { return muted; },
  };
})();

export default Sound;
