/**
 * @file Theme and color utilities
 */

function wcagL(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  const f = hex.replace('#', '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3');
  return {
    r: parseInt(f.slice(0, 2), 16),
    g: parseInt(f.slice(2, 4), 16),
    b: parseInt(f.slice(4, 6), 16),
  };
}

export function applyAccent(hex) {
  const { r, g, b } = hexToRgb(hex);
  const L = 0.2126 * wcagL(r) + 0.7152 * wcagL(g) + 0.0722 * wcagL(b);
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-text', L > 0.179 ? '#111111' : '#ffffff');
}

export function applyTheme(light) {
  document.body.classList.toggle('light', light);
}

export function applyViewMode(mode) {
  const grid = document.getElementById('tile-grid');
  if (!grid) return;
  const validModes = ['cards-small', 'cards-medium', 'cards-large', 'list-comfort', 'list-compact'];
  const nextMode = validModes.includes(mode) ? mode : 'cards-medium';
  grid.classList.remove('view-cards-small', 'view-cards-medium', 'view-cards-large', 'view-list-comfort', 'view-list-compact');
  grid.classList.add(`view-${nextMode}`);
}
