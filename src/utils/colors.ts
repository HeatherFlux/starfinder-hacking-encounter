// Parse hex color to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result && result[1] && result[2] && result[3]) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    }
  }
  return { r: 30, g: 203, b: 225 }  // Default cyan
}

// Convert RGB to hex
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// Blend two colors
export function blendColors(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  ratio: number
): { r: number; g: number; b: number } {
  return {
    r: color1.r + (color2.r - color1.r) * ratio,
    g: color1.g + (color2.g - color1.g) * ratio,
    b: color1.b + (color2.b - color1.b) * ratio
  }
}

// Theme colors (matching CSS variables)
export const THEME_COLORS = {
  primary: { r: 30, g: 203, b: 225 },      // Cyan
  secondary: { r: 150, g: 30, b: 225 },    // Purple
  tertiary: { r: 225, g: 52, b: 30 },      // Red
  quaternary: { r: 106, g: 225, b: 30 },   // Green
  bg: { r: 5, g: 6, b: 8 },                // Dark bg
  text: { r: 232, g: 238, b: 244 }         // Light text
}
