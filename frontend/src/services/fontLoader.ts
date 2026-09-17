/**
 * Dynamically loads web fonts required for viral caption presets and Indic scripts
 * (Montserrat, Poppins, Noto Sans Gujarati, Bangers, Inter).
 */

const LOADED_FONTS = new Set<string>();

export const FONT_MAP: Record<string, { label: string; googleFontName?: string; category: string }> = {
  Montserrat: {
    label: 'Montserrat (Hormozi)',
    googleFontName: 'Montserrat:ital,wght@0,400;0,700;0,800;0,900;1,800',
    category: 'Viral Punch',
  },
  'Komika Axis': {
    label: 'Komika Axis / Bangers (MrBeast)',
    googleFontName: 'Bangers',
    category: 'Comic Pop',
  },
  Poppins: {
    label: 'Poppins (Hindi / Devanagari)',
    googleFontName: 'Poppins:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700',
    category: 'Indic / Latin',
  },
  'Noto Sans Gujarati': {
    label: 'Noto Sans Gujarati',
    googleFontName: 'Noto+Sans+Gujarati:wght@400;700;900',
    category: 'Indic Gujarati',
  },
  Inter: {
    label: 'Inter (Modern / Minimal)',
    googleFontName: 'Inter:wght@400;600;700;800',
    category: 'Clean Sans',
  },
  Impact: {
    label: 'Impact (Classic Reel)',
    category: 'System Bold',
  },
  Georgia: {
    label: 'Georgia (Cinematic)',
    category: 'Serif Classic',
  },
};

export function loadGoogleFont(fontName: string): void {
  const fontMeta = FONT_MAP[fontName];
  if (!fontMeta || !fontMeta.googleFontName) return;

  const fontKey = fontMeta.googleFontName;
  if (LOADED_FONTS.has(fontKey)) return;

  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontKey}&display=swap`;
    document.head.appendChild(link);
    LOADED_FONTS.add(fontKey);
  } catch (err) {
    console.warn('Failed to inject font stylesheet:', err);
  }
}

export function initGlobalFonts(): void {
  // Preload essential fonts for smooth preview
  Object.keys(FONT_MAP).forEach((name) => loadGoogleFont(name));
}
