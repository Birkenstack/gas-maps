export type StationBrandStyle = {
  label: string;
  accent: string;
  background: string;
  emoji: string;
};

const DEFAULT_STYLE: StationBrandStyle = {
  label: 'Independent',
  accent: '#2563eb',
  background: 'rgba(37, 99, 235, 0.12)',
  emoji: '⛽️',
};

const brandPalette: Record<string, StationBrandStyle> = {
  Chevron: {
    label: 'Chevron',
    accent: '#1d4ed8',
    background: 'rgba(29, 78, 216, 0.12)',
    emoji: '💧',
  },
  Shell: {
    label: 'Shell',
    accent: '#ef4444',
    background: 'rgba(239, 68, 68, 0.12)',
    emoji: '🐚',
  },
  Sunoco: {
    label: 'Sunoco',
    accent: '#fbbf24',
    background: 'rgba(251, 191, 36, 0.16)',
    emoji: '⚡️',
  },
  "Buc-ee's": {
    label: "Buc-ee's",
    accent: '#22c55e',
    background: 'rgba(34, 197, 94, 0.14)',
    emoji: '🦫',
  },
  QuikStop: {
    label: 'QuikStop',
    accent: '#0ea5e9',
    background: 'rgba(14, 165, 233, 0.16)',
    emoji: '🚗',
  },
};

export const getBrandStyle = (brand?: string) => {
  if (!brand) {
    return DEFAULT_STYLE;
  }

  return brandPalette[brand] ?? { ...DEFAULT_STYLE, label: brand };
};
