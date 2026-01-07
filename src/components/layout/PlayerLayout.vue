<script setup lang="ts">
import { onMounted } from 'vue'
import { useVisualizationStore } from '../../stores/visualizationStore'
import NodeNetworkCanvas from '../visualization/NodeNetworkCanvas.vue'
import EffectOverlay from '../visualization/EffectOverlay.vue'

const store = useVisualizationStore()

onMounted(() => {
  store.setGMView(false)
})
</script>

<template>
  <div class="player-layout">
    <!-- Fullscreen canvas -->
    <NodeNetworkCanvas :fullscreen="true" />

    <!-- Computer info overlay (subtle, bottom corner) -->
    <div v-if="store.state.computer" class="computer-info glass">
      <div class="computer-name">{{ store.state.computer.name }}</div>
      <div class="computer-level">Level {{ store.state.computer.level }}</div>
    </div>

    <!-- Effect overlay -->
    <EffectOverlay />
  </div>
</template>

<style scoped>
.player-layout {
  position: fixed;
  inset: 0;
  background: var(--color-bg);
  overflow: hidden;
}

.computer-info {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  z-index: 10;
}

.computer-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-accent);
  text-shadow: 0 0 10px rgba(30, 203, 225, 0.5);
}

.computer-level {
  font-size: var(--text-sm);
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
