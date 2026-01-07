export type ComputerType = 'tech' | 'magic' | 'hybrid'
export type AccessPointType = 'physical' | 'remote' | 'magical'
export type NodeState = 'locked' | 'active' | 'breached' | 'alarmed'

export interface Position {
  x: number  // 0-1 normalized
  y: number  // 0-1 normalized
}

export interface AccessPoint {
  id: string
  name: string
  type: AccessPointType
  state: NodeState
  position: Position
  connectedTo: string[]  // IDs of connected access points
}

export interface Computer {
  id: string
  name: string
  level: number
  type: ComputerType
  description?: string
  accessPoints: AccessPoint[]
}

// Default sample computer for testing
export function createSampleComputer(): Computer {
  return {
    id: crypto.randomUUID(),
    name: 'Zo! Media Server',
    level: 4,
    type: 'tech',
    description: 'Corporate media server with unreleased show information',
    accessPoints: [
      {
        id: 'ap-1',
        name: 'Terminal Alpha',
        type: 'physical',
        state: 'locked',
        position: { x: 0.2, y: 0.3 },
        connectedTo: ['ap-2', 'ap-3']
      },
      {
        id: 'ap-2',
        name: 'Backdoor Port',
        type: 'remote',
        state: 'locked',
        position: { x: 0.5, y: 0.2 },
        connectedTo: ['ap-1', 'ap-4']
      },
      {
        id: 'ap-3',
        name: 'Admin Console',
        type: 'physical',
        state: 'locked',
        position: { x: 0.3, y: 0.7 },
        connectedTo: ['ap-1', 'ap-5']
      },
      {
        id: 'ap-4',
        name: 'Database Node',
        type: 'remote',
        state: 'locked',
        position: { x: 0.7, y: 0.4 },
        connectedTo: ['ap-2', 'ap-5']
      },
      {
        id: 'ap-5',
        name: 'Core Mainframe',
        type: 'magical',
        state: 'locked',
        position: { x: 0.6, y: 0.75 },
        connectedTo: ['ap-3', 'ap-4']
      }
    ]
  }
}
