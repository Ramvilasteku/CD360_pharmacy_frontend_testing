// The agreement's wording and structure. Every highlighted spot in the original sample
// is driven by a form value (or an auto-generated sentence that can be edited by hand).
import {
  parseDate, addMonths, addDays, fmtLong, fmtRange, fmtSlash, ordinalSuffix, monthPeriods,
  numberWords, ordinalWord, wordAndDigit, rupee, rupeesInWords, plural, MONTHS,
} from './format.js';

// ---------------------------------------------------------------- defaults (= the sample PDF)
export const DEFAULT_VALUES = {
  clientName: 'Shilpa Reddy',
  clinicName: 'Sanctuary Dental',
  specialties: 'As agreed during onboarding',
  planName: 'Growth',
  agreementDate: '2026-11-03',
  startDate: '2026-11-03',
  paidMonths: 3,
  freeMonths: 1,
  monthlyFee: 10000,
  paymentDate: '2026-11-03',
  staticPosts: 6,
  reels: 2,
  youtubeShorts: 0,
  blogs: 4,
  ugcCollabs: 1,
  metaCampaigns: 1,
  providerSignDate: '2026-09-26',
  annexHidden: [], // keys of standard Annexure A rows left out
  annexCustomRows: [], // [{ id, label, value }] extra Annexure A rows
  overrides: {},
};

// Fixed (non-highlighted) service-provider details printed in the signature block.
export const PROVIDER = {
  signatory: 'Mohd Mustaqeem',
  designation: 'Head of Business Operations & HR',
  company: 'Ridgeveda Solutions Pvt Ltd',
};

// ---------------------------------------------------------------- auto-generated (editable) text
// key -> { label, group }  (order = order shown in the form)
export const AUTO_FIELDS = [
  ['titleLine', 'Title line under “SERVICE AGREEMENT”', 'clauses'],
  ['selectedPlan', 'Engagement Summary – Selected plan', 'clauses'],
  ['termSummary', 'Engagement Summary – Term', 'clauses'],
  ['commercials', 'Engagement Summary – Commercials', 'clauses'],
  ['clause11', 'Clause 1.1 – Term and paid/complimentary months', 'clauses'],
  ['compRowLabel', 'Fees table – Complimentary month (label)', 'clauses'],
  ['compRowValue', 'Fees table – Complimentary month (value)', 'clauses'],
  ['clause31', 'Clause 3.1 – Total professional fee', 'clauses'],
  ['clause32', 'Clause 3.2 – Payment schedule', 'clauses'],
  ['annexTotal', 'Annexure A – Total fee line', 'clauses'],
  ['annex_website', 'Website and CareDesk360 software', 'annexure'],
  ['annex_static', 'Social media static/carousel posts', 'annexure'],
  ['annex_reels', 'High-quality reels', 'annexure'],
  ['annex_shorts', 'YouTube Shorts', 'annexure'],
  ['annex_festive', 'Festive and awareness posts', 'annexure'],
  ['annex_blogs', 'Blogs', 'annexure'],
  ['annex_gmb', 'GMB and LinkedIn optimization', 'annexure'],
  ['annex_ugc', 'UGC influencer collaborations', 'annexure'],
  ['annex_training', 'Team content and shoot training', 'annexure'],
  ['annex_meta', 'Meta awareness campaigns', 'annexure'],
  ['annex_ooh', 'OOH/DOOH ad support', 'annexure'],
  ['annex_manager', 'Dedicated Account Manager', 'annexure'],
  ['annex_branding', 'Branding and reputation management', 'annexure'],
  ['annex_support', 'Standard account management support', 'annexure'],
  ['annex_specialties', 'Specialties', 'annexure'],
  ['annex_follower', 'Monthly follower gain target', 'annexure'],
  ['annex_reach', 'Monthly reach target', 'annexure'],
  ['annex_platforms', 'Digital platforms', 'annexure'],
].map(([key, label, group]) => ({ key, label, group }));

const n = (v, min = 0) => Math.max(min, Math.floor(Number(v) || 0));

