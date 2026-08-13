import { type PastelColor } from '@pastel-todo/shared';

/**
 * Default pastel used when a todo has no `color` set.
 * Mint is the first entry in the shared PASTEL_COLORS single source.
 */
export const DEFAULT_COLOR: PastelColor = 'mint';

/**
 * Maps each pastel color name (from the shared PASTEL_COLORS single source) to
 * a CSS background color for the web UI. TypeScript enforces a complete map
 * because `PastelColor` derives directly from `PASTEL_COLORS`.
 */
export const PASTEL_CSS: Record<PastelColor, string> = {
  mint: '#cfe9d2',
  sky: '#d0e6fb',
  lavender: '#e3daf4',
  peach: '#ffe3c6',
  rose: '#f9d3e3',
  butter: '#fceea8',
};
