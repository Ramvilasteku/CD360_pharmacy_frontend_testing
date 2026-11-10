export const LEVELS = [
  { name: 'Local Clinic', min: 0, desc: "You're on the map. Start exploring to grow." },
  { name: 'Rising Practice', min: 120, desc: 'Momentum building — patients are noticing you.' },
  { name: 'Trusted Name', min: 300, desc: 'Your reputation is compounding across the journey.' },
  { name: 'Growth Leader', min: 560, desc: "You're outpacing fragmented setups. Keep going." },
  { name: 'Regional Powerhouse', min: 850, desc: 'Fully connected growth. This is what CareDesk360 unlocks.' },
];

export const BADGE_DEFS = {
  explorer: { icon: '🧭', name: 'Explorer', desc: 'Explored the growth outcomes' },
  journey: { icon: '🗺️', name: 'Journey Mapper', desc: 'Activated the full patient journey' },
  collector: { icon: '🃏', name: 'Collector', desc: 'Collected all 6 growth modules' },
  diagnostician: { icon: '🩺', name: 'Diagnostician', desc: 'Completed your Clinic Growth Score' },
  strategist: { icon: '⚔️', name: 'Strategist', desc: 'Revealed the competitive matchup' },
  lucky: { icon: '🎡', name: 'Lucky Spin', desc: 'Spun the growth reward wheel' },
  committed: { icon: '🏆', name: 'Growth Ready', desc: 'Booked your growth call' },
};

export const QUESTIONS = [
  { q: 'How do most new patients find your clinic today?', k: 'Visibility',
    opts: [['Mostly word of mouth', 1], ['Some online, mostly referrals', 2], ['Search + social + referrals', 3], ['Strong, coordinated online presence', 4]] },
  { q: 'How do you handle appointments and enquiries?', k: 'Booking',
    opts: [['Phone calls and a register', 1], ['A mix of calls and WhatsApp', 2], ['WhatsApp with some reminders', 3], ['Automated booking + reminders', 4]] },
  { q: 'Do you follow up with patients after a visit?', k: 'Follow-up',
    opts: [['Rarely', 1], ['Sometimes, manually', 2], ['Often, but not systematic', 3], ['Structured aftercare + retention', 4]] },
  { q: "How is your clinic's online content and education?", k: 'Content',
    opts: [['Little to none', 1], ['Occasional posts', 2], ['Regular posts, no strategy', 3], ['Journey-based content + education', 4]] },
  { q: 'How steady are your patient reviews and ratings?', k: 'Reviews',
    opts: [['Few or outdated reviews', 1], ['Occasional new reviews', 2], ['Regular but unmanaged', 3], ['A systematic review engine', 4]] },
  { q: 'Do returning patients come back on schedule?', k: 'Retention',
    opts: [['We don’t track recalls', 1], ['Manual reminders, sometimes', 2], ['Tracked, but inconsistent', 3], ['Automated recalls that work', 4]] },
  { q: 'How connected are your tools and vendors?', k: 'Systems',
    opts: [['Separate tools, multiple people', 1], ['A few tools, some overlap', 2], ['Mostly one system', 3], ['One connected growth partner', 4]] },
];

/* score % -> result copy (same thresholds as the HTML) */
export function quizOutcome(pct) {
  if (pct < 40) return {
    tier: 'High growth potential',
    title: 'High growth potential',
    desc: 'Your clinic has strong untapped upside. Fragmented tools and manual follow-up are leaving patients — and revenue — on the table. A connected setup would move the needle fast.',
    rec: 'Connected Growth Plan — full stack',
  };
  if (pct < 70) return {
    tier: 'Solid, with gaps',
    title: 'Solid foundation, clear gaps',
    desc: "You've got real momentum, but disconnected pieces are capping your results. Tightening the patient journey and automating follow-up would compound what's already working.",
    rec: 'Growth + Automation Plan',
  };
  return {
    tier: 'Growth-ready',
    title: 'Growth-ready',
    desc: "You're already thinking like a connected practice. The next lift comes from a single accountable partner across visibility, content, software and retention — outpacing fragmented execution.",
    rec: 'Scale Plan — connected partner',
  };
}

