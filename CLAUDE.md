# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Starfinder Hacking Encounter is a Vue 3 + TypeScript + Vite web application for running Starfinder 2e hacking encounters. It provides a GM interface to control computer system network visualizations and a player view for projection. The app is designed for future integration into a larger Starfinder Encounter Builder application (see INTEGRATION_PLAN.md).

## Commands

```bash
npm run dev      # Start Vite dev server with hot reload
npm run build    # Type-check with vue-tsc, then build for production
npm run preview  # Preview production build locally
```

## Architecture

### Routing
- Hash-based routing via vue-router
- `/#/gm` - GM control interface (default)
- `/#/player` - Player-facing visualization
- `/#/player?state=<encoded>` - Share URL with embedded computer config

### State Management
Single reactive store (`stores/visualizationStore.ts`) manages:
- Computer configuration (nodes, connections, states)
- Active visual effects
- Saved encounters (localStorage persistence)
- Cross-tab sync via BroadcastChannel (GM ↔ Player windows)
- URL-based state sharing (base64-encoded in hash)

### Key Data Types
- **Computer**: id, name, level (1-20), type (tech/magic/hybrid), array of AccessPoints
- **AccessPoint**: id, name, type, state (locked/active/breached/alarmed), normalized position (0-1), connections
- **Effect**: 10 types with auto-removal durations (breach, alarm, vulnerability, etc.)

### Component Structure
```
components/
├── layout/
│   ├── GMLayout.vue       # Main GM control interface
│   └── PlayerLayout.vue   # Player-facing fullscreen view
├── visualization/
│   ├── NodeNetworkCanvas.vue  # 2D Canvas network + particle system
│   └── EffectOverlay.vue      # Effects rendering layer
└── gm/
    ├── ControlPanel.vue   # Effect triggers + keyboard hotkeys
    ├── NodeList.vue       # Access point state manager
    └── ComputerEditor.vue # Visual drag-drop node editor
```

### Visualization System
- Canvas 2D rendering with animation frame loop
- Normalized coordinates (0-1) for canvas-agnostic positioning
- Particle system for data flow (adjustable intensity)
- Color coding by node state

### Hotkeys (GM Control)
- B = Breach, A = Alarm, T = Trace, S = Success
- V = Vulnerability, C = Countermeasure, L = Lockout
- D = Data Extract, N = Scan, P = Pulse

## Theme Colors (Tetradic Palette)
- Cyan (#1ECBE1) - Primary UI, locked nodes
- Purple (#9600E1) - Secondary actions
- Red (#E1341E) - Danger, alarmed states
- Green (#6AE11E) - Success, breached states
- Background (#050608) - Deep space

## Conventions
- Vue 3 `<script setup>` for all components
- Normalized coordinates for canvas layouts
- Effect-driven visualization (state changes trigger effects)
- LocalStorage + BroadcastChannel for persistence and sync
