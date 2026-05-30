/**
 * themes.js — All theme definitions
 * Colors are used for platform gradient, background, and UI accents.
 */

export const THEMES = {
  theme_default: {
    id: 'theme_default',
    name: 'Classic Blue',
    price: 0,
    iapId: null,
    background: '#1A1A2E',
    platformColors: ['#3498DB', '#2980B9', '#1ABC9C', '#16A085', '#2ECC71'],
    accent: '#3498DB',
    uiText: '#FFFFFF',
    preview: ['#3498DB', '#2980B9', '#1ABC9C'],
  },
  theme_sunset: {
    id: 'theme_sunset',
    name: 'Sunset Glow',
    price: 49,
    iapId: 'com.stacksnap.theme_sunset',
    background: '#2D1B69',
    platformColors: ['#FF6B35', '#F7931E', '#FFD23F', '#EE4266', '#C62A88'],
    accent: '#FF6B35',
    uiText: '#FFD23F',
    preview: ['#FF6B35', '#F7931E', '#EE4266'],
  },
  theme_forest: {
    id: 'theme_forest',
    name: 'Jungle Green',
    price: 49,
    iapId: 'com.stacksnap.theme_forest',
    background: '#0D2818',
    platformColors: ['#27AE60', '#2ECC71', '#1E8449', '#58D68D', '#117A65'],
    accent: '#2ECC71',
    uiText: '#A9DFBF',
    preview: ['#27AE60', '#2ECC71', '#58D68D'],
  },
  theme_neon: {
    id: 'theme_neon',
    name: 'Neon Nights',
    price: 99,
    iapId: 'com.stacksnap.theme_neon',
    background: '#000000',
    platformColors: ['#00FFFF', '#FF00FF', '#00FF88', '#FF0080', '#8800FF'],
    accent: '#00FFFF',
    uiText: '#FF00FF',
    preview: ['#00FFFF', '#FF00FF', '#00FF88'],
  },
  theme_gold: {
    id: 'theme_gold',
    name: 'Gold Rush',
    price: 99,
    iapId: 'com.stacksnap.theme_gold',
    background: '#1A0A00',
    platformColors: ['#F39C12', '#D4AC0D', '#F1C40F', '#B7950B', '#E59866'],
    accent: '#F39C12',
    uiText: '#F1C40F',
    preview: ['#F39C12', '#F1C40F', '#E59866'],
  },
  theme_india: {
    id: 'theme_india',
    name: 'India Fest',
    price: 49,
    iapId: 'com.stacksnap.theme_india',
    background: '#000080',
    platformColors: ['#FF9933', '#FFFFFF', '#138808', '#FF9933', '#138808'],
    accent: '#FF9933',
    uiText: '#FFFFFF',
    preview: ['#FF9933', '#FFFFFF', '#138808'],
  },
};

export const THEME_ORDER = [
  'theme_default',
  'theme_india',
  'theme_sunset',
  'theme_forest',
  'theme_neon',
  'theme_gold',
];

export const DEFAULT_THEME_ID = 'theme_default';
