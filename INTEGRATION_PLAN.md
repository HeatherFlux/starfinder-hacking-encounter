# Hacking Encounter Integration Plan

## Overview
Integrate the hacking encounter visualization into the main Starfinder Encounter Builder app as a third top-level tab.

```
ENCOUNTERS | COMBAT | HACKING
```

---

## File Migration

### 1. Components to Move
Copy to `/starfinder/src/components/hacking/`:

```
From: /starfinder-hacking-encounter/src/components/
To:   /starfinder/src/components/hacking/

├── visualization/
│   ├── NodeNetworkCanvas.vue    → HackingCanvas.vue
│   └── EffectOverlay.vue        → HackingEffectOverlay.vue
├── gm/
│   ├── ControlPanel.vue         → HackingControls.vue
│   ├── NodeList.vue             → AccessPointList.vue
│   └── ComputerEditor.vue       → ComputerEditor.vue
└── layout/
    ├── GMLayout.vue             → HackingPanel.vue (main container)
    └── PlayerLayout.vue         → HackingPlayerView.vue (for popup)
```

### 2. Types to Move
Copy to `/starfinder/src/types/`:

```
computer.ts  → hacking.ts (rename types to avoid conflicts)
effects.ts   → hackingEffects.ts
```

### 3. Store to Move
Copy to `/starfinder/src/stores/`:

```
visualizationStore.ts → hackingStore.ts
```

### 4. Utils to Move
Merge into existing or add:

```
generator.ts → /starfinder/src/utils/hackingGenerator.ts
colors.ts    → Already exists, merge if needed
```

---

## Code Changes

### 1. App.vue - Add HACKING Tab

```vue
<!-- In nav section, add third tab -->
<nav class="flex gap-1">
  <button class="nav-tab" :class="{ 'nav-tab-active': activeTab === 'builder' }" @click="activeTab = 'builder'">
    <span class="text-accent mr-1">&gt;</span> ENCOUNTERS
  </button>
  <button class="nav-tab" :class="{ 'nav-tab-active': activeTab === 'combat' }" @click="activeTab = 'combat'">
    <span class="text-accent mr-1">&gt;</span> COMBAT
  </button>
  <button class="nav-tab" :class="{ 'nav-tab-active': activeTab === 'hacking' }" @click="activeTab = 'hacking'">
    <span class="text-accent mr-1">&gt;</span> HACKING
  </button>
</nav>

<!-- In main section, add hacking template -->
<template v-else-if="activeTab === 'hacking'">
  <HackingPanel />
</template>
```

### 2. Update Type Definition

```typescript
type Tab = 'builder' | 'combat' | 'hacking'
```

### 3. HackingPanel.vue - Use Settings Store for Themes

```vue
<script setup lang="ts">
import { useSettingsStore } from '../stores/settingsStore'
import { useHackingStore } from '../stores/hackingStore'

const { settings } = useSettingsStore()
const hackingStore = useHackingStore()

// Theme colors automatically applied via CSS variables
// No need to duplicate - just use var(--color-accent), etc.
</script>
```

### 4. NodeNetworkCanvas - Use Theme Colors

Replace hardcoded colors with CSS variable references:

```typescript
// Before
const colors = {
  locked: { r: 30, g: 203, b: 225 },   // Cyan
  breached: { r: 106, g: 225, b: 30 }, // Green
  alarmed: { r: 225, g: 52, b: 30 }    // Red
}

// After - read from CSS variables
function getThemeColor(varName: string): { r: number; g: number; b: number } {
  const style = getComputedStyle(document.documentElement)
  const hex = style.getPropertyValue(varName).trim()
  return hexToRgb(hex)
}

const colors = {
  locked: getThemeColor('--color-accent'),
  active: getThemeColor('--color-accent-bright'),
  breached: getThemeColor('--color-success'),
  alarmed: getThemeColor('--color-danger')
}
```

---

## Player View Options

### Option A: Popup Window (Current)
Keep the "Open Player View" button that opens a new window.
- Pro: Works on separate screen/projector
- Con: Separate URL, needs BroadcastChannel or URL sharing

### Option B: Modal Overlay
Add a "Present" button that shows fullscreen overlay in same tab.
- Pro: Simpler, no cross-tab sync needed
- Con: GM can't see controls while presenting

### Option C: Both
Keep popup for projector use, add modal for quick preview.

**Recommendation: Option C** - Most flexible

---

## URL Sharing Enhancement

Update share URL to use main app route:

```typescript
// Before
const baseUrl = window.location.origin + window.location.pathname
return `${baseUrl}#/player?state=${encoded}`

// After
const baseUrl = window.location.origin + window.location.pathname
return `${baseUrl}#/hacking/view?state=${encoded}`
```

Add route in main app:
```typescript
// If using vue-router (currently hash-based manual routing)
// Add handling for #/hacking/view?state=xxx in App.vue
```

---

## Migration Steps

### Step 1: Create Directory Structure
```bash
mkdir -p /starfinder/src/components/hacking
mkdir -p /starfinder/src/components/hacking/visualization
```

### Step 2: Copy & Rename Files
```bash
# Components
cp visualization/NodeNetworkCanvas.vue → hacking/HackingCanvas.vue
cp visualization/EffectOverlay.vue → hacking/HackingEffectOverlay.vue
cp gm/ControlPanel.vue → hacking/HackingControls.vue
cp gm/NodeList.vue → hacking/AccessPointList.vue
cp gm/ComputerEditor.vue → hacking/ComputerEditor.vue
cp layout/GMLayout.vue → hacking/HackingPanel.vue

# Types
cp types/computer.ts → types/hacking.ts
cp types/effects.ts → types/hackingEffects.ts

# Store
cp stores/visualizationStore.ts → stores/hackingStore.ts

# Utils
cp utils/generator.ts → utils/hackingGenerator.ts
```

### Step 3: Update Imports
In each copied file, update import paths:
- `../../stores/` → `../stores/`
- `../../types/` → `../types/`
- `../../utils/` → `../utils/`

### Step 4: Remove Duplicate CSS
Delete the copied style.css from hacking app - use main app's styles.

### Step 5: Add to App.vue
- Import HackingPanel
- Add tab button
- Add template section

### Step 6: Test Theme Integration
- Switch themes in settings
- Verify hacking canvas colors update
- Check all effects use theme colors

---

## Future Enhancements

### 1. Computer Templates
Pre-built computers for common scenarios:
- Corporate Server (5 nodes, tech)
- Magical Ward (4 nodes, magic)
- Starship Bridge (6 nodes, hybrid)
- Security System (4 nodes, tech, high countermeasures)

### 2. Encounter Integration
Link hacking to encounters:
- Add "Computers" section to EncounterBuilder
- Track which computers are in current encounter
- Quick-load from encounter

### 3. Combat Integration
- Add hacking as combat action
- Track hacking progress per combatant
- Trigger effects from combat tracker

---

## Files Changed Summary

| File | Action |
|------|--------|
| `/starfinder/src/App.vue` | Add HACKING tab + routing |
| `/starfinder/src/components/hacking/*` | New directory with 6 components |
| `/starfinder/src/stores/hackingStore.ts` | New store |
| `/starfinder/src/types/hacking.ts` | New types |
| `/starfinder/src/types/hackingEffects.ts` | New effect types |
| `/starfinder/src/utils/hackingGenerator.ts` | New generator |
