export type EffectType =
  | 'breach'           // Access point successfully breached
  | 'alarm'            // Countermeasure triggered - alarm
  | 'vulnerability'    // Vulnerability exploited - DC lowered
  | 'countermeasure'   // ICE/countermeasure activated
  | 'lockout'          // System lockout - hack failed
  | 'success'          // Full system breach - victory
  | 'data-extract'     // Pulled data from system
  | 'scan'             // Scanning for vulnerabilities
  | 'trace'            // System tracing hacker location
  | 'pulse'            // Generic node pulse

export interface Effect {
  id: string
  type: EffectType
  targetNodeId?: string
  startTime: number
  duration: number
  intensity?: number
}

export const EFFECT_DURATIONS: Record<EffectType, number> = {
  breach: 2000,
  alarm: 3000,
  vulnerability: 1500,
  countermeasure: 2500,
  lockout: 4000,
  success: 5000,
  'data-extract': 2000,
  scan: 1000,
  trace: 10000,  // Longer duration for tension
  pulse: 800
}

export const EFFECT_COLORS: Record<EffectType, { r: number; g: number; b: number }> = {
  breach: { r: 106, g: 225, b: 30 },      // Green
  alarm: { r: 225, g: 52, b: 30 },        // Red
  vulnerability: { r: 150, g: 30, b: 225 }, // Purple
  countermeasure: { r: 225, g: 52, b: 30 }, // Red
  lockout: { r: 225, g: 52, b: 30 },      // Red
  success: { r: 106, g: 225, b: 30 },     // Green
  'data-extract': { r: 30, g: 203, b: 225 }, // Cyan
  scan: { r: 30, g: 203, b: 225 },        // Cyan
  trace: { r: 225, g: 52, b: 30 },        // Red
  pulse: { r: 30, g: 203, b: 225 }        // Cyan
}

export function createEffect(type: EffectType, targetNodeId?: string): Effect {
  return {
    id: crypto.randomUUID(),
    type,
    targetNodeId,
    startTime: Date.now(),
    duration: EFFECT_DURATIONS[type],
    intensity: 1
  }
}
