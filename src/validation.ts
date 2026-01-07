// Input validation and sanitization for hacking session messages
// Prevents XSS, injection attacks, and DoS via malformed payloads

// ============== Constants ==============
export const LIMITS = {
  MAX_STRING_LENGTH: 500,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_ID_LENGTH: 50,
  MAX_ACCESS_POINTS: 20,
  MAX_CONNECTIONS_PER_NODE: 10,
  MIN_LEVEL: -1,
  MAX_LEVEL: 25,
  MIN_INTENSITY: 0,
  MAX_INTENSITY: 1,
  MAX_POSITION_VALUE: 10000,
} as const

// ============== Types ==============
type ComputerType = 'tech' | 'magic' | 'hybrid'
type AccessPointType = 'physical' | 'remote' | 'magical'
type NodeState = 'locked' | 'active' | 'breached' | 'alarmed'

const VALID_COMPUTER_TYPES = new Set<ComputerType>(['tech', 'magic', 'hybrid'])
const VALID_ACCESS_POINT_TYPES = new Set<AccessPointType>(['physical', 'remote', 'magical'])
const VALID_NODE_STATES = new Set<NodeState>(['locked', 'active', 'breached', 'alarmed'])

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; error: string }

// ============== Sanitizers ==============

/**
 * Sanitize a string by trimming, removing control characters,
 * and escaping HTML entities to prevent XSS
 */
export function sanitizeString(input: unknown, maxLength: number = LIMITS.MAX_STRING_LENGTH): string | null {
  if (typeof input !== 'string') return null

  // Remove control characters except newlines/tabs for descriptions
  let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Escape HTML entities to prevent XSS if ever rendered
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // Trim and enforce max length
  cleaned = cleaned.trim().slice(0, maxLength)

  return cleaned || null
}

/**
 * Validate and sanitize an ID string (alphanumeric, dashes, underscores only)
 */
export function sanitizeId(input: unknown): string | null {
  if (typeof input !== 'string') return null

  const trimmed = input.trim().slice(0, LIMITS.MAX_ID_LENGTH)

  // Only allow safe ID characters
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return null
  }

  return trimmed || null
}

/**
 * Validate a number is finite and within range
 */
export function validateNumber(
  input: unknown,
  min: number = -Infinity,
  max: number = Infinity
): number | null {
  if (typeof input !== 'number') return null
  if (!Number.isFinite(input)) return null
  if (input < min || input > max) return null
  return input
}

// ============== Payload Validators ==============

interface Position {
  x: number
  y: number
}

interface AccessPoint {
  id: string
  name: string
  type: AccessPointType
  state: NodeState
  position: Position
  connectedTo: string[]
}

interface Computer {
  id: string
  name: string
  level: number
  type: ComputerType
  description?: string
  accessPoints: AccessPoint[]
}

function validatePosition(input: unknown): Position | null {
  if (!input || typeof input !== 'object') return null
  const pos = input as Record<string, unknown>

  const x = validateNumber(pos.x, -LIMITS.MAX_POSITION_VALUE, LIMITS.MAX_POSITION_VALUE)
  const y = validateNumber(pos.y, -LIMITS.MAX_POSITION_VALUE, LIMITS.MAX_POSITION_VALUE)

  if (x === null || y === null) return null

  return { x, y }
}

function validateAccessPoint(input: unknown): AccessPoint | null {
  if (!input || typeof input !== 'object') return null
  const ap = input as Record<string, unknown>

  const id = sanitizeId(ap.id)
  const name = sanitizeString(ap.name, LIMITS.MAX_NAME_LENGTH)

  if (!id || !name) return null

  if (!VALID_ACCESS_POINT_TYPES.has(ap.type as AccessPointType)) return null
  if (!VALID_NODE_STATES.has(ap.state as NodeState)) return null

  const position = validatePosition(ap.position)
  if (!position) return null

  // Validate connectedTo array
  if (!Array.isArray(ap.connectedTo)) return null
  if (ap.connectedTo.length > LIMITS.MAX_CONNECTIONS_PER_NODE) return null

  const connectedTo: string[] = []
  for (const conn of ap.connectedTo) {
    const sanitized = sanitizeId(conn)
    if (!sanitized) return null
    connectedTo.push(sanitized)
  }

  return {
    id,
    name,
    type: ap.type as AccessPointType,
    state: ap.state as NodeState,
    position,
    connectedTo,
  }
}

