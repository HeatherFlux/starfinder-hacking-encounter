import { reactive, watch } from 'vue'
import type { Computer, NodeState } from '../types/computer'
import type { Effect, EffectType } from '../types/effects'
import { createEffect } from '../types/effects'
import { createSampleComputer } from '../types/computer'
import { generateRandomComputer, type GeneratorOptions } from '../utils/generator'

// Saved encounter interface
interface SavedEncounter {
  id: string
  name: string
  computer: Computer
  savedAt: number
}

// State interface
interface VisualizationState {
  computer: Computer | null
  activeEffects: Effect[]
  focusedNodeId: string | null
  ambientIntensity: number  // 0-1, controls particle density
  isGMView: boolean
  savedEncounters: SavedEncounter[]
}

// Create reactive state
const state = reactive<VisualizationState>({
  computer: null,
  activeEffects: [],
  focusedNodeId: null,
  ambientIntensity: 0.7,
  isGMView: false,
  savedEncounters: []
})

// BroadcastChannel for cross-tab sync
let channel: BroadcastChannel | null = null

function initChannel() {
  if (typeof BroadcastChannel !== 'undefined' && !channel) {
    channel = new BroadcastChannel('hacking-encounter')

    channel.onmessage = (event) => {
      const { type, payload } = event.data

      switch (type) {
        case 'effect':
          // Add effect from GM
          state.activeEffects.push(payload)
          break
        case 'node-state':
          // Update node state
          if (state.computer) {
            const node = state.computer.accessPoints.find(ap => ap.id === payload.nodeId)
            if (node) {
              node.state = payload.state
            }
          }
          break
        case 'focus':
          state.focusedNodeId = payload.nodeId
          break
        case 'intensity':
          state.ambientIntensity = payload.value
          break
        case 'computer':
          state.computer = payload
          break
        case 'clear-effects':
          state.activeEffects = []
          break
      }
    }
  }
}

function broadcast(type: string, payload: unknown) {
  if (channel) {
    channel.postMessage({ type, payload })
  }
}

// Actions
function loadComputer(computer: Computer) {
  state.computer = computer
  broadcast('computer', computer)
  saveToLocalStorage()
}

function loadSampleComputer() {
  loadComputer(createSampleComputer())
}

function setNodeState(nodeId: string, newState: NodeState) {
  if (!state.computer) return

  const node = state.computer.accessPoints.find(ap => ap.id === nodeId)
  if (node) {
    node.state = newState
    broadcast('node-state', { nodeId, state: newState })
    saveToLocalStorage()
  }
}

function triggerEffect(type: EffectType, targetNodeId?: string) {
  const effect = createEffect(type, targetNodeId || state.focusedNodeId || undefined)
  state.activeEffects.push(effect)
  broadcast('effect', effect)

  // Auto-remove effect after duration
  setTimeout(() => {
    const index = state.activeEffects.findIndex(e => e.id === effect.id)
    if (index !== -1) {
      state.activeEffects.splice(index, 1)
    }
  }, effect.duration)
}

function setFocus(nodeId: string | null) {
  state.focusedNodeId = nodeId
  broadcast('focus', { nodeId })
}

function setAmbientIntensity(value: number) {
  state.ambientIntensity = Math.max(0, Math.min(1, value))
  broadcast('intensity', { value: state.ambientIntensity })
}

function clearEffects() {
  state.activeEffects = []
  broadcast('clear-effects', null)
}

function setGMView(isGM: boolean) {
  state.isGMView = isGM
}

// Create a new empty computer
function createNewComputer(name: string = 'New Computer') {
  const newComputer: Computer = {
    id: crypto.randomUUID(),
    name,
    level: 1,
    type: 'tech',
    accessPoints: []
  }
  loadComputer(newComputer)
  return newComputer
}

// Generate a random computer
function generateComputer(options?: GeneratorOptions) {
  const computer = generateRandomComputer(options)
  loadComputer(computer)
  return computer
}

// Encounter management
function saveEncounter(name?: string) {
  if (!state.computer) return null

  const encounter: SavedEncounter = {
    id: crypto.randomUUID(),
    name: name || state.computer.name,
    computer: JSON.parse(JSON.stringify(state.computer)), // Deep clone
    savedAt: Date.now()
  }

  state.savedEncounters.push(encounter)
  saveEncountersToStorage()
  return encounter
}

function loadEncounter(encounterId: string) {
  const encounter = state.savedEncounters.find(e => e.id === encounterId)
  if (encounter) {
    loadComputer(JSON.parse(JSON.stringify(encounter.computer)))
  }
}

function deleteEncounter(encounterId: string) {
  const index = state.savedEncounters.findIndex(e => e.id === encounterId)
  if (index !== -1) {
    state.savedEncounters.splice(index, 1)
    saveEncountersToStorage()
  }
}

// URL sharing - encode current state to shareable URL
function generateShareUrl(): string {
  if (!state.computer) return window.location.href

  const shareData = {
    c: state.computer,
    i: state.ambientIntensity
  }

  const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)))
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}#/player?state=${encoded}`
}

// Load state from URL
function loadFromUrl(): boolean {
  const hash = window.location.hash
  const match = hash.match(/[?&]state=([^&]+)/)

  if (match && match[1]) {
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(match[1])))
      if (decoded.c) {
        state.computer = decoded.c
        if (typeof decoded.i === 'number') {
          state.ambientIntensity = decoded.i
        }
        return true
      }
    } catch (e) {
      console.warn('Failed to load state from URL:', e)
    }
  }
  return false
}

// LocalStorage persistence
const STORAGE_KEY = 'hacking-encounter-state'
const ENCOUNTERS_KEY = 'hacking-encounter-saved'

function saveToLocalStorage() {
  if (state.computer) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      computer: state.computer,
      ambientIntensity: state.ambientIntensity
    }))
  }
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      if (data.computer) {
        state.computer = data.computer
      }
      if (typeof data.ambientIntensity === 'number') {
        state.ambientIntensity = data.ambientIntensity
      }
    } catch (e) {
      console.warn('Failed to load saved state:', e)
    }
  }
}

function saveEncountersToStorage() {
  localStorage.setItem(ENCOUNTERS_KEY, JSON.stringify(state.savedEncounters))
}

function loadEncountersFromStorage() {
  const saved = localStorage.getItem(ENCOUNTERS_KEY)
  if (saved) {
    try {
      state.savedEncounters = JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to load saved encounters:', e)
      state.savedEncounters = []
    }
  }
}

// Initialize
function init() {
  initChannel()
  loadEncountersFromStorage()

  // Try to load from URL first (for shared links)
  const loadedFromUrl = loadFromUrl()

  if (!loadedFromUrl) {
    loadFromLocalStorage()
  }

  // Load sample if no computer exists
  if (!state.computer) {
    loadSampleComputer()
  }
}

// Watch for changes and save
watch(
  () => state.computer,
  () => saveToLocalStorage(),
  { deep: true }
)

// Export store
export function useVisualizationStore() {
  init()

  return {
    state,
    loadComputer,
    loadSampleComputer,
    createNewComputer,
    generateComputer,
    setNodeState,
    triggerEffect,
    setFocus,
    setAmbientIntensity,
    clearEffects,
    setGMView,
    // Encounter management
    saveEncounter,
    loadEncounter,
    deleteEncounter,
    // URL sharing
    generateShareUrl,
    loadFromUrl
  }
}
