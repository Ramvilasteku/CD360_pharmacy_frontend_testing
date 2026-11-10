/* Colours for canvas / inline SVG / confetti — these can't read CSS variables.
   Keep in sync with the :root tokens at the top of growthQuest.css. */
export const THEME = {
  bg: '#FFFFFF',
  surface: '#F5F8FE',
  primary: '#1D6BF3',
  primaryDeep: '#0F4FC4',
  sky: '#38A0F7',
  accent: '#0A2F72',
  soft: '#9CC7FA',
  text: '#0B1E3B',
  muted: '#4B5D78',
  muted2: '#8190A7',
  primaryRgb: '29,107,243',
  skyRgb: '56,160,247',
  shadowRgb: '16,40,90',
};

export const CONFETTI_COLORS = [THEME.primary, THEME.sky, THEME.accent, THEME.soft, '#FFFFFF'];
export const SCORE_BAR_COLORS = ['#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0284C7', '#4F46E5', '#9333EA'];
export const WHEEL_COLORS = ['#DC2626', '#CA8A04', '#16A34A', '#2563EB', '#9333EA'];