export function validateComputer(input: unknown): ValidationResult<Computer> {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid computer object' }
  }

  const comp = input as Record<string, unknown>

  const id = sanitizeId(comp.id)
  if (!id) {
    return { valid: false, error: 'Invalid or missing computer ID' }
  }

  const name = sanitizeString(comp.name, LIMITS.MAX_NAME_LENGTH)
  if (!name) {
    return { valid: false, error: 'Invalid or missing computer name' }
  }

  const level = validateNumber(comp.level, LIMITS.MIN_LEVEL, LIMITS.MAX_LEVEL)
  if (level === null) {
    return { valid: false, error: `Level must be between ${LIMITS.MIN_LEVEL} and ${LIMITS.MAX_LEVEL}` }
  }

  if (!VALID_COMPUTER_TYPES.has(comp.type as ComputerType)) {
    return { valid: false, error: 'Invalid computer type' }
  }

  // Description is optional
  let description: string | undefined
  if (comp.description !== undefined && comp.description !== null) {
    const sanitized = sanitizeString(comp.description, LIMITS.MAX_DESCRIPTION_LENGTH)
    if (sanitized) {
      description = sanitized
    }
  }

  // Validate access points
  if (!Array.isArray(comp.accessPoints)) {
    return { valid: false, error: 'accessPoints must be an array' }
  }

  if (comp.accessPoints.length > LIMITS.MAX_ACCESS_POINTS) {
    return { valid: false, error: `Too many access points (max ${LIMITS.MAX_ACCESS_POINTS})` }
  }

  const accessPoints: AccessPoint[] = []
  for (let i = 0; i < comp.accessPoints.length; i++) {
    const validated = validateAccessPoint(comp.accessPoints[i])
    if (!validated) {
      return { valid: false, error: `Invalid access point at index ${i}` }
    }
    accessPoints.push(validated)
  }

  return {
    valid: true,
    value: {
      id,
      name,
      level,
      type: comp.type as ComputerType,
      description,
      accessPoints,
    }
  }
}

export function validateNodeStatePayload(input: unknown): ValidationResult<{ nodeId: string; state: NodeState }> {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid node-state payload' }
  }

  const payload = input as Record<string, unknown>

  const nodeId = sanitizeId(payload.nodeId)
  if (!nodeId) {
    return { valid: false, error: 'Invalid node ID' }
  }

  if (!VALID_NODE_STATES.has(payload.state as NodeState)) {
    return { valid: false, error: 'Invalid node state' }
  }

  return {
    valid: true,
    value: { nodeId, state: payload.state as NodeState }
  }
}

export function validateFocusPayload(input: unknown): ValidationResult<{ nodeId: string | null }> {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid focus payload' }
  }

  const payload = input as Record<string, unknown>

  // null is valid for unfocusing
  if (payload.nodeId === null) {
    return { valid: true, value: { nodeId: null } }
  }

  const nodeId = sanitizeId(payload.nodeId)
  if (!nodeId) {
    return { valid: false, error: 'Invalid node ID' }
  }

  return { valid: true, value: { nodeId } }
}

export function validateIntensityPayload(input: unknown): ValidationResult<{ value: number }> {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid intensity payload' }
  }

  const payload = input as Record<string, unknown>

  const value = validateNumber(payload.value, LIMITS.MIN_INTENSITY, LIMITS.MAX_INTENSITY)
  if (value === null) {
    return { valid: false, error: `Intensity must be between ${LIMITS.MIN_INTENSITY} and ${LIMITS.MAX_INTENSITY}` }
  }

  return { valid: true, value: { value } }
}

/**
 * Validate the overall message structure
 */
export function validateMessageType(input: unknown): string | null {
  if (typeof input !== 'string') return null

  const validTypes = new Set([
    'effect', 'node-state', 'focus', 'intensity',
    'computer', 'clear-effects', 'ping', 'init', 'pong'
  ])

  return validTypes.has(input) ? input : null
}

/**
 * Validate effect payload - minimal validation since it's transient
 */
export function validateEffectPayload(input: unknown): ValidationResult<Record<string, unknown>> {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid effect payload' }
  }

  const payload = input as Record<string, unknown>

  // Validate nodeId if present
  if (payload.nodeId !== undefined) {
    const nodeId = sanitizeId(payload.nodeId)
    if (!nodeId) {
      return { valid: false, error: 'Invalid effect nodeId' }
    }
    payload.nodeId = nodeId
  }

  // Validate effect type if present
  if (payload.effectType !== undefined) {
    const effectType = sanitizeString(payload.effectType, 50)
    if (!effectType) {
      return { valid: false, error: 'Invalid effect type' }
    }
    payload.effectType = effectType
  }

  return { valid: true, value: payload }
}
