<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useVisualizationStore } from '../../stores/visualizationStore'
import { THEME_COLORS } from '../../utils/colors'
import { EFFECT_COLORS } from '../../types/effects'
import type { AccessPoint } from '../../types/computer'

const props = defineProps<{
  fullscreen?: boolean
}>()

const store = useVisualizationStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null

// Particle system for data flow
interface Particle {
  x: number
  y: number
  progress: number
  speed: number
  connectionIndex: number
  alpha: number
}

let particles: Particle[] = []

// Get canvas dimensions
function getCanvasDimensions() {
  if (!canvasRef.value) return { width: 800, height: 600 }
  return {
    width: canvasRef.value.width,
    height: canvasRef.value.height
  }
}

// Convert normalized position to canvas coordinates
function toCanvasCoords(pos: { x: number; y: number }) {
  const { width, height } = getCanvasDimensions()
  const padding = 60
  return {
    x: padding + pos.x * (width - padding * 2),
    y: padding + pos.y * (height - padding * 2)
  }
}

// Get node color based on state
function getNodeColor(state: string): { r: number; g: number; b: number } {
  switch (state) {
    case 'breached':
      return THEME_COLORS.quaternary  // Green
    case 'alarmed':
      return THEME_COLORS.tertiary    // Red
    case 'active':
      return { r: 92, g: 225, b: 255 } // Bright cyan
    default:
      return THEME_COLORS.primary      // Cyan (dim for locked)
  }
}

// Initialize particles along connections
function initParticles() {
  if (!store.state.computer) return

  particles = []
  const connections = getConnections()
  const particleCount = Math.floor(connections.length * 3 * store.state.ambientIntensity)

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: 0,
      y: 0,
      progress: Math.random(),
      speed: 0.002 + Math.random() * 0.003,
      connectionIndex: Math.floor(Math.random() * connections.length),
      alpha: 0.3 + Math.random() * 0.5
    })
  }
}

// Get all connections as pairs
function getConnections(): Array<{ from: AccessPoint; to: AccessPoint }> {
  if (!store.state.computer) return []

  const connections: Array<{ from: AccessPoint; to: AccessPoint }> = []
  const seen = new Set<string>()

  for (const node of store.state.computer.accessPoints) {
    for (const targetId of node.connectedTo) {
      const key = [node.id, targetId].sort().join('-')
      if (!seen.has(key)) {
        seen.add(key)
        const target = store.state.computer.accessPoints.find(ap => ap.id === targetId)
        if (target) {
          connections.push({ from: node, to: target })
        }
      }
    }
  }

  return connections
}

