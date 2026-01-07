# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloudflare Worker providing real-time WebSocket synchronization for "Damoritosh's Arena" - a Pathfinder 2e hacking encounter system. GMs and players connect to synchronized sessions where computer hacking state is shared in real-time.

## Commands

```bash
npm run dev      # Local development server (wrangler dev)
npm run deploy   # Deploy to Cloudflare Workers production
npm run tail     # Stream logs from deployed worker
npm run test     # Run tests in watch mode (vitest)
npm run test:run # Run tests once
```

TypeScript compilation is handled automatically by Wrangler during dev/deploy.

## Architecture

**Source files:**
- `src/index.ts` - Worker entry point: HTTP routing, CORS, WebSocket upgrades to Durable Objects
- `src/HackingSession.ts` - Durable Object: manages WebSocket connections, state persistence, and message broadcasting
- `src/validation.ts` - Input sanitization and payload validation (XSS prevention, bounds checking)

**Request Flow:**
1. Client connects to `/ws/:sessionId?role=gm` or `/ws/:sessionId?role=player` with WebSocket upgrade
2. Worker routes request to `HackingSession` Durable Object by session ID
3. Durable Object manages connection, validates messages, broadcasts state changes, persists to storage

**Key Patterns:**
- Role-based access control: only GMs can modify state, players receive broadcasts
- All incoming payloads are validated and sanitized before processing/storage
- State persistence via Durable Object storage with 15-minute inactivity cleanup
- Message broadcasting excludes sender to prevent echoes
- Alarm scheduling for deferred cleanup operations

## WebSocket Message Types

`init`, `computer`, `node-state`, `focus`, `intensity`, `effect`, `clear-effects`, `ping/pong`

Only `effect` and `clear-effects` messages are transient (not persisted).

## Key Types

```typescript
type ComputerType = 'tech' | 'magic' | 'hybrid'
type AccessPointType = 'physical' | 'remote' | 'magical'
type NodeState = 'locked' | 'active' | 'breached' | 'alarmed'
```

## Debugging

- `/health` or `/api/health` - Health check endpoint
- `/ws/:sessionId/state` - GET current session state (connections, computer, focus)
- Console logs prefixed with `[HackingSession]` for tracing