export const MODULES = [
  { n: '01', ic: '🌐', t: '6-platform visibility', d: 'A coordinated presence across six platforms, designed to make your clinic easier to discover and trust.' },
  { n: '02', ic: '💻', t: 'Website development', d: 'High-converting clinic websites with customization and patient-first journeys.' },
  { n: '03', ic: '💬', t: 'WhatsApp automation', d: 'Simplify enquiries, appointment updates, reminders and follow-up communication.' },
  { n: '04', ic: '🧩', t: 'Smart clinic software', d: 'Manage the patient journey and key clinic workflows from one connected platform.' },
  { n: '05', ic: '🎬', t: 'Content production', d: 'Professional shoots, patient testimonials and high-quality social content.' },
  { n: '06', ic: '🎓', t: 'Patient education', d: '3D animation, awareness, procedure guidance and aftercare videos patients understand.' },
];

export const JOURNEY = [
  { stage: 'Discover', ji: '🔍', js: 'Get found' },
  { stage: 'Book', ji: '📅', js: 'Convert' },
  { stage: 'Visit', ji: '🩺', js: 'Care' },
  { stage: 'Return', ji: '🔄', js: 'Retain' },
];

export const SECTION_AWARDS = {
  outcomes: { gp: 25, t: 'Outcomes explored', s: 'Every stage of the patient journey', badge: 'explorer' },
  platform: { gp: 25, t: 'Growth stack opened', s: 'Six connected modules' },
  comparison: { gp: 25, t: 'Comparison reached', s: 'Connected vs. fragmented' },
  offer: { gp: 25, t: 'Offer discovered', s: 'Spin-to-win growth offer' },
  'growth-call-form': { gp: 25, t: 'Booking desk reached', s: 'Almost there, Doctor' },
};

/* spin wheel */
export const SEGMENTS = [10, 15, 20, 12, 18];
export const WEIGHTS = { 10: 34, 12: 26, 15: 20, 18: 12, 20: 8 };

export const TIME_SLOTS = [
  { val: 'Morning (9–12)', icon: '🌅', label: 'Morning', range: '9 – 12' },
  { val: 'Afternoon (12–4)', icon: '☀️', label: 'Afternoon', range: '12 – 4' },
  { val: 'Evening (4–8)', icon: '🌆', label: 'Evening', range: '4 – 8' },
];

export const FAQS = [
  ['Who is CareDesk360 for?', 'CareDesk360 is built for clinics, hospitals and healthcare providers that want to improve patient acquisition, communication, retention and operational efficiency.'],
  ['What is included in the starting plan?', 'Plans are tailored to each provider. Selected plans can include software, digital visibility, content, website support and automation. We recommend the right scope during your growth call.'],
  ['How does the spin-wheel offer work?', 'Enter your name, mobile number and email to unlock the wheel. Every spin wins a discount code between 10% and 20% off selected plans. One spin per clinic, and your code stays valid for 7 days — mention it on your growth call to redeem, subject to plan terms and availability.'],
  ['Can you support international and NRI patients?', 'Through our international healthcare partnership, CareDesk360 is building demand-generation and patient-coordination pathways across multiple countries — helping international and NRI patients and their families connect with trusted care in India.'],
];

export const COMPARISON_ROWS = [
  ['Clinic growth strategy', 'Clinic-specific roadmap', 'Often unclear', 'Not a focus', 'Split across providers'],
  ['Content approach', 'Built around the journey', 'Often generic', 'Usually none', 'Agency-dependent'],
  ['Patient journey expertise', 'Discovery to retention', 'Usually not mapped', 'Workflow-focused', 'Fragmented'],
  ['Clinic management software', 'Included', 'No software', 'Core product', 'Separate subscription'],
  ['Setup time', 'Starts Day 1*', '1–2 months', 'After config', 'Depends on vendor'],
  ['Monthly execution', 'Continuous & accountable', 'Often late-month', 'Support only', 'Different schedules'],
  ['Pricing structure', 'From ₹3,999/month', 'Retainers + add-ons', 'Subscription', 'Multiple bills'],
];