// Draw cyber grid background
function drawCyberGrid(time: number) {
  if (!ctx) return
  const { width, height } = getCanvasDimensions()
  const rgb = THEME_COLORS.primary

  const gridSize = 40
  const offset = (time * 0.01) % gridSize

  // Draw vertical lines
  for (let x = -gridSize + offset; x < width + gridSize; x += gridSize) {
    const pulse = Math.sin(time * 0.001 + x * 0.01) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.03 + pulse * 0.05})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = -gridSize + offset; y < height + gridSize; y += gridSize) {
    const pulse = Math.sin(time * 0.001 + y * 0.01) * 0.5 + 0.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.03 + pulse * 0.05})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Draw intersection dots
  for (let x = -gridSize + offset; x < width + gridSize; x += gridSize) {
    for (let y = -gridSize + offset; y < height + gridSize; y += gridSize) {
      const pulse = Math.sin(time * 0.002 + x * 0.02 + y * 0.02) * 0.5 + 0.5
      if (pulse > 0.6) {
        ctx.beginPath()
        ctx.arc(x, y, 1 + pulse, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pulse * 0.3})`
        ctx.fill()
      }
    }
  }
}

// Draw connections between nodes
function drawConnections(time: number) {
  if (!ctx || !store.state.computer) return

  const connections = getConnections()

  for (const conn of connections) {
    const from = toCanvasCoords(conn.from.position)
    const to = toCanvasCoords(conn.to.position)

    // Determine connection color based on node states
    const fromColor = getNodeColor(conn.from.state)
    const toColor = getNodeColor(conn.to.state)

    // Mix colors
    const color = {
      r: (fromColor.r + toColor.r) / 2,
      g: (fromColor.g + toColor.g) / 2,
      b: (fromColor.b + toColor.b) / 2
    }

    // Draw main connection line
    const pulse = Math.sin(time * 0.002) * 0.3 + 0.7
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.2 * pulse})`
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw glow
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.05 * pulse})`
    ctx.lineWidth = 6
    ctx.stroke()
  }
}

// Draw flowing particles
function drawParticles(_time: number) {
  if (!ctx || !store.state.computer) return

  const connections = getConnections()

  for (const particle of particles) {
    if (particle.connectionIndex >= connections.length) continue

    const conn = connections[particle.connectionIndex]
    if (!conn) continue
    const from = toCanvasCoords(conn.from.position)
    const to = toCanvasCoords(conn.to.position)

    // Update progress
    particle.progress += particle.speed
    if (particle.progress > 1) {
      particle.progress = 0
      particle.connectionIndex = Math.floor(Math.random() * connections.length)
    }

    // Calculate position
    particle.x = from.x + (to.x - from.x) * particle.progress
    particle.y = from.y + (to.y - from.y) * particle.progress

    // Color based on connection (conn already checked above)
    const color = getNodeColor(conn!.from.state)

    // Draw particle
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.alpha})`
    ctx.fill()
  }
}

// Draw access point nodes
function drawNodes(time: number) {
  if (!ctx || !store.state.computer) return

  for (const node of store.state.computer.accessPoints) {
    const pos = toCanvasCoords(node.position)
    const color = getNodeColor(node.state)
    const isFocused = store.state.focusedNodeId === node.id

    // Pulse animation
    let pulse = Math.sin(time * 0.003 + node.position.x * 10) * 0.5 + 0.5
    if (node.state === 'alarmed') {
      pulse = Math.sin(time * 0.02) * 0.5 + 0.5
    }

    const baseRadius = props.fullscreen ? 25 : 18
    const radius = baseRadius + pulse * 5

    // Draw outer glow
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2)
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${isFocused ? 0.4 : 0.2})`)
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${isFocused ? 0.15 : 0.05})`)
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // Draw main node
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.3 + pulse * 0.3})`
    ctx.fill()
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.8 + pulse * 0.2})`
    ctx.lineWidth = isFocused ? 3 : 2
    ctx.stroke()

    // Draw center dot
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`
    ctx.fill()

    // Draw node name (if fullscreen)
    if (props.fullscreen) {
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`
      ctx.textAlign = 'center'
      ctx.fillText(node.name, pos.x, pos.y + radius + 20)
    }
  }
}