/** Everything the template needs that is computed from the form values. */
export function computeTerms(values) {
  const start = parseDate(values.startDate) || parseDate(DEFAULT_VALUES.startDate);
  const paid = n(values.paidMonths, 1);
  const free = n(values.freeMonths, 0);
  const total = paid + free;
  const fee = Math.max(0, Number(values.monthlyFee) || 0);
  const subtotal = fee * paid;
  const end = addDays(addMonths(start, total), -1);
  const paidEnd = addDays(addMonths(start, paid), -1);
  const freeStart = addMonths(start, paid);
  return {
    start, end, paid, free, total, fee, subtotal, paidEnd, freeStart,
    paidPeriods: monthPeriods(start, paid),
    freePeriods: monthPeriods(start, free, paid),
    plan: (values.planName || '').trim(),
  };
}

const joinList = (items) => (items.length <= 1 ? items.join('')
  : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

export function computeAuto(values) {
  const t = computeTerms(values);
  const { plan, paid, free, total, fee, subtotal } = t;
  const freeRange = free ? fmtRange(t.freeStart, t.end) : '';
  const freeOrdinals = t.freePeriods.map((_, i) => ordinalWord(paid + i + 1));
  const offer = `${paid}+${free}`;

  const paidList = joinList(t.paidPeriods.map((p) => fmtRange(p.start, p.end)));
  const paidSentence = paid === 1
    ? `The first month (${paidList}) is the paid service month`
    : `The first ${numberWords(paid)} months (${paidList}) are paid service months`;
  let freeSentence = '';
  if (free === 1) {
    freeSentence = `; ${freeRange} is the complimentary ${freeOrdinals[0]} month with the same agreed monthly service scope.`;
  } else if (free > 1) {
    freeSentence = `; ${joinList(t.freePeriods.map((p) => fmtRange(p.start, p.end)))} are the complimentary ${joinList(freeOrdinals)} months with the same agreed monthly service scope.`;
  } else {
    freeSentence = '.';
  }

  const s = Number(values.staticPosts) || 0;
  const r = Number(values.reels) || 0;
  const b = Number(values.blogs) || 0;
  const u = Number(values.ugcCollabs) || 0;
  const m = Number(values.metaCampaigns) || 0;
  const y = Number(values.youtubeShorts) || 0;

  return {
    titleLine: `Digital Marketing Services — ${plan} Plan (${paid} Paid ${plural(paid, 'Month', 'Months')}`
      + (free ? ` + ${free} Complimentary ${plural(free, 'Month', 'Months')})` : ')'),
    selectedPlan: free ? `${plan} — ${offer} promotional offer` : plan,
    termSummary: `${total} ${plural(total, 'month', 'months')}: ${fmtLong(t.start)} – ${fmtLong(t.end)}`,
    commercials: `${rupee(fee)} per paid month × ${paid} = ${rupee(subtotal)}`
      + (free ? `; ${joinList(freeOrdinals)} ${plural(free, 'month', 'months')} complimentary` : ''),
    clause11: `1.1 The Term shall run from ${fmtLong(t.start)} through ${fmtLong(t.end)}, inclusive, unless ended earlier under Clause 10. ${paidSentence}${freeSentence}`,
    compRowLabel: free ? `Complimentary ${plural(free, 'month', 'months')} (${free === 1 ? freeRange : fmtRange(t.freeStart, t.end)})` : '',
    compRowValue: free ? `${rupee(fee * free)} value — waived` : '',
    clause31: `3.1 The total professional fee is ${rupee(subtotal)}/- (${rupeesInWords(subtotal)}) for the ${numberWords(total)}-month Term.`
      + (free ? ` The Client receives ${numberWords(free)} additional ${plural(free, 'month', 'months')} at no professional service charge under the ${offer} offer.` : ''),
    clause32: `3.2 Payment schedule: ${rupee(subtotal)} on or before ${fmtLong(parseDate(values.paymentDate) || t.start)}.`,
    annexTotal: `Total fee: ${rupee(subtotal)} for ${fmtRange(t.start, t.paidEnd)}`
      + (free ? `; ${freeRange} complimentary` : ''),
    annex_website: 'Included during Term',
    annex_static: `Up to ${s} per month`,
    annex_reels: `Up to ${r} per month`,
    annex_shorts: `Up to ${y} per month`,
    annex_festive: 'As per calendar, additional',
    annex_blogs: `${b} per month`,
    annex_gmb: 'Onboarding and periodic',
    annex_ugc: `${u} during Term, compliance subject`,
    annex_training: 'Included',
    annex_meta: `${m} ${plural(m, 'campaign', 'campaigns')} per month; management included, ad spend extra`,
    annex_ooh: 'As needed; media costs extra',
    annex_manager: 'Throughout Term',
    annex_branding: 'Ongoing',
    annex_support: 'During business hours',
    annex_specialties: values.specialties || '',
    annex_follower: 'No fixed target; see Clause 2.7',
    annex_reach: 'No fixed target; see Clause 2.7',
    annex_platforms: '6: Instagram, Facebook, YouTube, LinkedIn, GMB, website/blog',
  };
}

// ---------------------------------------------------------------- document model
// Runs: plain string = regular. Objects: { t, s: 'R'|'B'|'I', sup: bool }
const B = (t) => ({ t, s: 'B' });
const I = (t) => ({ t, s: 'I' });
const SUP = (t) => ({ t, s: 'R', sup: true });

const HEAD_GAP = 25.25; // baseline → baseline gap before a section heading
const para = (runs, gap, extra = {}) => ({ type: 'para', runs: Array.isArray(runs) ? runs : [runs], gap, ...extra });
const heading = (text, gap = HEAD_GAP, extra = {}) => para([B(text)], gap, { keepWithNext: true, ...extra });

/**
 * Builds the list of blocks laid out by the PDF engine.
 * Gaps are the original document's measured baseline-to-baseline distances (points).
 */
export function buildDocument(values) {
  const auto = computeAuto(values);
  const ov = values.overrides || {};
  const T = (key) => (ov[key] != null ? ov[key] : auto[key]);
  const t = computeTerms(values);
  const plan = t.plan;
  const client = (values.clientName || '').trim();
  const clinic = (values.clinicName || '').trim();
  const agreeDate = parseDate(values.agreementDate) || t.start;
  const startMonth = MONTHS[t.start.getUTCMonth()];
  const s = Number(values.staticPosts) || 0;
  const r = Number(values.reels) || 0;
  const b = Number(values.blogs) || 0;
  const u = Number(values.ugcCollabs) || 0;
  const m = Number(values.metaCampaigns) || 0;
  const y = Number(values.youtubeShorts) || 0;
  const freeMonthNote = t.free ? ` The complimentary ${plural(t.free, 'month does', 'months do')} not automatically recur.` : '';
  const termWord = numberWords(t.total);
  const aTerm = /^(eight|eleven|eighteen|eighty)/.test(termWord) ? 'an' : 'a';

  const row = (label, value) => ({ cells: [[label], [value]] });

  const feeRows = [
    row(`${plan} monthly fee`, rupee(t.fee)),
    row('Paid service months', String(t.paid)),
    row('Paid subtotal', rupee(t.subtotal)),
  ];
  if (T('compRowLabel') || T('compRowValue')) feeRows.push(row(T('compRowLabel'), T('compRowValue')));
  feeRows.push(row(`Total professional fee for ${numberWords(t.total)}-month Term`, rupee(t.subtotal)));

  const hidden = new Set(values.annexHidden || []);
  const annexRows = AUTO_FIELDS
    .filter((f) => f.group === 'annexure' && !hidden.has(f.key) && (f.key !== 'annex_shorts' || y > 0))
    .map((f) => row(f.label, T(f.key)))
    .concat((values.annexCustomRows || [])
      .filter((c) => String(c.label || '').trim() || String(c.value || '').trim())
      .map((c) => row(c.label || '', c.value || '')));

  return [
    // ---------------- page 1
    para([B('SERVICE AGREEMENT')], 0, { align: 'center' }),
    para(T('titleLine'), 25.22),
    para([
      'This Service Agreement (the “Agreement”) is made on ',
      String(agreeDate.getUTCDate()), SUP(ordinalSuffix(agreeDate.getUTCDate())),
      ` ${MONTHS[agreeDate.getUTCMonth()]} ${agreeDate.getUTCFullYear()} and is effective from ${fmtLong(t.start)} (the “Effective Date”), by and between:`,
    ], 13.23),
    para('(A) Ridgeveda Solutions Private Limited, a company incorporated under the Companies Act, 2013 brand, with its registered office at Plot No. 40, MIG II, Phase XV, KPHB, Kukatpally, Tirumalagiri, Hyderabad – 500072, Telangana (the “Service Provider”); and', 20.41),
    para(`(B) ${client}, representing ${clinic} (the “Client”).`, 21.03),
    para('The Service Provider and Client are individually a “Party” and collectively the “Parties”.', 16.19),
    heading('Engagement Summary', 20.43),
    {
      type: 'table', gap: 7.2,
      rows: [
        row('Client / Clinic', `${client} / ${clinic}`),
        row('Selected plan', T('selectedPlan')),
        row('Effective date', fmtLong(t.start)),
        row('Term', T('termSummary')),
        row('Commercials', T('commercials')),
        row('Specialties', values.specialties || ''),
      ],
    },
    heading('1. TERM AND COMMENCEMENT', 31.2),
    para(T('clause11'), 12.62),
    para(`1.2 Renewal after ${fmtLong(t.end)} requires mutual written agreement at then-applicable pricing.${freeMonthNote}`, 16.81),
    para(`1.3 The first seven days are for onboarding, account access, strategy, content planning and brand alignment; publishing and campaign execution generally begin in Week 2. ${startMonth} deliverables will be scheduled within the remainder of that month.`),
    heading(`2. SCOPE OF SERVICES — ${plan.toUpperCase()}`, 25.22),
    para('2.1 Website and Clinic Management Software Website and access to the CareDesk360 Clinic/Hospital Management Software during the Term, including setup and reasonable onboarding assistance. Any separately purchased domain, hosting or external integrations are subject to Clause 2.8.'),
    para(`2.2 Social Media Management and Content Management, scheduling and basic monitoring of the Client’s social accounts, with up to ${wordAndDigit(s)} static/carousel ${plural(s, 'post', 'posts')}${y > 0 ? ',' : ' and'} ${wordAndDigit(r)} high-quality ${plural(r, 'reel', 'reels')}${y > 0 ? ` and ${wordAndDigit(y)} YouTube ${plural(y, 'Short', 'Shorts')}` : ''} per calendar month, plus festive and relevant health-awareness posts. Reels may cover preventive care, treatment awareness, aftercare guidance and patient education. Patient testimonials or identifiable patient material will be used only where lawful, professionally permissible and approved under Clause 5; otherwise equivalent educational content will be substituted.`, 13.2),
    para(`2.3 Search, Articles and Blogs Google Business Profile (GMB) and LinkedIn optimization at onboarding and periodically thereafter; ${wordAndDigit(b)} ${plural(b, 'blog', 'blogs')} per month. Blogs will be published where access is available or supplied ready to publish.`),
    // ---------------- page 2 (natural break)
    para(`2.4 Influencers, Outdoor Advertising and Campaigns Coordination of ${wordAndDigit(u)} UGC influencer ${plural(u, 'collaboration', 'collaborations')} during the Term, subject to applicable dental advertising ethics; OOH and DOOH creative/ad support; and planning, setup and management of ${wordAndDigit(m)} Meta awareness ${plural(m, 'campaign', 'campaigns')}. Campaign quantity, targeting and scheduling shall be agreed in the monthly content/campaign calendar. All media spend and third-party fees are excluded under Clause 2.8.`),
    para(`2.5 Training Shoot training for the Client’s team, if required, is included in the ${plan} Plan scope.`),
    para('2.6 Digital Presence and Support Patient touchpoints across six (6) digital platforms: Instagram, Facebook, YouTube, LinkedIn, Google Business Profile and the Client’s website/blog. A dedicated Account Manager, priority support, branding support and reputation management are included.'),
    para(`2.7 Reach and Follower Commitments No fixed follower or reach target is included in the ${plan} Plan. The Service Provider will plan and execute campaigns toward these metrics, subject to timely Client cooperation, sufficient approved ad budgets, platform policies and audience conditions. The Parties shall agree the platforms, baseline and measurement period in writing during onboarding. These metrics do not constitute a guarantee of patient appointments, revenue or clinical outcomes.`),
    para('2.8 Third-Party Costs and Additional Services Advertising spend on Meta or other platforms, influencer fees, OOH/DOOH media buying and production, printing, installation, paid assets, new domain/hosting and other approved vendor costs are borne by the Client separately, paid directly or in advance following written approval. Services beyond the stated scope require a separate written quotation and approval.'),
    para('2.9 Revisions Up to two (2) revision rounds per deliverable are included. Further changes or work outside the agreed scope may be charged separately. Unused monthly deliverables do not roll over unless delay is attributable to the Service Provider.'),
    heading('3. FEES AND PAYMENT TERMS', 25.23),
    { type: 'table', gap: 2.4, rows: feeRows },
    para(T('clause31'), 10.19),
    para(T('clause32')),
    para(`3.3 Applicable GST/tax treatment shall be stated on the invoice and handled in accordance with law; the parties should confirm whether ${rupee(t.subtotal)} is tax-inclusive before execution.${t.free ? ` No paid professional service fee is due for the complimentary ${plural(t.free, 'month', 'months')}, but approved third-party expenses remain payable.` : ''}`),
    para('3.4 Payment is by bank transfer, UPI or another agreed method against invoice. Fees for paid months are non-refundable except as provided in Clause 10.4. Payment obligations are not deferred by delays in Client approvals or access.'),
    heading('4. SUSPENSION FOR NON-PAYMENT', 25.23),
    para('4.1 If an undisputed invoice remains unpaid seven (7) days after its due date, the Service Provider may suspend marketing deliverables and campaigns upon written notice until payment is received.'),
    para('4.2 If payment remains overdue more than thirty (30) days, the Service Provider may terminate this Agreement.'),
    para('4.3 Outstanding fees and approved third-party charges remain payable.'),
    // ---------------- page 3
    heading('5. CLIENT RESPONSIBILITIES AND DENTAL COMPLIANCE', 25.23),
    para('5.1 The Client shall promptly provide accurate clinic details, credentials, brand assets, staff availability, approvals and content inputs; aim to approve submissions within 2–4 working hours; and review all clinical claims before publication.'),
    para('5.2 The Client is responsible for compliance with applicable dental professional ethics, patient privacy, consent and advertising rules. Content must not include prohibited testimonials, before/after images, procedure broadcasts, misleading superiority claims or other impermissible dental promotions. Patient-identifiable material shall not be published without valid consent and applicable legal permission. The Service Provider may refuse or replace non-compliant concepts with educational alternatives.'),
    para('5.3 Delays in access, inputs, clinical reviews or approvals may proportionately affect publishing schedules and performance.'),
    heading('6. INTELLECTUAL PROPERTY', 25.23),
    para('6.1 Upon full payment, final approved content produced specifically for the Client belongs to the Client, subject to third-party licenses. The Client retains ownership of its accounts, listings and existing brand assets. 6.2 The Service Provider retains ownership of its pre-existing strategies, templates, systems, workflows and software. 6.3 Non-confidential work may be referenced in the Service Provider’s portfolio only where permitted by applicable professional rules and without patient-identifiable information.'),
    heading('7. CONFIDENTIALITY AND DATA PROTECTION', 25.23),
    para('7.1 Each Party shall keep the other’s confidential commercial and operational information private and use it only to perform this Agreement. 7.2 Patient information shall be minimized, handled securely and processed only on lawful instructions and in accordance with applicable Indian data protection law. 7.3 On expiry or termination, administrative account access and approved materials shall be handed over within seven (7) days, subject to clearance of undisputed dues and applicable law.'),
    heading('8. NON-CIRCUMVENTION AND NON-SOLICITATION', 25.83),
    para('During the Term and for twelve (12) months afterward, the Client shall not directly engage or solicit Service Provider personnel for substantially similar work outside the Service Provider without prior written consent. Any remedies are subject to applicable law and proof of recoverable loss.'),
    heading('9. PERFORMANCE AND PLATFORM DISCLAIMER', 25.2),
    para('9.1 Reach and follower commitments in Clause 2.7 are subject to its measurement and dependency conditions. Other outcomes, including leads, appointments, revenue, search rankings and conversion rates, depend on external factors and are not guaranteed. 9.2 Platform changes, ad rejection, algorithm fluctuations and third-party outages may affect results. The Service Provider shall exercise reasonable professional care in executing the agreed services.'),
    heading('10. TERMINATION', 25.82),
    para(`10.1 This is ${aTerm} ${termWord}-month engagement${t.free ? ` including the promotional complimentary ${plural(t.free, 'month', 'months')}` : ''}. 10.2 The Client may discontinue by thirty (30) days’ written notice; amounts already earned for paid service periods are not refundable. 10.3 Either Party may terminate for a material breach not remedied within fifteen (15) days after written notice. 10.4 If the Service Provider ends the engagement without Client breach or non-payment, prepaid amounts for paid service months not provided shall be refunded pro rata${t.free ? `; the free ${plural(t.free, 'month has', 'months have')} no cash refund value` : ''}. 10.5 On termination, the Parties shall coordinate handover of approved content and access under Clause 7.`),
    // ---------------- page 4
    heading('11. LIMITATION OF LIABILITY', 25.23),
    para('Neither Party is liable for indirect or consequential losses, including lost profits. Subject to applicable law, the Service Provider’s aggregate contractual liability shall not exceed professional fees actually received under this Agreement. This clause does not exclude liability that cannot lawfully be excluded.'),
    heading('12. GOVERNING LAW AND DISPUTES', 25.23),
    para('Indian law governs this Agreement. The Parties shall first attempt good-faith resolution within thirty (30) days; failing resolution, the courts at Hyderabad, Telangana shall have jurisdiction.'),
    heading('13. GENERAL', 25.23),
    para('This Agreement and Annexure A constitute the entire understanding on this engagement. Amendments must be written and signed by both Parties. Neither Party is responsible for failures caused by events beyond reasonable control. Notices shall be sent in writing to the Parties’ notified addresses; notices to the Service Provider may be sent to business@ridgeveda.com. Invalid provisions do not affect the remainder. Counterparts and electronic signatures are permitted.'),
    heading('SIGNATURES', 25.22),
    {
      type: 'table', gap: 6.0,
      rows: [
        {
          cells: [['For the Service Provider'], ['For the Client']],
          valign: ['top', 'center'],
          minHeight: 76.25,
          // positions relative to the row's top-left corner of the page (x absolute, y from row top)
          images: [
            { name: 'stamp', x: 135.05, dy: -7.42, w: 54.85, h: 94.833 },
            { name: 'signature', x: 100.85, dy: 28.29, w: 77.366, h: 43.5 },
          ],
        },
        row('Signature: _____________________', 'Signature: _____________________'),
        row(PROVIDER.signatory, client),
        row(PROVIDER.designation, clinic),
        row(PROVIDER.company, ''),
        row(`Date: ${fmtSlash(parseDate(values.providerSignDate))}`, 'Date: _____________________'),
      ],
    },
    // ---------------- page 5
    { type: 'pageBreak' },
    para([B('ANNEXURE A')], 0, { align: 'center', pageTopOffset: 12.62 }),
    heading(`${plan} — Deliverables Summary | ${fmtLong(t.start)} to ${fmtLong(t.end)}`, 20.4),
    { type: 'table', gap: 7.23, rows: annexRows },
    para([I(String(T('annexTotal')).replace(/\.\s*$/, '')), '.'], 10.2),
  ];
}

export const fileNameFor = (values) => {
  const base = `Service_Agreement_${(values.clinicName || values.clientName || 'Client').trim()}`;
  return `${base.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_')}.pdf`;
};
