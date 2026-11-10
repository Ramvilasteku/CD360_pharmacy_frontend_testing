/* ======================================================================
   Growth Quest config
   Put these in your project's .env (CRA needs the REACT_APP_ prefix):
     REACT_APP_GQ_SHEETS_URL=https://script.google.com/macros/s/XXXX/exec
     REACT_APP_GQ_SHEETS_KEY=same-value-as-SECRET-in-Code.gs
   Restart `npm start` after editing .env.
   ====================================================================== */

export const SHEETS_URL = process.env.REACT_APP_GQ_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbyLcu5iiwBWZBlm2LkB7QWdrDB3Hsvi3XDfQoX8z5qY8nfftv0OfNuatZ2kafytyKE9/exec';
export const SHEETS_KEY = process.env.REACT_APP_GQ_SHEETS_KEY || 'CareDesk360-Clinic-Growth-Score';

/* localStorage keys */
export const QUIZ_KEY = 'ccgs_quiz_v1';        // quiz answers + score (cleared after booking)
export const BOOKING_KEY = 'ccgs_booking_v1';  // booking form draft (cleared after booking)
export const OFFER_KEY = 'cd360_quest_offer_v1'; // spin reward (kept for 7 days)
export const NAME_KEY = 'cd360_quest_name';    // HUD personalisation
export const LB_KEY = 'cd360_quest_lb';        // local leaderboard fallback

export const OFFER_DAYS = 7;

/* after a booking is saved: success screen stays this long, then the page reloads */
export const REFRESH_AFTER_BOOKING_MS = 8000;

/* leaderboard read cache */
export const LB_CACHE_MS = 60 * 1000;

export const WHATSAPP_NUMBER = '917093111075';
export const CONTACT_EMAIL = 'ceo@ridgeveda.com';
export const SHARE_URL = 'https://caredesk360.com';