// Draw active effects
function drawEffects(time: number) {
  if (!ctx || !store.state.computer) return

  for (const effect of store.state.activeEffects) {
    const progress = (Date.now() - effect.startTime) / effect.duration
    if (progress < 0 || progress > 1) continue

    const color = EFFECT_COLORS[effect.type]

    // Find target node if specified
    let pos = { x: canvasRef.value!.width / 2, y: canvasRef.value!.height / 2 }
    if (effect.targetNodeId) {
      const node = store.state.computer.accessPoints.find(ap => ap.id === effect.targetNodeId)
      if (node) {
        pos = toCanvasCoords(node.position)
      }
    }

    switch (effect.type) {
      case 'breach':
      case 'success':
        // Expanding ring
        const ringRadius = progress * 150
        const ringAlpha = 1 - progress

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`
        ctx.lineWidth = 4 * (1 - progress)
        ctx.stroke()

        // Particle burst
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2
          const distance = progress * 120
          const px = pos.x + Math.cos(angle) * distance
          const py = pos.y + Math.sin(angle) * distance

          ctx.beginPath()
          ctx.arc(px, py, 4 * (1 - progress), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${ringAlpha})`
          ctx.fill()
        }
        break

      case 'alarm':
      case 'countermeasure':
      case 'lockout':
        // Pulsing red glow on all nodes
        const pulseIntensity = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5

        for (const node of store.state.computer!.accessPoints) {
          const nodePos = toCanvasCoords(node.position)

          ctx.beginPath()
          ctx.arc(nodePos.x, nodePos.y, 40 + pulseIntensity * 20, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${pulseIntensity * 0.3 * (1 - progress)})`
          ctx.fill()
        }
        break

      case 'vulnerability':
        // Purple pulse
        const vulnRing = progress * 80
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, vulnRing, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${1 - progress})`
        ctx.lineWidth = 3
        ctx.stroke()

        // DC reduction text
        if (progress < 0.7) {
          ctx.font = 'bold 16px "JetBrains Mono", monospace'
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${1 - progress})`
          ctx.textAlign = 'center'
          ctx.fillText('DC -2', pos.x, pos.y - 50 - progress * 30)
        }
        break

      case 'scan':
        // Sweeping line
        const sweepAngle = progress * Math.PI * 2
        const sweepLength = 150

        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(
          pos.x + Math.cos(sweepAngle) * sweepLength,
          pos.y + Math.sin(sweepAngle) * sweepLength
        )
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.8})`
        ctx.lineWidth = 2
        ctx.stroke()
        break

      case 'trace':
        // Red line extending from origin
        const { height } = getCanvasDimensions()

        ctx.beginPath()
        ctx.moveTo(0, height)
        ctx.lineTo(
          pos.x * progress,
          height - (height - pos.y) * progress
        )
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
        ctx.lineWidth = 3
        ctx.setLineDash([10, 5])
        ctx.stroke()
        ctx.setLineDash([])

        // Blinking dot at end
        if (Math.sin(time * 0.01) > 0) {
          ctx.beginPath()
          ctx.arc(pos.x * progress, height - (height - pos.y) * progress, 5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`
          ctx.fill()
        }
        break
    }
  }
}

// Main animation loop
function animate(time: number) {
  if (!ctx || !canvasRef.value) return

  const { width, height } = getCanvasDimensions()

  // Clear canvas
  ctx.fillStyle = 'rgba(5, 6, 8, 1)'
  ctx.fillRect(0, 0, width, height)

  // Draw layers
  drawCyberGrid(time)
  drawConnections(time)
  drawParticles(time)
  drawNodes(time)
  drawEffects(time)

  animationId = requestAnimationFrame(animate)
}

// Resize canvas
function resizeCanvas() {
  if (!canvasRef.value) return

  if (props.fullscreen) {
    canvasRef.value.width = window.innerWidth
    canvasRef.value.height = window.innerHeight
  } else {
    const container = canvasRef.value.parentElement
    if (container) {
      canvasRef.value.width = container.clientWidth
      canvasRef.value.height = container.clientHeight
    }
  }

  initParticles()
}

// Handle canvas click (for GM view - select nodes)
function handleClick(event: MouseEvent) {
  if (!store.state.isGMView || !store.state.computer || !canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Find clicked node
  for (const node of store.state.computer.accessPoints) {
    const pos = toCanvasCoords(node.position)
    const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)

    if (distance < 30) {
      store.setFocus(node.id)
      return
    }
  }

  // Clicked empty space - clear focus
  store.setFocus(null)
}

// Lifecycle
onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    resizeCanvas()
    animationId = requestAnimationFrame(animate)
    window.addEventListener('resize', resizeCanvas)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', resizeCanvas)
})

// Watch for computer changes
watch(
  () => store.state.computer,
  () => initParticles(),
  { deep: true }
)

// Watch for intensity changes
watch(
  () => store.state.ambientIntensity,
  () => initParticles()
)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="node-network-canvas"
    :class="{ fullscreen }"
    @click="handleClick"
  ></canvas>
</template>

<style scoped>
.node-network-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.node-network-canvas.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}
</style>
